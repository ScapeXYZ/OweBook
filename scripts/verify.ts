import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import type { Summary } from "../core/ledger.js";

const dataset = process.argv[2] ?? "data/sample";
const date = process.argv[3] ?? "2026-11-20";
const sample = process.argv[4] ?? "out/sample";
const isSample = process.argv[2] === undefined;
const screenshots = isSample ? "assets" : join(sample, "screenshots");
const evidence = join(sample, "evidence");
const cli = "node_modules/@hyper-elements/cli/dist/bin.js";
const run = (executable: string, args: string[], allowed = [0]) => {
  console.log("$", executable, ...args);
  const result = spawnSync(executable, args, { encoding: "utf8", windowsHide: true });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (!allowed.includes(result.status ?? -1)) throw new Error("Command exited " + result.status);
  return result.stdout;
};
const node = (args: string[]) => run(process.execPath, args);
const tsx = (...args: string[]) => node(["--import", "tsx", ...args]);
const poppler = (tool: string, ...args: string[]) => process.platform === "win32"
  ? run("wsl.exe", ["--exec", tool, ...args]) : run(tool, args);
const pdfPath = (file: string) => process.platform === "win32"
  ? run("wsl.exe", ["--exec", "wslpath", "-a", resolve(file).replaceAll("\\", "/")]).trim() : resolve(file);

async function main() {
  await mkdir(evidence, { recursive: true });
  await writeFile(join(evidence, "typecheck.txt"), node(["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]));
  await writeFile(join(evidence, "tests.txt"), tsx("--test", "tests/*.test.ts"));
  await writeFile(join(evidence, "contrast.txt"), tsx("scripts/contrast.ts"));
  await writeFile(join(evidence, "build.txt"), tsx("scripts/build.tsx", "--data", dataset, "--as-of", date, "--out", sample));
  // Statements are covered by the public validate() API and native ESM PDF renderer in build.tsx.
  const check = isSample
    ? node([cli, "check", "templates/ledger.tsx", "templates/reminder.tsx", "templates/receipt.tsx", "--rendered", "--json"])
    : await checkStress(summaryForCheck());
  await writeFile(join(evidence, "hyper-elements-check.jsonl"), check);
  const summary = JSON.parse(await readFile(join(sample, "summary.json"), "utf8")) as Summary;
  const statements = join(sample, "statements");
  const pdfs = (await readdir(statements)).filter(name => name.endsWith(".pdf") && summary.ledgers.some(customer => name === customer.id + ".pdf"));
  assert.equal(pdfs.length, summary.ledgers.length);
  const results: string[] = [];
  for (const pdf of pdfs) {
    const path = pdfPath(join(statements, pdf));
    const info = poppler("pdfinfo", path);
    const fontInfo = poppler("pdffonts", path);
    const text = poppler("pdftotext", "-enc", "UTF-8", path, "-");
    assert.match(info, /^Pages:\s+1\s*$/m, pdf);
    assert.match(info, /^Page size:.*\(A4\)/m, pdf);
    const fonts = fontInfo.trim().split("\n").slice(2);
    assert.ok(fonts.length > 0 && fonts.every(font => /^\S*Lato.*\byes\s+yes\s+yes\b/.test(font)), pdf);
    assert.ok(text.includes(summary.shop.currency.symbol), "Currency symbol missing in " + pdf);
    const customer = summary.ledgers.find(entry => pdf === entry.id + ".pdf")!;
    assert.ok(text.includes(customer.name) && text.includes("Prepared from"), "Incomplete statement " + pdf);
    results.push(pdf + "\n" + info + fontInfo + "Currency symbol present in pdftotext output.\n");
  }
  await writeFile(join(evidence, "poppler.txt"), results.join("\n"));
  await mkdir(screenshots, { recursive: true });
  const preview = isSample ? "c3" : summary.ledgers[0].id;
  poppler("pdftoppm", "-png", "-singlefile", "-r", "144",
    pdfPath(join(statements, preview + ".pdf")), pdfPath(join(screenshots, "statement")));
  if (summary.ledgers.find(customer => customer.id === preview)?.overdue) {
    await copyFile(join(sample, "reminders", preview + "-square.png"), join(screenshots, "reminder.png"));
  }
  const receipt = isSample ? "E015.html" : (await readdir(join(sample, "receipts"))).find(file => file.endsWith(".html"));
  await writeFile(join(evidence, "screenshots.txt"), tsx("scripts/screenshot.ts", sample, screenshots, ...(receipt ? [receipt] : []), ...(isSample ? [] : ["--wide"])));
}

async function summaryForCheck() {
  return JSON.parse(await readFile(join(sample, "summary.json"), "utf8")) as Summary;
}

async function checkStress(input: Promise<Summary>) {
  const summary = await input;
  const customer = summary.ledgers[0];
  const payment = customer.entries.findLast(entry => entry.type === "payment");
  const targets = [
    ["ledger", { summary }],
    ...(customer.overdue ? [["reminder", { summary, customer }]] : []),
    ...(payment ? [["receipt", { summary, customer, payment }]] : [])
  ] as const;
  let output = "";
  for (const [template, props] of targets) {
    const file = join(evidence, template + "-props.json");
    await writeFile(file, JSON.stringify(props));
    output += node([cli, "check", "templates/" + template + ".tsx", "--props", file, "--rendered", "--json"]);
  }
  return output;
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
