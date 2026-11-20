import { test } from "node:test";
import assert from "node:assert/strict";
import { csv } from "../core/csv.js";
import { validateInput, type Shop, type Transaction } from "../core/input.js";
import { bucket, summarize } from "../core/ledger.js";
import { day, formatDate, MAX_AMOUNT, money, parseAmount, sum } from "../core/values.js";

for (const [input, expected] of [["15000", 1500000], ["15000.5", 1500050], ["15000.50", 1500050], ["0.05", 5], [" \t0.05 ", 5]] as const) {
  test("parse " + JSON.stringify(input), () => assert.equal(parseAmount(input, 2), expected));
}
for (const input of ["15000.505","15000.500",".5","1.","1,000","-5","1e3","$5","","0","0.00"]) {
  test("reject " + JSON.stringify(input), () => assert.throws(() => parseAmount(input, 2)));
}
test("zero minor units", () => {
  assert.equal(parseAmount("100", 0), 100);
  assert.throws(() => parseAmount("100.0", 0));
});
test("amount and safe sum boundaries", () => {
  assert.equal(parseAmount("99999999.99", 2), MAX_AMOUNT);
  assert.throws(() => parseAmount("100000000.00", 2));
  assert.equal(sum(Number.MAX_SAFE_INTEGER - 1, 1), Number.MAX_SAFE_INTEGER);
  assert.throws(() => sum(Number.MAX_SAFE_INTEGER, 1));
});
test("CSV data row boundary", () => {
  assert.equal(csv("id\n" + "a\n".repeat(10_000)).length, 10_001);
  assert.throws(() => csv("id\n" + "a\n".repeat(10_001)), /10,000/);
});
test("CSV BOM, CRLF, blank lines, commas and escaped quotes", () => {
  assert.deepEqual(csv('\uFEFFid,name\r\n\r\na,"A, ""B"""\r\n'), [
    { line: 1, cells: ["id","name"] }, { line: 3, cells: ["a",'A, "B"'] }
  ]);
});
const shop: Shop = { name: "Test", currency: { code: "NGN", symbol: "₦", minorUnits: 2 }, default_terms_days: 14, payment_instructions: [], paper: "A4" };
const asOf = day("2026-11-20");
const customer = { id: "a", name: "Ada" };
function tx(order: number, type: Transaction["type"], amount: number, date = asOf - 10, due_date?: number): Transaction {
  return { id: String(order), customer_id: "a", order, type, amount, date, due_date };
}
const run = (...rows: Transaction[]) => summarize(shop, [customer], rows, asOf).ledgers[0];
test("partial settlement and FIFO by due override", () => {
  const result = run(tx(1,"sale",100,asOf-30,asOf-5), tx(2,"sale",200,asOf-20,asOf-10), tx(3,"payment",250));
  assert.deepEqual(result.entries[2].allocations.map(({id,amount}) => [id,amount]), [["2",200],["1",50]]);
  assert.deepEqual(result.aging, [0,50,0,0]);
});
test("FIFO breaks ties by sale date then file order", () => {
  const result = run(tx(3,"sale",100,asOf-20,asOf), tx(2,"sale",100,asOf-20,asOf), tx(1,"sale",100,asOf-19,asOf), tx(4,"payment",210));
  assert.deepEqual(result.entries[3].allocations.map(({id,amount}) => [id,amount]), [["2",100],["3",100],["1",10]]);
});
test("overpayment creates credit, and next sale consumes it", () => {
  const sale = tx(1,"sale",100);
  const pay = tx(2,"payment",130);
  const credit = run(sale,pay);
  assert.equal(credit.credit,30);
  assert.equal(credit.balance,-30);
  assert.deepEqual(credit.aging,[0,0,0,0]);
  const next = run(sale,pay,tx(3,"sale",80,asOf));
  assert.equal(next.credit,0);
  assert.equal(next.balance,50);
});
test("prepayment", () => {
  assert.equal(run(tx(1,"payment",50),tx(2,"sale",45,asOf)).credit, 5);
});
test("same-day sales precede earlier-listed payments", () => {
  const result = run(tx(1,"payment",80), tx(2,"sale",200));
  assert.deepEqual(result.entries.map(x => x.id), ["2","1"]);
  assert.equal(result.entries[1].allocations[0].amount,80);
});
test("due today and aging edges", () => {
  assert.deepEqual([0,1,7,8,30,31].map(bucket),[0,1,1,2,2,3]);
  for (const [days, tier] of [[0,"none"],[1,"friendly"],[7,"friendly"],[8,"overdue_notice"],[30,"overdue_notice"],[31,"contact_us"]] as const) {
    const result = run(tx(1,"sale",100,asOf-40,asOf-days));
    assert.equal(result.tier,tier);
    assert.equal(result.overdue, days ? 100 : 0);
  }
});
test("terms precedence", () => {
  const sale = tx(1,"sale",100,asOf-14);
  assert.equal(run(sale).overdue,0);
  assert.equal(summarize(shop,[{...customer, terms_days: 0}],[sale],asOf).overdue,100);
  assert.equal(summarize(shop,[{...customer, terms_days: 0}],[{...sale, due_date:asOf}],asOf).overdue,0);
});
test("formatters and calendar validation", () => {
  assert.equal(money(-1500050,shop.currency),"₦15,000.50 CR");
  assert.equal(formatDate(asOf),"20 Nov 2026");
  assert.equal(day("2024-03-01") - day("2024-02-29"),1);
  for (const date of ["2026-02-29","2024-02-30","2026-13-01"]) assert.throws(() => day(date));
});
const input = { shop: JSON.stringify(shop), customers: "id,name\na,Ada", transactions: "id,date,customer_id,type,amount,due_date,other" };
test("validates multiple issues with row and file, capped at twenty", () => {
  const bad = validateInput({ ...input, transactions: input.transactions + "\nx,2026-02-30,unknown,oops,-2,,\nx,2026-11-01,a,sale,1,2026-10-31," }, asOf);
  assert.equal(bad.errors.length,6);
  assert.ok(bad.errors[0].includes("transactions.csv row 2"));
  assert.ok(bad.errors[5].includes("transactions.csv row 3"));
  const many = validateInput({ ...input, transactions: input.transactions + "\nx,2026-02-30,unknown,oops,-2,,".repeat(30) }, asOf);
  assert.equal(many.errors.length,20);
});
test("future transactions excluded and warnings counted; deterministic summary", () => {
  const files = { ...input, transactions: input.transactions + "\nx,2026-11-21,a,sale,20,,\ny,2026-11-20,a,payment,10,2026-11-21," };
  const result = validateInput(files, asOf);
  assert.deepEqual(result.errors,[]);
  assert.equal(result.excluded,1);
  assert.equal(result.warnings.length,3);
  const build = () => JSON.stringify(summarize(result.shop!,result.customers,result.transactions,asOf,result.warnings,result.excluded));
  assert.equal(build(),build());
  assert.equal(run(tx(1,"sale",80,asOf+1)).balance,0);
});
