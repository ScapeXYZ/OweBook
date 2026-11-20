# Ledger rules

- Events sorted by date; same date: sales before payments; then file order.
- due date = sale.due_date, else sale date + customer.terms_days, else sale date + shop.default_terms_days.
- Payment allocation: FIFO over open sales by earliest due date, then sale date, then file order; excess becomes customer credit. A new sale first consumes available credit. Invariant: credit > 0 implies no open sales.
- overdue days = as-of minus due date; due today is NOT overdue. Buckets: not yet due, 1-7, 8-30, 31+, applied to the remaining unpaid amount of each sale.
- signed balance = open sales total minus credit. Reminder tier from the oldest overdue open item: none (nothing overdue), friendly (1-7), overdue_notice (8-30), contact_us (31+). No reminder is generated for customers with nothing overdue.
- No interest, fees, refunds, discounts, write-offs, taxes, or multi-currency.
- Money formatting uses the currency symbol, thousands separators, and minorUnits decimals. Credit is shown as CR. Dates use a fixed English month list.
- `--as-of YYYY-MM-DD` is required.

Amounts are positive plain decimal strings with surrounding whitespace allowed. Digits are required on both sides of a decimal point when present. Precision is limited to the currency's minor units. A currency symbol has at most 3 characters. Each transaction amount is limited to 9,999,999,999 minor units. Each customer's absolute balance, credit, and overdue amount are limited to 99,999,999,999 minor units each. Each shop total (outstanding, overdue, and credit) is limited to 9,999,999,999,999 minor units. Each CSV accepts up to 10,000 data rows. Sums must remain below 2^53.

total_credit = sum of customer credit balances

## Input and command capability audit

“Accepted but not displayed” refers to the rendered ledger, statement, reminder, and receipt. Fields can still affect calculations or appear in the machine-readable summary. The audit distinguishes automated tests from evidence produced by running a command.

### shop.json

| Field | Acceptance | Display or use | Test or evidence |
| --- | --- | --- | --- |
| `name` | Required | Shop identity on all four outputs | D11 rendered-field test. Sample Canvas capture. |
| `currency` | Required object | Configures amount parsing and formatting | D9 currency tests and [USD/JPY verification](evidence/wsl-complete.txt). |
| `currency.code` | Required | Accepted but not displayed. Retained in summary metadata. To display an ISO code, set it as the symbol. | S3 summary schema tests and D9 currency fixtures. |
| `currency.symbol` | Required, up to three characters | Formats amounts on all four outputs | F1 symbol boundary. D11 rendered-field test and D9 raster evidence. |
| `currency.minorUnits` | Optional, integer 0–3, default 2 | Controls parsing precision and decimal places on all four outputs | D9 zero- and three-minor-unit tests. |
| `default_terms_days` | Optional, integer 0–120, default 14 | Accepted but not displayed. Supplies due dates when no override applies. | Terms precedence test. |
| `payment_instructions` | Required array, up to three single-line entries | Statement and overdue reminder | D11 rendered-field test and sample Canvas capture. |
| `paper` | Optional, A4 only, default A4 | Statement page size. Letter is rejected with `Letter is not supported in this version; only A4`. Other values are invalid. | D11 paper test and [Poppler inspection](evidence/wsl-complete.txt). |
| `contact` | Optional | Statement only, when present | D11 rendered-field test. |
| `notice` and other extra keys | Accepted but ignored | Accepted but not displayed. The fixture notice labels its source data. | Sample and currency dataset builds. No dedicated assertion for extra JSON keys. |

### customers.csv

| Field | Acceptance | Display or use | Test or evidence |
| --- | --- | --- | --- |
| `id` | Required, unique lowercase ASCII letters, digits, or hyphens, up to 24 characters | Statement customer identifier and artifact filename. Links transactions to customers. | Sample builds, S3 summary tests, and Python customer comparison. |
| `name` | Required | Customer name on all four outputs | D11 rendered-field test and sample Canvas capture. |
| `phone` | Optional | Statement only, when present. It is never used to contact a customer. | D11 rendered-field test. |
| `terms_days` | Optional integer | Accepted but not displayed. Overrides the shop default when a sale has no explicit due date. | Terms precedence test. |
| `sample_label` and other extra headers | Accepted but ignored with a warning | Header name may be mentioned in the ledger warning. The cell value is accepted but not displayed. | Future-transactions and warning test. |

### transactions.csv

