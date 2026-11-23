import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cohortKey, normalizeLease, counterTarget } from '../core.mjs';

const moneyFields = ['payment', 'das', 'shipping', 'brokerFee', 'extraFees', 'refundableDeposit', 'onePay'];
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const cents = amount => Math.round(amount * 100);
const clean = value => typeof value === 'string' ? value.trim().toLowerCase() : '';

function today() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function checkWorksheet(d, asOf) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('Use one worksheet JSON object per file.');
  if (d.evidence !== 'written-worksheet' || d.availableConfirmed !== true) {
    throw new Error('Get a written worksheet and confirm availability. Set evidence to written-worksheet and availableConfirmed to true.');
  }
  if (d.taxIncluded !== true || d.incentivesConfirmed !== true) {
    throw new Error('Confirm taxes for your registration location and eligibility for each incentive before comparing.');
  }
  if (!Number.isInteger(d.year) || d.year < 1900 || !clean(d.model) || !clean(d.trim) || !/^[a-z]{2}$/i.test(d.state ?? '')) {
    throw new Error('Enter the model year (year), model, trim, and two-letter registration state.');
  }
  if (!Number.isInteger(d.months) || !Number.isInteger(d.annualMiles) || typeof d.isDemo !== 'boolean') {
    throw new Error('Enter the term and annual miles as whole numbers and confirm isDemo (true or false).');
  }
  if (!isDate(d.quoteMonth + '-01')) throw new Error('Enter the program month as YYYY-MM.');
  if (!d.synthetic && d.quoteMonth > asOf.slice(0, 7)) throw new Error('Program month is in the future. Request a currently actionable worksheet.');
  if (d.validThrough != null) {
    if (!isDate(d.validThrough)) throw new Error('Use YYYY-MM-DD for validThrough.');
    if (d.validThrough < d.quoteMonth + '-01') throw new Error('Expiry precedes the program month. Confirm the program dates.');
    if (!d.synthetic && d.validThrough < asOf) throw new Error('Worksheet expired. Request a refreshed quote.');
  }
  if (!d.synthetic && d.quoteMonth !== asOf.slice(0, 7) && !d.validThrough) {
    throw new Error('Confirm the program is still valid and add its written validThrough date, or request a current worksheet.');
  }
  if (d.synthetic != null && typeof d.synthetic !== 'boolean') throw new Error('Set synthetic to true or false.');
  if (d.equipment != null && (!Array.isArray(d.equipment) || d.equipment.some(item => !clean(item)))) {
    throw new Error('List confirmed required options as an equipment array of names.');
  }
  if (d.isDemo && (!Number.isInteger(d.vehicleMiles) || d.vehicleMiles < 0)) {
    throw new Error('Confirm and enter the loaner’s current vehicleMiles.');
  }
  if (d.tradeEquity !== 0 || (d.negativeEquity ?? 0) !== 0 || (d.netTradeEquity ?? 0) !== 0) {
    throw new Error('Request a worksheet without a trade and enter tradeEquity as 0.');
  }
  for (const field of moneyFields) {
    const value = d[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || Math.abs(value - cents(value) / 100) > 1e-8) {
      throw new Error('Enter ' + field + ' as dollars and cents. Use 0 only if confirmed.');
    }
  }
  if (typeof d.firstPaymentInDAS !== 'boolean') throw new Error('Specify whether the first payment is in DAS (firstPaymentInDAS).');
  if (d.onePay === 0 && d.payment === 0) throw new Error('Enter a positive monthly payment or an all-inclusive onePay.');
  return normalizeLease(d);
}

const options = list => [...new Set(list.map(clean))].sort();

function matchWorksheets(a, b) {
  if (Boolean(a.synthetic) !== Boolean(b.synthetic)) throw new Error('Compare two real worksheets or two practice examples.');
  if (cohortKey(a) !== cohortKey(b)) {
    const different = ['model','trim','state','months','annualMiles'].filter(k => String(a[k]).trim().toLowerCase() !== String(b[k]).trim().toLowerCase());
    throw new Error('Request matching terms for ' + different.join(', ') + '.');
  }
  for (const key of ['year', 'quoteMonth', 'isDemo']) {
    if (a[key] !== b[key]) throw new Error('Get matching worksheets for ' + key + '.');
  }
  if (a.isDemo && a.vehicleMiles !== b.vehicleMiles) throw new Error('Loaner odometers differ. Request comparable mileage and warranty terms.');
  if (clean(a.drivetrain) && clean(b.drivetrain) && clean(a.drivetrain) !== clean(b.drivetrain)) throw new Error('Drivetrains differ. Request a matching configuration.');
  if (a.equipment && b.equipment && JSON.stringify(options(a.equipment)) !== JSON.stringify(options(b.equipment))) {
    throw new Error('Required equipment differs. Confirm the same options on both cars.');
  }
}

/** First file is the reference deal. All sums follow core.mjs DAS conventions. */
export function compareWorksheets(reference, candidate, asOf = today()) {
  const totals = [reference, candidate].map((worksheet, i) => {
    try { return checkWorksheet(worksheet, asOf); }
    catch (error) { throw new Error((i === 0 ? 'Reference' : 'Candidate') + ': ' + error.message); }
  });
  matchWorksheets(reference, candidate);
  const [a, b] = totals;
  const counter = counterTarget(reference, candidate);
  const gap = counter.gapCents;
  const lines = [];
  if (reference.synthetic) lines.push('Fictional practice worksheets.');
  for (const [label, data] of [['Reference', a], ['Candidate', b]]) {
    lines.push(label + ': ' + usd.format(data.totalContractCash) + ' total | ' + usd.format(data.effectiveMonthly) + ' effective/month | ' + usd.format(data.cashNeededAtSigning) + ' upfront including outside fees and refundable cash.');
  }
  if (!reference.validThrough || !candidate.validThrough) lines.push('Expiry unconfirmed. Recheck validity before acting.');
  if (!reference.equipment || !candidate.equipment || !clean(reference.drivetrain) || !clean(candidate.drivetrain)) {
    lines.push('Equipment or drivetrain unconfirmed. Treat this as a cost comparison until the specifications match.');
  }
  if (reference.isDemo) lines.push('For both loaners, confirm remaining warranty and contracted return odometer.');
  if (gap <= 0) {
    lines.push(gap === 0 ? 'Costs match.' : 'Candidate is already ' + usd.format(-gap / 100) + ' below the reference over the term.');
  } else {
    lines.push('Candidate needs ' + usd.format(gap / 100) + ' less over the term to match the reference.');
    if (candidate.onePay || reference.onePay) {
      lines.push('Request a revised all-in total. A one-pay worksheet has a different cash schedule.');
    } else {
      if (counter.paymentCents === null) {
        lines.push('Fixed costs leave no positive matching payment. Request lower nonrecurring costs or a new worksheet.');
      } else {
        lines.push('Monthly ceiling: ' + usd.format(counter.paymentCents / 100) + ' including tax. Revised nonrefundable DAS: ' + usd.format(counter.dasCents / 100) + '.');
        lines.push('Keep all other charges, including shipping, unchanged. Request a revised worksheet.');
      }
    }
  }
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4) throw new Error('Usage: node scripts/compare.mjs REFERENCE.json CANDIDATE.json');
    const sheets = process.argv.slice(2).map(path => {
      try { return JSON.parse(readFileSync(path, 'utf8')); }
      catch (error) { throw new Error('Could not read ' + basename(path) + ': ' + error.message); }
    });
    console.log(compareWorksheets(...sheets));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
