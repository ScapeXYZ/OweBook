import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { validateInput } from "../core/input.js";
import { summarize } from "../core/ledger.js";
import { day } from "../core/values.js";

export async function loadSummary(data: string, date: string) {
  const asOf = day(date);
  const load = (name: string) => readFile(join(data, name), "utf8");
  const [shop, customers, transactions] = await Promise.all([load("shop.json"), load("customers.csv"), load("transactions.csv")]);
  const parsed = validateInput({ shop, customers, transactions }, asOf);
  if (parsed.errors.length || !parsed.shop) throw new Error(parsed.errors.join("\n"));
  return summarize(parsed.shop, parsed.customers, parsed.transactions, asOf, parsed.warnings, parsed.excluded);
}