| Field | Acceptance | Display or use | Test or evidence |
| --- | --- | --- | --- |
| `id` | Required, unique, up to 20 characters | Statement entry ID and receipt allocation sale ID. Payment ID selects the receipt and names its file. | D11 rendered-field test, Python payment ID comparison, and E015 candidate build. |
| `date` | Required, valid YYYY-MM-DD | Statement entry and receipt dates, ledger last payment, and calculation ordering and cutoff | D11 rendered-field, calendar, same-day ordering, and future-transaction tests. |
| `customer_id` | Required, must match a customer | Accepted but not displayed as a separate transaction field. Assigns transactions to the customer shown on the rendered outputs. | Multiple-issue validation and Python customer comparison. |
| `type` | Required, `sale` or `payment` | Statement entry type and selection of receipt and allocation behavior | D11 rendered-field, same-day, and multiple-issue validation tests. |
| `amount` | Required, positive decimal within the precision and size limits | Direct amounts on statement and receipt. Calculated balances and overdue amounts on ledger and reminder. | F1 amount boundary, D9 precision, D11 rendered-field, and partial-settlement tests. |
| `note` | Optional, up to 60 characters | Statement shows sale and payment notes. Receipt shows allocated sale notes. Payment note is accepted but not displayed on the receipt. | D11 rendered-field test. |
| `due_date` | Optional sale override. A payment value is accepted but ignored with a warning. | Accepted but not displayed as a raw date. Drives allocation order, aging, and reminder timing. | FIFO override, terms precedence, and future-transactions and warning tests. |
| `method` | Optional on payments, up to 20 characters. Rejected on sales. | Receipt, when present | D11 rendered-field test and E015 candidates. |
| `reference` | Optional on payments, up to 24 characters. Rejected on sales. | Receipt, when present | D11 rendered-field test and E015 candidates. |
| `sample_label` and other extra headers | Accepted but ignored with a warning | Header name may be mentioned in the ledger warning. The cell value is accepted but not displayed. | Future-transactions and warning test. |

### CLI

| Command and option | Acceptance | Display or use | Test or evidence |
| --- | --- | --- | --- |
| `build --data <dir>`, `summary --data <dir>` | Required | Input directory for either command | S7 summary/build equivalence test. |
| `build --as-of YYYY-MM-DD`, `summary --as-of YYYY-MM-DD` | Required | Cutoff for both commands. Displayed on the ledger, statement, and reminder. | S7 equivalence and future-transaction tests. |
| `build --out <dir>`, `summary --out <file>` | Required | Destination for the artifact directory or single summary file | S7 equivalence test. |
| `build --payment <id>` | Optional, must match an eligible payment | Selects a single receipt. Other artifact types are still generated. | D10a sample build with E015. |
| Unknown build/summary options and extra positional arguments | Rejected by Node argument parsing | No output | Node strict argument parsing in both entry points. |
| `screenshots [build-dir] [destination-dir] [receipt-file]` | Accepted optional positionals | Selects the input artifacts, output directory, and which receipt to capture | D10a candidate command. |
| `screenshots --wide` | Accepted after the positional arguments | Adds a 1280 px receipt capture | [Stress and currency screenshot evidence](evidence/wsl-complete.txt). |
| `verify`, `verify:full` | Accepted npm commands. Internal `--full` selects the full tier. | Runs the checks listed in the README | [Windows and WSL runs](evidence/wsl-complete.txt). |
| `crosscheck --root <dir>` | Optional, default current directory | Root for fixtures, summaries and report | Python checker argument parser. Default root exercised by the full-tier run. |
| `crosscheck --as-of YYYY-MM-DD` | Optional, default 2026-11-20 | Independent ledger cutoff | Defaults exercised by the [full-tier run](evidence/wsl-full-crosscheck.json). |
| `crosscheck --sets <name...>` | Optional | Selects datasets to compare | [Currency comparison](evidence/currency-crosscheck.json) and full-tier run. |
| `crosscheck --report <file>` | Optional | Writes JSON report at the requested location | [Full-tier run](evidence/wsl-complete.txt). |
| `crosscheck --require-python` | Accepted internal wrapper option | Fails if Python 3 is missing | Full-tier run exercises the option with Python installed. Missing-tool path has no dedicated test. |
| `crosscheck --help`, `crosscheck -h` | Accepted by Python argparse | Prints cross-check usage | Python argparse. No dedicated test. |
| `test`, `typecheck`, `contrast` | No project options are defined | Run named tests, TypeScript checking, and contrast checks | [Verification transcript](evidence/windows-complete.txt). |
