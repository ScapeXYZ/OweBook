#!/usr/bin/env python3
"""Independent OweBook differential checker, based on Claude's written rules.
No imports from, or reads of, OweBook implementation code.
Usage: python verification/crosscheck.py --root . --as-of 2026-11-20
"""
import argparse
import csv
import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path

SETS = ('sample', 'stress-max', 'stress-min')
BUCKETS = ('not_due', '1_7', '8_30', '31_plus')


def fail(message):
    raise ValueError(message)


def day(value, context):
    try:
        return date.fromisoformat(str(value))
    except (ValueError, TypeError):
        fail(f'{context}: invalid ISO date {value!r}')


def amount_minor(value, units, context):
    s = str(value).strip()
    if not re.fullmatch(r'\d+(?:\.\d+)?', s):
        fail(f'{context}: invalid amount {value!r}')
    whole, dot, fraction = s.partition('.')
    if len(fraction) > units:
        fail(f'{context}: excess decimal precision {value!r}')
    return int(whole) * 10**units + (int(fraction.ljust(units, '0')) if fraction else 0)


def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def first_value(mapping, *names):
    for name in names:
        if name in mapping and mapping[name] not in (None, ''):
            return mapping[name]
    return None


def calculate(folder, as_of):
    shop = json.loads((folder / 'shop.json').read_text(encoding='utf-8-sig'))
    units = int(shop['currency']['minorUnits'])
    customers = read_csv(folder / 'customers.csv')
    transactions = read_csv(folder / 'transactions.csv')
    states = {}
    for rowno, c in enumerate(customers, 2):
        cid = c['id']
        if cid in states:
            fail(f'customers.csv row {rowno}: duplicate customer id {cid}')
        terms = first_value(c, 'terms_days')
        states[cid] = {'name': c['name'], 'terms': int(terms) if terms is not None else int(shop['default_terms_days']),
                       'open': [], 'credit': 0, 'payments': [], 'last_payment': None}
    events = []
    ignored = 0
    for i, row in enumerate(transactions):
        when = day(row['date'], f'transactions.csv row {i+2}')
        if when > as_of:
            ignored += 1
            continue
        kind = row['type'].strip().lower()
        if kind not in ('sale', 'payment'):
            fail(f'transactions.csv row {i+2}: invalid type {kind!r}')
        cid = row['customer_id']
        if cid not in states:
            fail(f'transactions.csv row {i+2}: unknown customer {cid}')
        amt = amount_minor(row['amount'], units, f'transactions.csv row {i+2}')
        events.append((when, 0 if kind == 'sale' else 1, i, row, amt))
    events.sort(key=lambda e: e[:3])
    for when, _, i, row, amt in events:
        state = states[row['customer_id']]
        if row['type'].strip().lower() == 'sale':
            explicit = first_value(row, 'due_date')
            due = day(explicit, f'transactions.csv row {i+2} due_date') if explicit is not None else when + timedelta(days=state['terms'])
            used = min(state['credit'], amt)
            state['credit'] -= used
            remaining = amt - used
            if remaining:
                state['open'].append({'id': row['id'], 'date': when, 'due': due, 'order': i, 'remaining': remaining})
        else:
            left = amt
            allocations = []
            for item in sorted(state['open'], key=lambda x: (x['due'], x['date'], x['order'])):
                if left == 0:
                    break
                paid = min(left, item['remaining'])
                if paid:
                    item['remaining'] -= paid
                    left -= paid
                    allocations.append({'id': item['id'], 'amount': paid})
            state['open'] = [item for item in state['open'] if item['remaining']]
            state['credit'] += left
            state['payments'].append({'id': row['id'], 'allocations': allocations, 'unapplied': left})
            state['last_payment'] = when
    results = {}
    totals = {'outstanding': 0, 'overdue': 0, 'credit': 0, 'owingCount': 0, 'overdueCount': 0, 'aging': [0, 0, 0, 0], 'excluded': ignored}
    for cid, state in states.items():
        aging = [0, 0, 0, 0]
        oldest = 0
        for item in state['open']:
            days = max(0, (as_of - item['due']).days)
            oldest = max(oldest, days)
            bucket = 0 if days == 0 else 1 if days <= 7 else 2 if days <= 30 else 3
            aging[bucket] += item['remaining']
        outstanding = sum(aging)
        overdue = sum(aging[1:])
        credit = state['credit']
        if outstanding and credit:
            fail(f'{cid}: credit invariant violated')
        tier = 'none' if overdue == 0 else 'friendly' if oldest <= 7 else 'overdue_notice' if oldest <= 30 else 'contact_us'
        results[cid] = {'name': state['name'], 'balance': outstanding-credit, 'credit': credit,
                        'overdue': overdue, 'aging': aging, 'oldest': oldest, 'tier': tier,
                        'lastPayment': state['last_payment'], 'payments': state['payments']}
        totals['outstanding'] += outstanding
        totals['overdue'] += overdue
        totals['credit'] += credit
        totals['owingCount'] += outstanding > 0
        totals['overdueCount'] += overdue > 0
        for j in range(4):
            totals['aging'][j] += aging[j]
    return results, totals


