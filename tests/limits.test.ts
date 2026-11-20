import { test } from "node:test";
import assert from "node:assert/strict";
import { validateInput, type Shop, type Transaction } from "../core/input.js";
import { summarize } from "../core/ledger.js";
import { day, MAX_AMOUNT, MAX_CUSTOMER, MAX_SHOP } from "../core/values.js";
import { loadSummary } from "../scripts/load-summary.js";

const date = day("2026-11-20");
const shop: Shop = { name: "Fictional", currency: { code: "NGN", symbol: "NGN", minorUnits: 2 }, default_terms_days: 14, payment_instructions: [], paper: "A4" };
const customer = { id: "c", name: "Fictional customer" };
function split(total: number, chunk: number) {
  const parts: number[] = [];
  for (let left = total; left > 0; left -= chunk) parts.push(Math.min(left, chunk));
  return parts;
}
function transactions(total: number, type: Transaction["type"], due: number) {
  const customers = split(total, MAX_CUSTOMER).map((_, index) => ({ ...customer, id: "c" + index }));
  const rows = split(total, MAX_CUSTOMER).flatMap((balance, index) =>
    split(balance, MAX_AMOUNT).map((amount, order): Transaction => ({
      id: index + "-" + order, customer_id: customers[index].id, amount, type, order, date: date - 2,
      due_date: due, sourceLine: order + 2
    })));
  return summarize(shop, customers, rows, date);
}
function single(total: number, type: Transaction["type"], due: number) {
  const rows = split(total, MAX_AMOUNT).map((amount, order): Transaction => ({
    id: String(order), customer_id: customer.id, amount, type, order, date: date - 2, due_date: due, sourceLine: order + 2
  }));
  return summarize(shop, [customer], rows, date);
}

test("F1 transaction maximum and one above with CSV row", () => {
  const load = (amount: string) => validateInput({
    shop: JSON.stringify(shop), customers: "id,name\nc,Fictional",
    transactions: "id,date,customer_id,type,amount\nt,2026-11-20,c,sale," + amount
  }, date);
  assert.equal(load("99999999.99").transactions[0].amount, MAX_AMOUNT);
  assert.match(load("100000000.00").errors[0], /transactions.csv row 2: Amount/);
});
test("F1 currency symbol maximum and one above with shop row", () => {
  const load = (symbol: string) => validateInput({
    shop: JSON.stringify({ ...shop, currency: { ...shop.currency, symbol } }),
    customers: "id,name", transactions: "id,date,customer_id,type,amount"
  }, date);
  assert.deepEqual(load("NGN").errors, []);
  assert.match(load("NGNN").errors[0], /shop.json row 1: currency.symbol/);
});
test("F1 customer absolute balance maximum and one above", () => {
  assert.equal(single(MAX_CUSTOMER, "sale", date).ledgers[0].balance, MAX_CUSTOMER);
  assert.throws(() => single(MAX_CUSTOMER + 1, "sale", date), /Absolute balance \(customer c, transactions.csv row 12\)/);
});
test("F1 customer credit and negative balance maximum and one above", () => {
  const actual = single(MAX_CUSTOMER, "payment", date).ledgers[0];
  assert.equal(actual.credit, MAX_CUSTOMER);
  assert.equal(actual.balance, -MAX_CUSTOMER);
  assert.throws(() => single(MAX_CUSTOMER + 1, "payment", date), /Credit \(customer c, transactions.csv row 12\)/);
});
test("F1 customer overdue maximum and one above", () => {
  assert.equal(single(MAX_CUSTOMER, "sale", date - 1).ledgers[0].overdue, MAX_CUSTOMER);
  assert.throws(() => single(MAX_CUSTOMER + 1, "sale", date - 1), /Overdue \(customer c\)/);
});
test("F1 shop outstanding maximum and one above", () => {
  assert.equal(transactions(MAX_SHOP, "sale", date).outstanding, MAX_SHOP);
  assert.throws(() => transactions(MAX_SHOP + 1, "sale", date), /Shop outstanding total/);
});
test("F1 shop overdue maximum and one above", () => {
  assert.equal(transactions(MAX_SHOP, "sale", date - 1).overdue, MAX_SHOP);
  assert.throws(() => transactions(MAX_SHOP + 1, "sale", date - 1), /Shop overdue total/);
});
test("F1 shop credit maximum and one above use total_credit", () => {
  const result = transactions(MAX_SHOP, "payment", date);
  assert.equal(result.total_credit, MAX_SHOP);
  assert.equal(result.total_credit, result.ledgers.reduce((total, row) => total + row.credit, 0));
  assert.throws(() => transactions(MAX_SHOP + 1, "payment", date), /Shop credit total/);
});
for (const [set, expected] of [["sample", 450000], ["stress-max", 0], ["stress-min", 0]] as const) {
  test("S3 " + set + " summary schema and total_credit", async () => {
    const summary = JSON.parse(JSON.stringify(await loadSummary("data/" + set, "2026-11-20")));
    assert.deepEqual(Object.keys(summary).sort(), ["aging","asOf","excluded","ledgers","outstanding","overdue","overdueCount","owingCount","shop","total_credit","warnings"].sort());
    assert.ok(Number.isInteger(summary.total_credit));
    assert.equal(summary.total_credit, expected);
    assert.equal(summary.total_credit, summary.ledgers.reduce((total: number, row: { credit: number }) => total + row.credit, 0));
    if (set === "stress-max") {
      assert.equal(summary.ledgers.length, 1);
      assert.equal(summary.ledgers[0].balance, MAX_CUSTOMER);
      assert.equal(summary.ledgers[0].overdue, MAX_CUSTOMER);
      assert.equal(Math.max(...summary.ledgers[0].entries.map((entry: Transaction) => entry.amount)), MAX_AMOUNT);
    }
  });
}
