import { normalizeLease, normalizePurchase, exportAnonymousDeal, counterTarget } from './core.mjs';
import { SAMPLE_DEALS } from './sample-quotes.mjs';

const $ = id => document.getElementById(id);
const num = id => Number($(id).value || 0);
const usd = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const write = (id, text) => { $(id).textContent = text; };
const quoteKey = 'dealboard_local_quotes_v1';
const briefKey = 'dealboard_shopping_brief_v1';
const briefFields = ['model', 'trim', 'state', 'location', 'budget', 'upfront', 'months', 'miles', 'equipment'];
const states = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AS GU MP PR VI'.split(' ');

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function store(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

function make(tag, text, className) {
  const elem = document.createElement(tag);
  elem.textContent = text;
  if (className) elem.className = className;
  return elem;
}

function isStoredQuote(quote) {
  try {
    return quote && typeof quote.model === 'string' && typeof quote.trim === 'string'
      && typeof quote.state === 'string' && typeof quote.id === 'string' && quote.id.startsWith('local-')
      && Boolean(normalizeLease(quote));
  } catch { return false; }
}

const storedQuotes = readStorage(quoteKey, []);
let localDeals = Array.isArray(storedQuotes) ? storedQuotes.filter(isStoredQuote) : [];
let brief = readStorage(briefKey, null);
if (!brief || typeof brief !== 'object') brief = null;
let editingId = null;

for (const id of ['b-state', 'l-state']) {
  $(id).add(new Option('Select a state', ''));
  for (const state of states) $(id).add(new Option(state, state));
}
// “Other” was an allowed state on older saved quotes.
$('l-state').add(new Option('Other (legacy quote)', 'Other'));

function showTab(id) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.setAttribute('aria-selected', String(tab.dataset.tab === id));
  });
  document.querySelectorAll('.panel').forEach(panel => panel.classList.toggle('active', panel.id === id));
  document.querySelector('.nav').scrollIntoView({ block: 'start' });
}

document.querySelectorAll('.tab, [data-open]').forEach(button =>
  button.addEventListener('click', () => showTab(button.dataset.tab || button.dataset.open))
);

async function copy(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied';
  } catch {
    button.textContent = 'Select the text to copy';
  }
  const original = button.dataset.original;
  setTimeout(() => { button.textContent = original; }, 2200);
}

function copyOnClick(button, getText) {
  button.dataset.original = button.textContent;
  button.addEventListener('click', () => {
    const value = getText();
    if (value) copy(value, button);
  });
}

function createRequest() {
  const equipment = brief.equipment ? ' My must-haves are ' + brief.equipment + '.' : '';
  $('worksheet-request').value = `Hi,

I’m shopping for a ${brief.model} ${brief.trim} to register in ${brief.location}, ${brief.state}.${equipment} Can you confirm that this exact car is available and send its window sticker and current mileage?

Please quote ${brief.months} months and ${Number(brief.miles).toLocaleString('en-US')} miles a year with $0 down toward the price of the car. Please itemize the first payment and required fees, and quote the exact amount I would need to bring to signing.

Could you send the worksheet with MSRP, selling price before rebates, each incentive and its eligibility, money factor, residual, taxes, fees, monthly payment and an itemized total due at signing? Please include any add-ons, separately billed fees and the offer expiration.

Thanks!`;
  $('request-intro').hidden = true;
  $('request-output').hidden = false;
}

if (brief) {
  for (const name of briefFields) $('b-' + name).value = brief[name] ?? '';
  if ($('brief-form').checkValidity()) createRequest();
  else brief = null;
}

$('brief-form').addEventListener('submit', event => {
  event.preventDefault();
  brief = Object.fromEntries(briefFields.map(name => [name, $('b-' + name).value.trim()]));
  write('brief-status', store(briefKey, brief) ? 'Brief saved in this browser.' : 'Browser storage is unavailable. This brief lasts for this visit.');
  createRequest();
  $('worksheet-request').focus();
  renderBoard();
});
copyOnClick($('copy-request'), () => $('worksheet-request').value);

