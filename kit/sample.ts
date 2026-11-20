import { readFileSync } from "node:fs";
import { validateInput } from "../core/input.js";
import { summarize } from "../core/ledger.js";
import { day } from "../core/values.js";

const load = (name: string) => readFileSync(new URL("../data/sample/" + name, import.meta.url), "utf8");
const asOf = day("2026-11-20");
const parsed = validateInput({ shop: load("shop.json"), customers: load("customers.csv"), transactions: load("transactions.csv") }, asOf);
if (!parsed.shop || parsed.errors.length) throw new Error(parsed.errors.join("\n"));
export const sample = summarize(parsed.shop, parsed.customers, parsed.transactions, asOf, parsed.warnings, parsed.excluded);
export const sampleCustomer = sample.ledgers.find(customer => customer.tier === "contact_us")!;
export const samplePayment = sampleCustomer.entries.findLast(entry => entry.type === "payment")!;
