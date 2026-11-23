# Reading a Dealboard quote

The browser form, examples and terminal comparison use US dollars. A real quote has a date, a specific car and an offer that the seller can confirm in writing. Fictional fixtures carry `synthetic: true`.

| Field | Enter |
| --- | --- |
| `model`, `trim`, `state` | Model family, trim or equipment group, and registration state. Keep naming consistent across quotes. |
| `quoteMonth`, `months`, `annualMiles` | Program month (YYYY-MM), contract term and contracted miles per year. |
| `payment` | Recurring payment, including all tax billed with each payment. |
| `das` | Nonrefundable amount due at signing. Subtract fully refundable deposits from the dealer's drive-off total before entering this field. |
| `firstPaymentInDAS` | True when the amount above includes the first scheduled payment. |
| `onePay` | Nonrefundable lump sum for a one-pay lease. Set recurring payment and DAS to zero. |
| `brokerFee`, `shipping`, `extraFees` | Additional nonrefundable amounts paid separately from the payment, DAS or one-pay. Count each dollar once. |
| `refundableDeposit` | Returnable security deposits. Included in upfront funding, excluded from spending assuming full return. |
| `msrp`, `sellingPrice` | Sticker price and negotiated selling price before incentives. These produce the displayed pre-incentive discount. |
| `taxIncluded`, `incentivesConfirmed` | Confirm all applicable taxes are captured and all incentives on this quote apply to you. |
| `evidence`, `isDemo`, `vehicleMiles` | Source type and vehicle condition. Record a written worksheet, advertisement, signed deal or community report accurately. |

## How cash is counted

For a recurring lease, multiply the monthly payment by the number of payments remaining after signing. Add the nonrefundable signing amount, separate broker fee, shipping and other costs. Divide by the contract term to get effective monthly cost. For a one-pay lease, add the separately paid expenses to the lump sum and divide by months. A cost already rolled into the payment is already counted.

The upfront funding figure groups nonrefundable signing cash, refundable deposits and the separate fees you enter. A carrier may actually bill on delivery. Match the worksheet and delivery schedule to your bank balance on each date. If assessing a later disposition charge, add it to the return scenario separately so it does not inflate signing cash.

The off-the-shelf examples assume zero trade equity. Get a no-trade worksheet to separate the vehicle deal from selling your old car. If a lease uses a trade or rolls in prior debt, reconcile that equity and any overlap separately before relying on the comparison. The financing calculator accepts positive and negative trade equity as explicit inputs.

## What can be compared

For your own search, match model year, model, trim, drivetrain, required equipment, condition, program, registration, term and miles. Confirm availability, eligibility, tax treatment and all outside costs. The browser groups common terms and relies on the shopper to confirm the vehicle and worksheet details. The comparison describes the offers entered. It cannot establish the lowest price in the market.

The two-file terminal tool starts from [the local example](examples/local.json) and [the shipped example](examples/shipped.json). It checks contract and verification fields, including `year`, `quoteMonth`, `availableConfirmed`, `evidence`, `isDemo`, and `tradeEquity`. Supply `drivetrain`, named options in `equipment`, and a written expiry in `validThrough` where available. For a real comparison, replace every example figure and set `synthetic` to false. A historical signed deal can inform a target. The terminal counter requires a currently available written alternative.

## Sharing a record

Use anonymous numeric terms and review any free-text model or trim before sharing. The browser's public export omits the quote nickname, private brief and contact notes. An export downloads a file to your device. Community contributions are reviewed separately. [Submission guidance](CONTRIBUTING.md)
