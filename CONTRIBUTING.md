# Contribute to Dealboard

A shopper should be able to repeat a result with two worksheets, a calculator and the assumptions you used. Contributions that make that easier belong here.

| Contribution | Include |
| --- | --- |
| Calculation fix | Two small fictional inputs, the observed output, the expected dollar amount and arithmetic. Add a regression test for the changed behavior. |
| Local leasing detail | The state and date, a primary source, the line on the worksheet to check, and how the result changes. |
| Guide improvement | A concrete decision or dealer response that the existing guide leaves ambiguous. Replace any identifying details with fictional examples. |
| Community deal record | Date, registration state, model year, equipment, condition, term, miles, itemized cash, delivery, tax treatment, eligible incentives and evidence level. Mark a signed deal, quote or advertisement accurately. |

## Work in a fork

1. Create a branch for one change. Put personal worksheet files in a separate private folder.
2. Edit the relevant document, fixture or calculation. Keep fictional examples labeled. Run `npm test` and, for a shopping flow change, try the route a first-time shopper uses.
3. Open a pull request describing what the shopper can now decide or verify. For a calculation, include the before and after arithmetic. The repository's issue form also accepts redacted deal details for maintainer review.

A GitHub issue or pull request is public. Use numeric fields and plain descriptions. Omit salespeople's names, contact details, VINs, stock or contract identifiers, customer information, bank or credit details, signatures, barcodes, email screenshots and original documents. Review any free-text vehicle description and the Git diff before submitting.

## Review

Maintain the difference between a shopper's own actionable quotes, fictional examples and historical signed terms. A reviewer checks arithmetic, matching equipment and contract terms, tax basis, eligibility, date and source quality. Expired or incomplete records can illustrate history when labeled. A submission never becomes a verified or live offer automatically.

[Schema](SCHEMA.md) · [Code of conduct](CODE_OF_CONDUCT.md) · [License](LICENSE)
