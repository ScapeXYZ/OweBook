import type { Shop, Customer, Transaction } from "./input.js";
import { MAX_CUSTOMER, MAX_SHOP, sum } from "./values.js";

function enforceLimit(value: number, max: number, context: string) {
  if (value > max) throw new Error(context + " exceeds " + max + " minor units");
}

export const buckets = ["Not yet due", "1–7 days overdue", "8–30 days overdue", "31+ days overdue"] as const;
export function bucket(days: number) {
  return days <= 0 ? 0 : days <= 7 ? 1 : days <= 30 ? 2 : 3;
}
type Sale = Transaction & { due: number; unpaid: number };
type Allocation = { id: string; date: number; note?: string; amount: number };
type Entry = Omit<Transaction, "sourceLine"> & { balance: number; allocations: Allocation[]; unapplied: number };
export type Tier = "none" | "friendly" | "overdue_notice" | "contact_us";
function tier(days: number): Tier {
  return (["none", "friendly", "overdue_notice", "contact_us"] as const)[bucket(days)];
}
function ledger(shop: Shop, customer: Customer, transactions: Transaction[], asOf: number) {
  const sales: Sale[] = [];
  const entries: Entry[] = [];
  let credit = 0;
  let balance = 0;
  let balanceError: string | undefined;
  for (const { sourceLine, ...tx } of transactions) {
    const allocations: Allocation[] = [];
    let unapplied = 0;
    if (tx.type === "sale") {
      const applied = Math.min(credit, tx.amount);
      credit -= applied;
      const due = tx.due_date ?? sum(tx.date, customer.terms_days ?? shop.default_terms_days);
      if (tx.amount > applied) sales.push({ ...tx, due, unpaid: tx.amount - applied });
      balance = sum(balance, tx.amount);
    } else {
      let remaining = tx.amount;
      const open = sales.filter(sale => sale.unpaid > 0)
        .sort((a, b) => a.due - b.due || a.date - b.date || a.order - b.order);
      for (const sale of open) {
        if (!remaining) break;
        const amount = Math.min(remaining, sale.unpaid);
        remaining -= amount;
        sale.unpaid -= amount;
        allocations.push({ id: sale.id, date: sale.date, note: sale.note, amount });
      }
      unapplied = remaining;
      credit = sum(credit, remaining);
      balance = sum(balance, -tx.amount);
    }
    if (credit > 0 && balance !== -credit) throw new Error("Credit/open sales invariant violated");
    const context = " (customer " + customer.id + ", " +
      (sourceLine === undefined ? "transaction " + tx.id : "transactions.csv row " + sourceLine) + ")";
    enforceLimit(credit, MAX_CUSTOMER, "Credit" + context);
    if (Math.abs(balance) > MAX_CUSTOMER) balanceError ??= "Absolute balance" + context + " exceeds " + MAX_CUSTOMER + " minor units";
    entries.push({ ...tx, balance, allocations, unapplied });
  }
  const aging = [0, 0, 0, 0];
  let oldest = 0;
  for (const sale of sales) {
    if (!sale.unpaid) continue;
    const days = asOf - sale.due;
    const index = bucket(days);
    aging[index] = sum(aging[index], sale.unpaid);
    oldest = Math.max(oldest, days);
  }
  const overdue = aging.slice(1).reduce(sum, 0);
  enforceLimit(overdue, MAX_CUSTOMER, "Overdue (customer " + customer.id + ")");
  if (balanceError) throw new Error(balanceError);
  return { ...customer, entries, aging, oldest, overdue, tier: tier(oldest), balance, credit,
    lastPayment: entries.findLast(entry => entry.type === "payment")?.date };
}
export type Ledger = ReturnType<typeof ledger>;
export type Payment = Ledger["entries"][number];

export function summarize(shop: Shop, customers: Customer[], transactions: Transaction[], asOf: number, warnings: string[] = [], excluded = 0) {
  const byCustomer = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (tx.date > asOf) continue;
    if (!byCustomer.has(tx.customer_id)) byCustomer.set(tx.customer_id, []);
    byCustomer.get(tx.customer_id)!.push(tx);
  }
  for (const rows of byCustomer.values()) {
    rows.sort((a, b) => a.date - b.date || Number(a.type === "payment") - Number(b.type === "payment") || a.order - b.order);
  }
  const ledgers = customers.map(customer => ledger(shop, customer, byCustomer.get(customer.id) ?? [], asOf));
  ledgers.sort((a, b) => b.overdue - a.overdue || b.balance - a.balance);
  const outstanding = ledgers.reduce((total, customer) => sum(total, Math.max(0, customer.balance)), 0);
  const overdue = ledgers.reduce((total, customer) => sum(total, customer.overdue), 0);
  const total_credit = ledgers.reduce((total, customer) => sum(total, customer.credit), 0);
  enforceLimit(overdue, MAX_SHOP, "Shop overdue total");
  enforceLimit(outstanding, MAX_SHOP, "Shop outstanding total");
  enforceLimit(total_credit, MAX_SHOP, "Shop credit total");
  const aging = buckets.map((_, index) => ledgers.reduce((total, customer) => sum(total, customer.aging[index]), 0));
  return { shop, asOf, ledgers, outstanding, overdue, total_credit, aging, warnings, excluded,
    owingCount: ledgers.filter(customer => customer.balance > 0).length,
    overdueCount: ledgers.filter(customer => customer.overdue > 0).length };
}
export type Summary = ReturnType<typeof summarize>;
