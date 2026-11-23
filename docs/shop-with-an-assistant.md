# Use an assistant with your own search

Dealboard runs without an account. This optional workflow works in a text assistant you already use. Start with a copy of the [six-line shopping brief](field-guide.md) and a few quote summaries. Use labels such as “Local A” and “Shipped B,” your state or metro, and the program month. Keep personal details, VINs, contact information, private documents and account links out of the prompt. You can start with zero quotes.

## Copy this prompt

```text
Help me shop a US vehicle lease. Use my brief and my anonymized offer summaries below.

Brief
- Vehicle, condition and required options:
- Region where I will register and how far I will travel:
- Term and annual miles:
- Maximum effective monthly cost and cash I can pay at signing:
- Customer down payment, trade equity and timing:

Quotes
For each quote, use a label and date. Include equipment, taxes, term, miles, monthly payment, total cash payable by me at signing, whether it includes the first payment, refundable deposits, and separately paid shipping or broker fees. Enter "unknown" for missing items.
[Paste summaries here. If I have none, start with my brief and a worksheet request.]

1. Summarize my constraints. Identify which cars meet my equipment and mileage requirements.
2. If you can browse, find a few comparable signed deals or currently advertised cars. For each public comparison give a direct source link, deal or listing date, date checked, region, trim, term, miles, incentives, and cash due. Distinguish a signed deal from a listing. Flag differences and stale programs. Mark missing facts "unknown." If you cannot verify a source or its date, exclude it from the benchmark and tell me what to look up. My own unverified quote summaries may still be compared as such.
3. For each complete quote, show signing cash, remaining payments and outside costs. Count the first payment once. Separate refundable cash from spending and include any trade equity I give up. Show term total and effective monthly. Flag all assumptions and any cost that could change the ranking. If a required figure is missing, give the exact question to resolve it.
4. Draft one short message for me to send to the most promising store. If I have a current comparable written offer, calculate one counter that matches its delivered cost on the same terms. Otherwise draft a worksheet request. Use only terms I actually have. Leave dealer contact and sending to me.

Return a compact comparison, the arithmetic, and the draft.
```

## Use the same process by hand

Fill out the brief. Look at [Leasehackr SIGNED!](https://signed.leasehackr.com/) and a dealer's current inventory. Save each dated source privately in the [dealer tracker](dealer-tracker.csv). Request the same structure from two stores using the [dealer messages](dealer-messages.md). Enter each reply in Dealboard. Compare effective monthly cost, the cash due now and any difference in equipment. Use the [worked comparison](field-guide.md) to calculate a counter and check the final worksheet.
