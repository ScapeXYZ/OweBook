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
