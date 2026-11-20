import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";
import { render, validate, type Diagnostic } from "@hyper-elements/react";
import { renderPdf } from "@hyper-elements/react/pdf";
import { renderImage } from "@hyper-elements/react/image";
import { emailClients } from "@hyper-elements/email-clients";
import { lint } from "@hyper-elements/lint";
import { loadSummary } from "./load-summary.js";
import Ledger from "../templates/ledger.js";
import Statement from "../templates/statement.js";
import Reminder from "../templates/reminder.js";
import Receipt from "../templates/receipt.js";
import { checkContrast } from "./contrast.js";

async function main() {
  const { values } = parseArgs({ options: {
    data: { type: "string" }, "as-of": { type: "string" }, out: { type: "string" }, payment: { type: "string" }
  } });
  const { data, "as-of": date, out, payment: selected } = values;
  if (!data || !date || !out) throw new Error("--data, --as-of YYYY-MM-DD and --out are required");
  const summary = await loadSummary(data, date);
  const payments = summary.ledgers.flatMap(customer => {
    const payment = customer.entries.findLast(entry => entry.type === "payment" && (selected === undefined || entry.id === selected));
    return payment ? [{ customer, payment }] : [];
  });
  if (selected !== undefined && !payments.length) throw new Error("No payment with id " + selected);
  checkContrast();
  for (const folder of ["", "statements", "reminders", "receipts", "evidence"]) await mkdir(join(out, folder), { recursive: true });
  const save = (name: string, value: string | Uint8Array) => writeFile(join(out, name), value);
  const json = (name: string, value: unknown) => save(name, JSON.stringify(value, null, 2) + "\n");
  const fonts = await Promise.all([["Regular", 400], ["Bold", 700]].map(async ([style, weight]) => ({
    family: "Lato", weight: Number(weight), src: await readFile(new URL("../fonts/Lato-" + style + ".ttf", import.meta.url))
  })));
  const faces = fonts.map((font, i) => ({
    family: font.family, weight: font.weight, format: "truetype" as const,
    src: relative(out, join("fonts", "Lato-" + (i ? "Bold" : "Regular") + ".ttf")).replaceAll("\\", "/")
  }));
  const receiptFaces = faces.map(face => ({ ...face, src: "../" + face.src }));
  const plugins = [lint(), await emailClients()];
  const checks: { file: string; source: string; diagnostics: Diagnostic[] }[] = [];
  const record = (file: string, source: string, diagnostics: Diagnostic[]) => {
    checks.push({ file, source, diagnostics });
  };
  const ledger = await render(<Ledger summary={summary} fonts={faces} />, { plugins });
  record("ledger.html", "Hyper Elements render with lint and email-client checks", ledger.diagnostics);
  await save("ledger.html", ledger.html);
  await save("ledger.txt", ledger.text);
  for (const customer of summary.ledgers) {
    const name = "statements/" + customer.id + ".pdf";
    const element = <Statement summary={summary} customer={customer} />;
    const validation = validate(element);
    record(name, "Hyper Elements validate", validation.diagnostics);
    if (!validation.valid) {
      await json("evidence/diagnostics.json", checks);
      throw new Error("Document validation failed for " + name);
    }
    const pdf = await renderPdf(element, { fonts, date: new Date(date + "T00:00:00Z") });
    record(name, "Hyper Elements renderPdf", pdf.diagnostics);
    await save(name, pdf.pdf);
    if (customer.tier !== "none") {
      const name = "reminders/" + customer.id + "-square.png";
      const element = <Reminder summary={summary} customer={customer} />;
      const result = await renderImage(element, { fonts });
      record(name, "Hyper Elements renderImage", result.diagnostics);
      await save(name, result.image);
    }
  }
  for (const { customer, payment } of payments) {
    // Encode filename metacharacters while preserving the payment ID inside the receipt.
    const stem = "receipts/" + Array.from(payment.id, char => /^[a-zA-Z0-9_-]$/.test(char) ? char : "~" + char.codePointAt(0)!.toString(16) + "~").join("");
    const result = await render(<Receipt summary={summary} customer={customer} payment={payment} fonts={receiptFaces} />, { plugins });
    record(stem + ".html", "Hyper Elements render with lint and email-client checks", result.diagnostics);
    await save(stem + ".html", result.html);
    await save(stem + ".txt", result.text);
  }
  await json("summary.json", summary);
  await json("evidence/diagnostics.json", checks);
  const diagnostics = checks.flatMap(check => check.diagnostics);
  console.log(JSON.stringify({ checked: checks.length, errors: diagnostics.filter(d => d.severity === "error").length,
    warnings: diagnostics.filter(d => d.severity === "warning").length, info: diagnostics.filter(d => d.severity === "info").length }));
  if (diagnostics.some(d => d.severity === "error")) throw new Error("Hyper Elements errors in output diagnostics");
}
main().catch(cause => {
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
});
