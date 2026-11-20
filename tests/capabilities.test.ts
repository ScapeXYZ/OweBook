import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { render } from "@hyper-elements/react";
import { validateInput } from "../core/input.js";
import { summarize } from "../core/ledger.js";
import { day } from "../core/values.js";
import Ledger from "../templates/ledger.js";
import Statement from "../templates/statement.js";
import Receipt from "../templates/receipt.js";

const asOf = day("2026-11-20");
const shop = {
  name: "Audit Shop", currency: { code: "NGN", symbol: "NGN", minorUnits: 2 },
  default_terms_days: 14, payment_instructions: ["Audit Payment Instructions"], contact: "Audit Contact"
};
const files = {
  customers: "id,name,phone,terms_days\na,Audit Customer,Audit Phone,12",
  transactions: "id,date,customer_id,type,amount,note,due_date,method,reference\ns1,2026-10-01,a,sale,100,Audit Sale Note,2026-10-14,,\np1,2026-10-15,a,payment,40,Audit Payment Note,,Audit Method,Audit Reference"
};
const parse = (paper?: string) => validateInput({ ...files, shop: JSON.stringify({ ...shop, paper }) }, asOf);

test("D11 paper defaults to A4 and rejects Letter and other formats", () => {
  assert.equal(parse().shop?.paper, "A4");
  assert.equal(parse("A4").shop?.paper, "A4");
  assert.deepEqual(parse("Letter").errors, ["shop.json row 1: Letter is not supported in this version; only A4"]);
  assert.equal(parse("Letter").shop, undefined);
  assert.deepEqual(parse("Legal").errors, ["shop.json row 1: Invalid paper; only A4 is supported"]);
});

test("D11 rendered statement, ledger and receipt display their intended input fields", async () => {
  const parsed = parse();
  assert.deepEqual(parsed.errors, []);
  const summary = summarize(parsed.shop!, parsed.customers, parsed.transactions, asOf);
  const [customer] = summary.ledgers;
  const [, payment] = customer.entries;
  const [statement, ledger, receipt] = await Promise.all([
    render(createElement(Statement, { summary, customer })),
    render(createElement(Ledger, { summary })),
    render(createElement(Receipt, { summary, customer, payment }))
  ]);
  for (const value of ["Audit Shop", "Audit Customer", "Audit Phone", "Audit Contact", "Audit Payment Instructions", "Audit Sale Note", "Audit Payment Note", "NGN100.00", "1 Oct 2026"]) {
    assert.ok(statement.html.includes(value), "Statement missing " + value);
  }
  for (const value of ["Audit Shop", "Audit Customer", "NGN60.00", "15 Oct 2026"]) {
    assert.ok(ledger.html.includes(value), "Ledger missing " + value);
  }
  for (const value of ["Audit Shop", "Audit Customer", "Audit Method", "Audit Reference", "Audit Sale Note", "NGN40.00", "15 Oct 2026"]) {
    assert.ok(receipt.html.includes(value), "Receipt missing " + value);
  }
  assert.doesNotMatch(receipt.html, /Audit Phone|Audit Contact|Audit Payment Note/);
});
