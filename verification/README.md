# Ledger cross-check

From the repository root, build sample, stress-max, and stress-min with an as-of date of 2026-11-20 and output directories `out/sample`, `out/stress-max`, and `out/stress-min`. Then run:

```sh
python verification/crosscheck.py --root . --as-of 2026-11-20
```

Alternatively, run `npm run crosscheck`. The wrapper reports a skip if Python 3 is unavailable. The checker writes the complete JSON report to `out/parallel/python-crosscheck.json` by default. Its exit status is 0 for no differences, 1 for differences, or 2 for input or execution errors.

The checker uses only the Python 3 standard library. It parses decimal strings directly into integer minor units and calculates with integers. It compares the sample, stress-max, and stress-min outputs. Customer fields include name, balance, credit, overdue, aging buckets, oldest overdue days, reminder tier, last payment, payment IDs, allocations, and unapplied payment credit. Shop fields include outstanding, overdue, total credit, both customer counts, aging, excluded transaction count, and as-of date.

ChatGPT wrote the checker from Claude's supplied rules without reading `core/ledger.ts` but had previously seen sample figures. The switch from the shop-level `credit` lookup to `total_credit` is a schema-name correction. The expected credit calculation and mismatch reporting are unchanged.
