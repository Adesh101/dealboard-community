import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareWorksheets } from '../scripts/compare.mjs';

const example = name => JSON.parse(readFileSync(new URL('../examples/' + name + '.json', import.meta.url), 'utf8'));
const local = example('local');
const shipped = example('shipped');
const compare = (a = local, b = shipped) => compareWorksheets(a, b, '2026-11-22');

test('worked example counts first payment once and separates delivery from DAS', () => {
  const result = compare();
  for (const expected of ['$19,800.00 total', '$20,160.00 total', '$360.00 less', 'Monthly ceiling: $525.00', 'DAS: $525.00']) {
    assert.ok(result.includes(expected), expected);
  }
});

test('cent ceiling rounds down, leaves the fixed part of DAS unchanged and excludes a refundable deposit', () => {
  const result = compare(local, { ...shipped, das: 635, shipping: 901, refundableDeposit: 300 });
  assert.match(result, /Monthly ceiling: \$522\.19/);
  assert.match(result, /DAS: \$622\.19/);
});

test('does not subtract a first month when DAS excludes it', () => {
  assert.match(compare(local, { ...shipped, das: 50, firstPaymentInDAS: false }), /Monthly ceiling: \$523\.61.*DAS: \$50\.00/);
});

test('rejects incomplete, unactionable or unmatched comparisons', () => {
  for (const [field, value, expected] of [
    ['availableConfirmed', false, /availability/],
    ['evidence', 'signed', /written worksheet/],
    ['taxIncluded', false, /taxes/],
    ['incentivesConfirmed', false, /incentive/],
    ['shipping', null, /shipping/],
    ['firstPaymentInDAS', 'false', /first payment/],
    ['tradeEquity', 500, /without a trade/],
    ['year', 2025, /year/],
    ['quoteMonth', '2026-10', /quoteMonth/],
    ['months', 24, /months/],
    ['isDemo', true, /isDemo/],
    ['trim', 'Sport', /trim/],
    ['drivetrain', 'AWD', /Drivetrains differ/],
    ['equipment', ['Standard stereo'], /equipment differs/],
  ]) {
    assert.throws(() => compare(local, { ...shipped, [field]: value }), expected, field);
  }
});

test('one-pay gap is reported without a recurring payment counter', () => {
  const result = compare(local, { ...shipped, payment: 0, das: 0, onePay: 19800, firstPaymentInDAS: false });
  assert.match(result, /\$900\.00 less/);
  assert.doesNotMatch(result, /Monthly ceiling/);
});

test('does not anchor a higher counter when candidate is cheaper or matched', () => {
  assert.match(compare(shipped, local), /already \$360\.00 below/);
  assert.match(compare(local, local), /Costs match/);
});

test('flags unverifiable expiry and missing options, rejects expired real worksheets and mixed evidence', () => {
  assert.match(compare(local, { ...shipped, equipment: undefined }), /Equipment or drivetrain unconfirmed/);
  assert.match(compare(), /Expiry unconfirmed/);
  assert.throws(() => compare({ ...local, synthetic: false, validThrough: '2026-11-21' }), /expired/);
  assert.throws(() => compare(local, { ...shipped, synthetic: false }), /two real worksheets/);
  assert.throws(() => compare({ ...local, synthetic: false, quoteMonth: '2026-10' }), /still valid/);
  assert.throws(() => compare({ ...local, synthetic: false, quoteMonth: '2026-12', validThrough: '2026-12-31' }), /future/);
});

test('explains an unattainable payment target', () => {
  assert.match(compare(local, { ...shipped, shipping: 20000 }), /no positive matching payment/);
});