function today() {
  const local = new Date();
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function resetQuote() {
  $('lease-form').reset();
  editingId = null;
  $('l-quoted').value = today().slice(0, 7);
  $('l-quoted').max = today().slice(0, 7);
  write('save-local', 'Save quote to my board');
  if (brief) {
    for (const name of ['model', 'trim', 'state', 'months', 'miles']) $('l-' + name).value = brief[name];
  }
  updateLease();
}
$('start-quote').addEventListener('click', () => {
  resetQuote();
  showTab('lease');
  $('l-label').focus();
});
$('reset-lease').addEventListener('click', resetQuote);

function readLease() {
  return {
    label: $('l-label').value.trim(), model: $('l-model').value.trim(), trim: $('l-trim').value.trim(),
    state: $('l-state').value, quoteMonth: $('l-quoted').value, validThrough: $('l-expiry').value,
    months: num('l-months'), annualMiles: num('l-miles'), payment: num('l-payment'),
    das: num('l-das'), firstPaymentInDAS: $('l-first').checked, onePay: num('l-onepay'),
    refundableDeposit: num('l-refund'), brokerFee: num('l-broker'), shipping: num('l-ship'),
    extraFees: num('l-extras'), msrp: num('l-msrp'), sellingPrice: num('l-selling'),
    taxIncluded: $('l-tax').value === 'true', incentivesConfirmed: $('l-incentives').checked,
    fitConfirmed: $('l-fit').checked, evidence: $('l-evidence').value,
  };
}

const leaseResults = ['lease-effective', 'lease-total', 'lease-upfront', 'lease-discount', 'lease-ratio'];
function updateLease() {
  const deal = readLease();
  $('lease-error').style.display = 'none';
  try {
    if (!deal.onePay && !deal.payment) {
      leaseResults.forEach(id => write(id, '—'));
      write('lease-flag', 'Enter a monthly payment or a one-pay amount from your worksheet.');
      return null;
    }
    const r = normalizeLease(deal);
    write('lease-effective', usd(r.effectiveMonthly) + ' /mo');
    write('lease-total', usd(r.totalContractCash));
    write('lease-upfront', usd(r.cashNeededAtSigning));
    write('lease-discount', r.discountPct === null ? '—' : r.discountPct + '%');
    write('lease-ratio', r.ratioPct === null ? '—' : r.ratioPct + '%');
    const missing = missingChecks(deal);
    write('lease-flag', missing.length ? 'Before comparing, confirm ' + missing.join(', ') + '.' : 'Ready to compare with matching worksheets.');
    return r;
  } catch (error) {
    leaseResults.forEach(id => write(id, '—'));
    write('lease-flag', 'Review the worksheet inputs.');
    write('lease-error', error.message);
    $('lease-error').style.display = 'block';
    return null;
  }
}

function validLease() {
  if (!$('lease-form').reportValidity()) return false;
  if (!num('l-payment') && !num('l-onepay')) {
    write('lease-error', 'Enter a monthly payment or a one-pay amount.');
    $('lease-error').style.display = 'block';
    $('l-payment').focus();
    return false;
  }
  return Boolean(updateLease());
}
$('lease-form').addEventListener('submit', event => { event.preventDefault(); validLease(); });
$('lease-form').addEventListener('input', updateLease);
$('lease-form').addEventListener('change', updateLease);

function loadQuote(deal) {
  resetQuote();
  const fields = {
    label: 'label', model: 'model', trim: 'trim', state: 'state', months: 'months',
    miles: 'annualMiles', payment: 'payment', das: 'das', onepay: 'onePay', refund: 'refundableDeposit',
    broker: 'brokerFee', ship: 'shipping', extras: 'extraFees', msrp: 'msrp', selling: 'sellingPrice', quoted: 'quoteMonth', expiry: 'validThrough',
  };
  for (const [field, key] of Object.entries(fields)) $('l-' + field).value = deal[key] ?? '';
  const evidenceTypes = ['written-worksheet', 'signed'];
  $('l-evidence').value = evidenceTypes.includes(deal.evidence) ? deal.evidence : 'community-reported';
  $('l-tax').value = String(deal.taxIncluded === true);
  $('l-first').checked = deal.firstPaymentInDAS === true;
  $('l-incentives').checked = deal.incentivesConfirmed === true;
  $('l-fit').checked = deal.fitConfirmed === true;
  editingId = deal.id;
  write('save-local', 'Save changes');
  updateLease();
  showTab('lease');
}

function groupKey(d) {
  return JSON.stringify([d.model.trim().toLowerCase(), d.trim.trim().toLowerCase(),
    d.state.trim().toUpperCase(), Number(d.months), Number(d.annualMiles)]);
}

function groupLabel(d) {
  return `${d.model} · ${d.trim} · ${d.state} · ${d.months} mo · ${Number(d.annualMiles).toLocaleString('en-US')} mi/yr`;
}

function missingChecks(deal) {
  const missing = [];
  if (deal.evidence === 'signed') missing.push('a currently available dealer worksheet for this historical deal');
  else if (deal.evidence !== 'written-worksheet') missing.push('written worksheet');
  if (deal.validThrough && deal.validThrough < today()) missing.push('renewal of the expired offer');
  else if (!deal.validThrough && deal.quoteMonth !== today().slice(0, 7)) missing.push('current offer validity');
  if (!deal.taxIncluded) missing.push('taxes');
  if (!deal.incentivesConfirmed) missing.push('incentive eligibility');
  if (!deal.fitConfirmed) missing.push('vehicle fit and written terms');
  return missing;
}

function fillBoard(preferredKey) {
  const rows = $('board-source').value === 'sample' ? SAMPLE_DEALS : localDeals;
  const selected = preferredKey || $('board-group').value;
  const groups = new Map(rows.map(d => [groupKey(d), groupLabel(d)]));
  const select = $('board-group');
  select.replaceChildren();
  for (const [key, label] of groups) select.add(new Option(label, key));
  if (!groups.size) select.add(new Option('Add a quote to begin', ''));
  select.disabled = !groups.size;
  if (groups.has(selected)) select.value = selected;
  renderBoard();
}

function removeQuote(id) {
  const next = localDeals.filter(deal => deal.id !== id);
  if (!store(quoteKey, next)) {
    write('cohort-summary', 'Browser storage is unavailable. Your stored quotes could not be changed.');
    return;
  }
  localDeals = next;
  if (editingId === id) resetQuote();
  fillBoard();
}

function showQuote(deal, sample, comparable, reference = null) {
  const calc = normalizeLease(deal);
  const card = make('article', '', 'surface quote-row');
  const detail = make('div', '');
  detail.append(make('h3', sample ? deal.model + (deal.isDemo ? ' · loaner' : ' · new') : (deal.label || deal.model)));
  const terms = deal.onePay ? 'One-pay ' + usd(deal.onePay) : `${usd(deal.payment)}/mo · ${usd(Number(deal.das || 0))} nonrefundable at signing`;
  detail.append(make('p', terms));
  const fees = Number(deal.shipping || 0) + Number(deal.brokerFee || 0) + Number(deal.extraFees || 0);
  detail.append(make('p', `${usd(fees)} separate fees · ${usd(Number(deal.refundableDeposit || 0))} refundable deposit`, 'muted'));
  const evidenceLabel = ({'written-worksheet': 'Written worksheet', signed: 'Signed agreement'})[deal.evidence] || 'Reported';
  if (!sample) detail.append(make('p', evidenceLabel + ' · ' + (deal.quoteMonth || 'undated') + (deal.validThrough ? ' · through ' + deal.validThrough : ''), 'muted'));
  if (!sample && !comparable) detail.append(make('p', 'Confirm ' + missingChecks(deal).join(', ') + '.', 'inline-message'));
  if (reference && reference.id !== deal.id) {
    const counter = counterTarget(reference, deal);
    const refLabel = reference.label || reference.model;
    if (counter.gapCents === 0) {
      detail.append(make('p', 'Same contract cost as ' + refLabel + '.', 'inline-message'));
    } else if (counter.gapCents > 0) {
      detail.append(make('p', 'To match ' + refLabel + ', ask for ' + usd(counter.gapCents / 100) + ' less over the term.'));
      if (deal.onePay || reference.onePay) {
        detail.append(make('p', 'Request a revised total for the one-pay comparison.', 'inline-message'));
      } else if (counter.paymentCents !== null) {
        detail.append(make('p', 'Counter at ' + usd(counter.paymentCents / 100) + '/mo including tax, with ' + usd(counter.dasCents / 100) + ' nonrefundable due at signing. Keep shipping and all other nonrecurring charges fixed.', 'inline-message'));
      } else {
        detail.append(make('p', 'The separate charges alone use the budget. Ask for lower fees.', 'inline-message'));
      }
    }
  }
  const price = make('div', '', 'quote-cost');
  price.append(make('strong', usd(calc.effectiveMonthly) + '/mo'), make('p', usd(calc.totalContractCash) + ' total'));
  const currentTarget = brief && groupKey(deal) === groupKey({ ...brief, annualMiles: brief.miles });
  if (!sample && comparable && currentTarget) {
    const delta = calc.effectiveMonthly - Number(brief.budget);
    const cashDelta = calc.cashNeededAtSigning - Number(brief.upfront);
    const budgetLine = (amount, kind) => amount === 0 ? 'At your ' + kind + ' ceiling' : usd(Math.abs(amount)) + (amount > 0 ? ' over' : ' below') + ' your ' + kind + ' ceiling';
    price.append(make('p', budgetLine(delta, 'monthly'), 'muted'), make('p', budgetLine(cashDelta, 'upfront'), 'muted'));
  }
  if (!sample) {
    const edit = make('button', 'Edit', 'text-btn');
    edit.addEventListener('click', () => loadQuote(deal));
    const remove = make('button', 'Remove', 'text-btn');
    remove.addEventListener('click', () => removeQuote(deal.id));
    price.append(edit, remove);
  }
  card.append(detail, price);
  return card;
}

function renderBoard() {
  const sample = $('board-source').value === 'sample';
  const group = $('board-group').value;
  const rows = (sample ? SAMPLE_DEALS : localDeals).filter(d => groupKey(d) === group);
  const list = $('deals-list');
  list.replaceChildren();
  write('board-notice', sample ? 'Synthetic examples for learning. These figures are fictional.' :
    'Only your saved worksheets appear here. Confirm tax, incentive eligibility and vehicle fit to rank an offer.');
  $('clear-local').hidden = sample || localDeals.length === 0;
  if (!rows.length) {
    write('cohort-summary', 'No saved quotes yet. Enter a dealer worksheet in the Lease analyzer.');
    return;
  }
  const ready = rows.filter(d => sample || missingChecks(d).length === 0);
  const pending = rows.filter(d => !sample && missingChecks(d).length > 0);
  write('cohort-summary', sample ? rows.length + ' worked examples' :
    ready.length + ' ready to compare · ' + pending.length + ' awaiting confirmation');
  // Fictional examples intentionally show mixed tax assumptions and are never ranked as offers.
  if (sample) {
    rows.forEach(d => list.append(showQuote(d, true, false)));
    return;
  }
  ready.sort((a, b) => normalizeLease(a).totalContractCash - normalizeLease(b).totalContractCash);
  if (ready.length) list.append(make('h3', 'Confirmed worksheets · lowest effective cost first', 'section-label'));
  if (ready.length > 1) list.append(make('p', 'Use a counter only while both cars are available and the packages, drivetrain, odometer, warranty and program are comparable.', 'inline-message'));
  ready.forEach(d => list.append(showQuote(d, false, true, ready[0])));
  if (pending.length) list.append(make('h3', 'Needs confirmation', 'section-label'));
  pending.forEach(d => list.append(showQuote(d, false, false)));
}

$('board-source').addEventListener('change', () => fillBoard());
$('board-group').addEventListener('change', renderBoard);
$('save-local').addEventListener('click', () => {
  if (!validLease()) return;
  const updated = readLease();
  const original = editingId && localDeals.find(d => d.id === editingId);
  const id = original?.id ?? ('local-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2)));
  const deal = { ...original, ...updated, id };
  const next = original ? localDeals.map(d => d.id === original.id ? deal : d) : [...localDeals, deal];
  if (!store(quoteKey, next)) {
    write('lease-error', 'Your browser could not save this quote. Copy the breakdown to keep a record.');
    $('lease-error').style.display = 'block';
    return;
  }
  localDeals = next;
  $('board-source').value = 'mine';
  fillBoard(groupKey(deal));
  resetQuote();
  showTab('leaderboard');
});
$('clear-local').addEventListener('click', () => {
  if (!window.confirm('Delete all your saved quotes from this browser?')) return;
  if (!store(quoteKey, [])) {
    write('cohort-summary', 'Browser storage is unavailable. Your stored quotes could not be changed.');
    return;
  }
  localDeals = [];
  resetQuote();
  fillBoard();
});
copyOnClick($('copy-analysis'), () => {
  if (!validLease()) return '';
  const d = readLease();
  const r = normalizeLease(d);
  return [
    groupLabel(d), 'Payment ' + usd(d.payment) + '/mo', 'Nonrefundable at signing ' + usd(d.das),
    'First payment in that amount ' + (d.firstPaymentInDAS ? 'yes' : 'no'), 'One-pay ' + usd(d.onePay),
    'Broker ' + usd(d.brokerFee) + ' · Shipping ' + usd(d.shipping) + ' · Extra fees ' + usd(d.extraFees),
    'Refundable deposit ' + usd(d.refundableDeposit), 'Total contract cash ' + usd(r.totalContractCash),
    'Effective monthly ' + usd(r.effectiveMonthly), 'Open checks: ' + (missingChecks(d).join(', ') || 'none'),
  ].join('\n');
});
$('export-deal').addEventListener('click', () => {
  if (!validLease()) return;
  const publicFields = exportAnonymousDeal(readLease());
  const url = URL.createObjectURL(new Blob([JSON.stringify(publicFields, null, 2) + '\n'], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'dealboard-redacted-submission.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
});

function updateBuy() {
  try {
    const r = normalizePurchase({
      otd: num('p-otd'), down: num('p-down'), netTradeEquity: num('p-equity'),
      negativeEquity: num('p-negative'), apr: num('p-apr'), months: num('p-months'),
    });
    $('purchase-error').style.display = 'none';
    write('buy-monthly', usd(r.monthly) + ' /mo');
    write('buy-principal', usd(r.principal));
    write('buy-interest', usd(r.interest));
    write('buy-payments', usd(r.totalPayments));
  } catch (error) {
    for (const id of ['buy-monthly', 'buy-principal', 'buy-interest', 'buy-payments']) write(id, '—');
    write('purchase-error', error.message);
    $('purchase-error').style.display = 'block';
  }
}
$('purchase-form').addEventListener('submit', event => { event.preventDefault(); updateBuy(); });
$('purchase-form').addEventListener('input', updateBuy);
updateBuy();

document.querySelectorAll('.copy-template').forEach(button =>
  copyOnClick(button, () => $(button.dataset.copy).textContent)
);

resetQuote();
fillBoard();