def compare(folder, as_of):
    expected, totals = calculate(folder, as_of)
    summary_path = folder.parent.parent / 'out' / folder.name / 'summary.json'
    if not summary_path.is_file():
        return [{'set': folder.name, 'customer': 'ALL', 'field': 'summary', 'expected': 'file present', 'actual': 'MISSING'}], len(expected)
    summary = json.loads(summary_path.read_text(encoding='utf-8-sig'))
    # Explicit mapping of observed output schema: integer minor units, aging array in BUCKETS order,
    # ordinal dates (days since 1970-01-01), ledgers[].entries[].allocations.
    actual = {c['id']: c for c in summary['ledgers']}
    diffs = []
    def check(cid, field, want, got):
        if want != got:
            diffs.append({'set': folder.name, 'customer': cid, 'field': field, 'expected': want, 'actual': got})
    for cid in sorted(set(expected) | set(actual)):
        if cid not in expected or cid not in actual:
            check(cid, 'customer_present', cid in expected, cid in actual)
            continue
        exp, got = expected[cid], actual[cid]
        for field in ('name', 'balance', 'credit', 'overdue', 'aging', 'oldest', 'tier'):
            check(cid, field, exp[field], got.get(field))
        epoch = date(1970, 1, 1)
        expected_day = (exp['lastPayment'] - epoch).days if exp['lastPayment'] else None
        check(cid, 'lastPayment', expected_day, got.get('lastPayment'))
        actual_payments = {p['id']: p for p in got.get('entries', []) if p.get('type') == 'payment'}
        for p in exp['payments']:
            pid = p['id']
            if pid not in actual_payments:
                check(cid, f'payment:{pid}', 'present', 'MISSING')
                continue
            ap = actual_payments[pid]
            expected_alloc = [(a['id'], a['amount']) for a in p['allocations']]
            actual_alloc = [(a['id'], a['amount']) for a in ap.get('allocations', [])]
            check(cid, f'payment:{pid}.allocations', expected_alloc, actual_alloc)
            check(cid, f'payment:{pid}.unapplied', p['unapplied'], ap.get('unapplied'))
        check(cid, 'payment_ids', sorted(p['id'] for p in exp['payments']), sorted(actual_payments))
    for field, want in totals.items():
        key = 'total_credit' if field == 'credit' else field
        if field == 'credit' and key not in summary:
            # The observed summary format has no shop-level credit field. Report explicitly,
            # rather than silently inferring its existence.
            check('SHOP', 'credit', want, 'FIELD ABSENT')
        else:
            check('SHOP', field, want, summary.get(key))
    check('SHOP', 'asOf', (as_of-date(1970, 1, 1)).days, summary.get('asOf'))
    return diffs, len(expected)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('.'))
    parser.add_argument('--as-of', default='2026-11-20')
    parser.add_argument('--sets', nargs='+', default=list(SETS))
    parser.add_argument('--report', type=Path, default=Path('out/parallel/python-crosscheck.json'))
    args = parser.parse_args()
    as_of = day(args.as_of, '--as-of')
    all_diffs, counts = [], {}
    for setname in args.sets:
        folder = args.root / 'data' / setname
        if not folder.is_dir():
            all_diffs.append({'set': setname, 'customer': 'ALL', 'field': 'data', 'expected': 'directory present', 'actual': 'MISSING'})
            counts[setname] = 0
            continue
        diffs, count = compare(folder, as_of)
        all_diffs.extend(diffs)
        counts[setname] = count
    report = {'as_of': args.as_of, 'sets': counts, 'diff_count': len(all_diffs), 'diffs': all_diffs,
              'mapping': {'amounts': 'integer minor units', 'aging': list(BUCKETS), 'dates': 'days since 1970-01-01',
                          'shop_credit': 'required by Claude spec; may be absent in existing summary schema'}}
    target = args.root / args.report
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str)+'\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2, default=str))
    return 0 if not all_diffs else 1

if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as error:
        print(f'CROSSCHECK ERROR: {error}', file=sys.stderr)
        sys.exit(2)
