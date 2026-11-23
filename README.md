# Dealboard

Shop a US car lease from the first inventory search to the worksheet you bring to signing. Set your must-haves, ask dealers for the same terms, and calculate the price a competing store would need to match.

**Try the method.** A local car is $550/month. The same car two states away is $535/month plus $900 shipping. On a 36-month lease with only the first payment due at signing, the shipped car costs **$360 more**. Its dealer needs to reach **$525/month** to match the local offer. Both quotes are fictional. You can reproduce the calculation below.

[Open Dealboard](https://dealboard-community.vercel.app/) · [GitHub repository](https://github.com/Adesh101/dealboard-community) · [Read the five-step shopping guide](docs/field-guide.md) · [The Texas C 300 story](docs/c300-search.md)

## Start your own copy

You need Git and Node.js 20 or later. Run these commands from a terminal. There are no packages to install, accounts to connect or API keys to supply.

```sh
git clone https://github.com/Adesh101/dealboard-community.git
cd dealboard-community
npm start
```

Open **http://127.0.0.1:8000**. Keep the terminal open while shopping. Use the same browser and address to get back to your saved quotes. To use the files without Git, [download the source ZIP](https://dealboard-community.vercel.app/downloads/dealboard-community.zip), extract it and run `npm start` from the extracted folder. The [hosted app](https://dealboard-community.vercel.app/) also works on a phone.

## Get your first two real offers

| Step | What to do | What you leave with |
| --- | --- | --- |
| 1. Set your brief | Open **My search**. Pick a model, must-have options, registration location, term, annual miles and two limits: effective monthly cost and cash at signing. | A search you can send to more than one store. |
| 2. Find matching stock | Check a recent signed deal in your region, then locate actual cars on dealer inventory pages. Verify the required option on each window sticker. Ask two or three stores for a written worksheet on the same terms. | Two dated quotes, or a specific missing detail to request. [Field guide](docs/field-guide.md) · [Dealer messages](docs/dealer-messages.md) · [Blank tracker](docs/dealer-tracker.csv) |
| 3. Price the difference | Enter each worksheet in **Lease analyzer** and save it. Compare matching entries in **My quotes**. Count the first payment once. Separate refundable deposits. Add any shipping, tax or fees paid outside the quoted payment and signing amount. | Effective monthly cost, cash required and the dollar gap between your alternatives. |
| 4. Counter and close | Ask one store for the payment or fee reduction that closes the gap, with the same equipment, term, miles and signing cash. Before traveling, get the revised worksheet and its expiration. Check it against the actual contract. | A written offer you can accept, renegotiate or walk away from. [Signing checklist](docs/field-guide.md#5-check-the-agreement-before-traveling-or-signing) |

Keep a dealer's price private until you choose to share it. Saved quotes stay in this browser. The **Sample quotes** view uses fictional data. To establish a market benchmark, check the date, region, equipment and eligibility on a real signed deal, then confirm which seller can deliver today. [Leasehackr SIGNED!](https://signed.leasehackr.com/)

## Reproduce a counteroffer

The browser calculates the matching payment when you save two complete, comparable worksheets in **My quotes**. To try the same example immediately in the terminal, run the command below.

```sh
node scripts/compare.mjs examples/local.json examples/shipped.json
```

| 36 months · 10,000 miles/year | Local | Shipped |
| --- | ---: | ---: |
| First payment at signing | $550 | $535 |
| Remaining monthly payments | 35 × $550 | 35 × $535 |
| Transport | $0 | $900 |
| Total cost | $19,800 | $20,160 |
| Effective monthly | $550 | $560 |

The match is **($19,800 − $900) ÷ 36 = $525**. At that payment, the first payment at signing also falls to $525. Asking for $525 while allowing another $1,000 down would give back $1,000 over the term.

For your own numbers, copy the two JSON files into a `private/` folder. Replace the fictional data and confirmation flags with the actual terms, including program month, taxes, incentives and delivery. Set `synthetic` to `false`. Run the same command with your two private file paths. Use a written quote you can actually take as the first file. The terminal comparison and browser app both use [the same lease calculation](core.mjs).

## What worked on the C 300 search

A black GLC had a competitive payment and the standard stereo. The shopper cared more about Burmester and an opening roof than about driving an SUV. Asking the same stores about a C 300 with those options surfaced a local AMG Line. The next counter kept the proposed term and mileage fixed and asked the dealer to spell out the first payment and the Texas taxes. The shopper also checked whether a Sunday quote would hold for a Monday visit. [Read the case study](docs/c300-search.md)

## Use the parts you need

- **Working with an assistant.** Give it the anonymized brief, ask for dated comparison links, and have it draft a message you can send. The guide includes a manual version of the same workflow. [Copy the shopping prompt](docs/shop-with-an-assistant.md)
- **Considering a purchase.** Use the buying calculator for a fixed-rate loan. It shows principal, interest and scheduled payments. For a lease-versus-buy decision, separately estimate resale value and the outstanding loan balance at your planned sale date.
- **Understanding the math.** Effective monthly spreads the nonrefundable contract cash and separately entered expenses over the term. A refundable deposit increases cash you need upfront. Mileage overages, wear, insurance, maintenance and any unentered disposition fee can change what you ultimately spend. [Fields and assumptions](SCHEMA.md)
- **Improving the project.** A small, reproducible correction is useful. Share a synthetic pair of worksheets that exposes a calculation issue, a sourced state-specific nuance or a message that helped you get a missing worksheet line. The contribution guide covers review and redaction. [Contributing](CONTRIBUTING.md) · [GitHub issues](https://github.com/Adesh101/dealboard-community/issues)

## Run the checks

```sh
npm test
```

The site uses standard browser JavaScript and local storage. The Node tools use the standard library. To serve it with Python instead, run `python3 -m http.server 8000 --bind 127.0.0.1` from the project directory. Keep personal deal files outside the tree if you use a general file server.

Maintainers can build the hosted guides, downloadable ZIP and read-only Git mirror from a public commit with Python 3.9+, Git and Pandoc. Run `python3 scripts/release.py ../dealboard-dist` with a new output directory. The mirror includes the commit’s reachable history.

[MIT license](LICENSE)
