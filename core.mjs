/**
 * Dealboard financial calculations. All monetary amounts are USD.
 * Works in browsers and Node.js. No external dependencies.
 */
const money = (value) => {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0) throw new RangeError('Amounts must be nonnegative finite numbers');
  return number;
};
const whole = (value, field) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new RangeError(`${field} must be a positive integer`);
  return n;
};
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Lease calculation intentionally treats DAS as total cash at signing, including
 * the first payment only if `firstPaymentInDAS` is true.
 * `onePay` is the ALL-IN one-payment sum; it replaces monthly and DAS.
 * Shipping, broker and extra nonrefundable fees are distinct additional cash.
 * A refundable security deposit is excluded, but still must be available.
 */
export function normalizeLease(d) {
  const months = whole(d.months, 'months');
  const annualMiles = whole(d.annualMiles, 'annualMiles');
  const payment = money(d.payment);
  const das = money(d.das);
  const brokerFee = money(d.brokerFee);
  const shipping = money(d.shipping);
  const extraFees = money(d.extraFees);
  const refundableDeposit = money(d.refundableDeposit);
  const onePay = money(d.onePay);
  const msrp = money(d.msrp);
  const sellingPrice = money(d.sellingPrice);
  if (onePay > 0 && (payment > 0 || das > 0)) throw new RangeError('One-pay is all-inclusive: do not also enter recurring payment or DAS');
  if (d.firstPaymentInDAS && !onePay && payment > das) throw new RangeError('DAS cannot include the first payment if it is smaller than one monthly payment');
  const periodicPayments = onePay > 0 ? 0 : payment * (months - (d.firstPaymentInDAS ? 1 : 0));
  const total = (onePay > 0 ? onePay : periodicPayments + das) + brokerFee + shipping + extraFees;
  return {
    months, annualMiles, payment, das, brokerFee, shipping, extraFees, refundableDeposit, onePay,
    periodicPayments: round2(periodicPayments),
    totalContractCash: round2(total),
    effectiveMonthly: round2(total / months),
    cashNeededAtSigning: round2(onePay > 0 ? onePay + brokerFee + shipping + extraFees + refundableDeposit : das + brokerFee + shipping + extraFees + refundableDeposit),
    discountPct: msrp && sellingPrice ? round2(((msrp - sellingPrice) / msrp) * 100) : null,
    ratioPct: msrp ? round2((total / months) / msrp * 100) : null,
    excluded: ['Refundable deposits (cash needed but not spending)', 'Insurance, fuel, wear/maintenance, mileage overage', 'Disposition/return charges unless explicitly added as extra fee'],
  };
}

/** Standard amortizing loan, no balloon, prepayment, variable-rate or lease residual. */
export function normalizePurchase(d) {
  const otd = money(d.otd);
  const down = money(d.down);
  const netTradeEquity = money(d.netTradeEquity);
  const negativeEquity = money(d.negativeEquity);
  const apr = money(d.apr);
  const months = whole(d.months, 'months');
  if (apr > 100) throw new RangeError('APR must be 0–100%');
  const principal = Math.max(0, otd - down - netTradeEquity + negativeEquity);
  const rate = apr / 1200;
  const monthly = principal === 0 ? 0 : rate === 0 ? principal / months : principal * rate / (1 - Math.pow(1 + rate, -months));
  return {
    principal: round2(principal), monthly: round2(monthly),
    interest: round2(monthly * months - principal),
    totalPayments: round2(monthly * months),
    totalCostBeforeTrade: round2(monthly * months + down + netTradeEquity),
  };
}

/** Deals are only comparable inside identical model/trim, state, term and miles/year. */
export function cohortKey(deal) {
  return [deal.model?.trim().toLowerCase(), deal.trim?.trim().toLowerCase(), deal.state?.trim().toUpperCase(), deal.months, deal.annualMiles].join('|');
}
export function rankCohort(deals, filter) {
  return deals.filter(d => !filter || cohortKey(d) === cohortKey(filter))
    .map(d => ({ ...d, computed: normalizeLease(d) }))
    .sort((a, b) => a.computed.effectiveMonthly - b.computed.effectiveMonthly || a.id.localeCompare(b.id));
}
/** Reject unexpectedly identifying fields. Caller must present the redaction warning. */
export function exportAnonymousDeal(d) {
  const allowed = ['model','trim','state','quoteMonth','months','annualMiles','payment','das','firstPaymentInDAS','brokerFee','shipping','extraFees','refundableDeposit','onePay','msrp','sellingPrice','taxIncluded','evidence','incentivesConfirmed','isDemo','vehicleMiles'];
  const copy = Object.fromEntries(allowed.filter(k => d[k] !== undefined && d[k] !== '').map(k => [k, d[k]]));
  normalizeLease({ ...copy, months: copy.months || 24, annualMiles: copy.annualMiles || 10000 });
  return copy;
}

/** Compute the cents-accurate gap and recurring counter for matched worksheets.
 * Keep every nonrecurring cost fixed. A first payment inside DAS changes with
 * the monthly payment. For one-pay deals only the contract cash gap applies.
 */
export function counterTarget(reference, candidate) {
  const cents = value => Math.round(value * 100);
  const ref = normalizeLease(reference);
  const other = normalizeLease(candidate);
  if (ref.months !== other.months) throw new RangeError('Match the lease terms before calculating a counter.');
  const referenceCash = cents(ref.totalContractCash);
  const gapCents = cents(other.totalContractCash) - referenceCash;
  const result = { gapCents, paymentCents: null, dasCents: null };
  if (gapCents <= 0 || ref.onePay || other.onePay) return result;
  const fixedCash = cents(other.totalContractCash) - other.months * cents(other.payment);
  const target = Math.floor((referenceCash - fixedCash) / other.months);
  if (target <= 0) return result;
  result.paymentCents = target;
  result.dasCents = cents(other.das) + (candidate.firstPaymentInDAS ? target - cents(other.payment) : 0);
  return result;
}
