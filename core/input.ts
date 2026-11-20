import { csv } from "./csv.js";
import { day, parseAmount, type Currency } from "./values.js";

export type Shop = { name: string; currency: Currency; default_terms_days: number; payment_instructions: string[]; paper: "A4"; contact?: string };
export type Customer = { id: string; name: string; phone?: string; terms_days?: number };
export type Transaction = { id: string; customer_id: string; date: number; amount: number; type: "sale" | "payment"; note?: string; due_date?: number; method?: string; reference?: string; order: number; sourceLine?: number };

export function validateInput(files: { shop: string; customers: string; transactions: string }, asOf: number) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const error = (file: string, row: number, message: string) => {
    if (errors.length < 20) errors.push(file + " row " + row + ": " + message);
  };
  const text = (value: unknown, name: string, max = Infinity) => {
    if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Invalid " + name);
    return value;
  };
  const integer = (value: unknown, name: string, min: number, max: number) => {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new Error("Invalid " + name);
    return value;
  };
  let shop: Shop | undefined;
  let minorUnits: number | undefined;
  try {
    const source = JSON.parse(files.shop.replace(/^\uFEFF/, ""));
    if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("Expected a shop object");
    function field<T>(fn: () => T): T | undefined {
      try { return fn(); } catch (cause) { error("shop.json", 1, (cause as Error).message); }
    }
    const name = field(() => text(source.name, "name", 40));
    const code = field(() => text(source.currency?.code, "currency.code"));
    const symbol = field(() => {
      const value = text(source.currency?.symbol, "currency.symbol");
      if (Array.from(value).length > 3) throw new Error("currency.symbol exceeds 3 characters");
      return value;
    });
    minorUnits = field(() => integer(source.currency?.minorUnits === undefined ? 2 : source.currency.minorUnits, "minorUnits", 0, 3));
    const defaultTerms = field(() => integer(source.default_terms_days === undefined ? 14 : source.default_terms_days, "default_terms_days", 0, 120));
    const paper = field(() => {
      const value = source.paper === undefined ? "A4" : source.paper;
      if (value === "Letter") throw new Error("Letter is not supported in this version; only A4");
      if (value !== "A4") throw new Error("Invalid paper; only A4 is supported");
      return value;
    });
    const instructions = field(() => {
      const values: unknown = source.payment_instructions;
      if (!Array.isArray(values) || values.length > 3) throw new Error("Invalid payment_instructions");
      return values.map(value => field(() => {
        const line = text(value, "payment instruction", 80);
        if (/[\r\n]/.test(line)) throw new Error("Expected one line per payment instruction");
        return line;
      })).filter(line => line !== undefined);
    });
    const contact = source.contact === undefined ? undefined : field(() => text(source.contact, "contact", 60));
    if (!errors.length && name && code && symbol && minorUnits !== undefined && defaultTerms !== undefined && instructions && paper) {
      shop = { name, currency: { code, symbol, minorUnits }, default_terms_days: defaultTerms, payment_instructions: instructions, paper, contact };
    }
  } catch (cause) {
    error("shop.json", 1, (cause as Error).message);
  }
  function read(file: string, input: string, required: string[], optional: string[], visit: (values: Record<string, string>, line: number, order: number) => void) {
    let rows;
    try {
      rows = csv(input);
    } catch (cause) {
      const message = (cause as Error).message;
      error(file, Number(/^Row (\d+):/.exec(message)?.[1] ?? 1), message.replace(/^Row \d+: /, ""));
      return;
    }
    const header = rows.shift();
    const columns = header?.cells.map(value => value.trim()) ?? [];
    const missing = required.filter(column => !columns.includes(column));
    for (const column of missing) error(file, header?.line ?? 1, "Missing column " + column);
    if (new Set(columns).size !== columns.length) {
      error(file, header?.line ?? 1, "Duplicate column");
      return;
    }
    if (missing.length) return;
    const allowed = new Set([...required, ...optional]);
    for (const column of columns) {
      if (!allowed.has(column)) warnings.push(file + " row " + header!.line + ": Ignored unknown column " + column);
    }
    rows.forEach(({ cells, line }, order) => {
      if (cells.length !== columns.length) {
        error(file, line, "Column count differs from header");
        return;
      }
      const values = Object.fromEntries(columns.flatMap((column, index) => allowed.has(column) ? [[column, cells[index].trim()]] : []));
      visit(values, line, order);
    });
  }
  const customers: Customer[] = [];
  const customerIds = new Set<string>();
  read("customers.csv", files.customers, ["id","name"], ["phone","terms_days"], (row, line) => {
    const issues: string[] = [];
    if (!/^[a-z0-9-]{1,24}$/.test(row.id)) issues.push("Invalid customer id");
    if (customerIds.has(row.id)) issues.push("Duplicate customer id");
    customerIds.add(row.id);
    if (!row.name || row.name.length > 40) issues.push("Invalid name");
    if (row.terms_days && (!/^-?\d+$/.test(row.terms_days) || !Number.isSafeInteger(Number(row.terms_days)))) issues.push("Invalid terms_days");
    for (const issue of issues) error("customers.csv", line, issue);
    if (!issues.length) customers.push({ id: row.id, name: row.name, phone: row.phone || undefined, terms_days: row.terms_days ? Number(row.terms_days) : undefined });
  });
  const transactions: Transaction[] = [];
  const ids = new Set<string>();
  let excluded = 0;
  read("transactions.csv", files.transactions, ["id","date","customer_id","type","amount"], ["note","due_date","method","reference"], (row, line, order) => {
    const issues: string[] = [];
    function attempt<T>(fn: () => T): T | undefined {
      try { return fn(); } catch (cause) { issues.push((cause as Error).message); }
    }
    if (!row.id || row.id.length > 20) issues.push("Invalid transaction id");
    if (ids.has(row.id)) issues.push("Duplicate transaction id");
    ids.add(row.id);
    if (!customerIds.has(row.customer_id)) issues.push("Unknown customer");
    if (row.type !== "sale" && row.type !== "payment") issues.push("Invalid transaction type");
    const date = attempt(() => day(row.date));
    const amount = minorUnits === undefined ? undefined : attempt(() => parseAmount(row.amount, minorUnits));
    let due: number | undefined;
    if (row.due_date && row.type === "payment") warnings.push("transactions.csv row " + line + ": Ignored due_date on payment");
    if (row.due_date && row.type === "sale") due = attempt(() => day(row.due_date));
    if (date !== undefined && due !== undefined && due < date) issues.push("Due date before sale date");
    if (row.note) attempt(() => text(row.note, "note", 60));
    if (row.method) attempt(() => text(row.method, "method", 20));
    if (row.reference) attempt(() => text(row.reference, "reference", 24));
    if (row.type === "sale" && (row.method || row.reference)) issues.push("Method and reference are payment-only");
    for (const issue of issues) error("transactions.csv", line, issue);
    if (issues.length || date === undefined || amount === undefined) return;
    if (date > asOf) {
      excluded++;
      return;
    }
    transactions.push({ id: row.id, customer_id: row.customer_id, date, amount, type: row.type as Transaction["type"], order, sourceLine: line,
      due_date: due, note: row.note || undefined, method: row.method || undefined, reference: row.reference || undefined });
  });
  if (excluded) warnings.push(excluded + " transaction(s) after the as-of date excluded");
  return { errors, warnings, excluded, shop, customers, transactions };
}
