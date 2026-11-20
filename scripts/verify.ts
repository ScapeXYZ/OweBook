import { access, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import type { Summary } from "../core/ledger.js";

const datasets = ["sample", "stress-max", "stress-min", "currency-usd", "currency-jpy"];
const date = "2026-11-20";
const cli = "node_modules/@hyper-elements/cli/dist/bin.js";
const run = (executable: string, args: string[]) => {
  console.log("$", executable, ...args);
  const result = spawnSync(executable, args, { encoding: "utf8", windowsHide: true });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(executable + " exited " + result.status);
  return result.stdout;
};
const node = (args: string[]) => run(process.execPath, args);
const tsx = (...args: string[]) => node(["--import", "tsx", ...args]);
const poppler = (tool: string, ...args: string[]) => process.platform === "win32"
  ? run("wsl.exe", ["--exec", tool, ...args]) : run(tool, args);
const pdfPath = (file: string) => process.platform === "win32"
  ? run("wsl.exe", ["--exec", "wslpath", "-a", resolve(file).replaceAll("\\", "/")]).trim() : resolve(file);

async function main() {
  const full = process.argv.includes("--full");
  const evidence = join("out", "sample", "evidence");
  await mkdir(evidence, { recursive: true });
  await writeFile(join(evidence, "typecheck.txt"), node(["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]));
  await writeFile(join(evidence, "tests.txt"), tsx("scripts/test.ts"));
  await writeFile(join(evidence, "contrast.txt"), tsx("scripts/contrast.ts"));
  for (const name of datasets) {
    const output = "out/" + name;
    const evidence = join(output, "evidence");
    await mkdir(evidence, { recursive: true });
    await writeFile(join(evidence, "build.txt"), tsx("scripts/build.tsx", "--data", "data/" + name, "--as-of", date, "--out", output));
    const summary = JSON.parse(await readFile(join(output, "summary.json"), "utf8")) as Summary;
    // build.tsx records public API validation for every statement.
    await writeFile(join(evidence, "hyper-elements-check.jsonl"), await checkTemplates(summary, evidence));
  }
  if (!full) return;

  for (const tool of ["pdfinfo", "pdffonts", "pdftotext", "pdftoppm"]) {
    try {
      poppler(tool, "-v");
    } catch (cause) {
      throw new Error("Full verification requires Poppler's " + tool + (process.platform === "win32" ? " in the default WSL distribution." : " on PATH."), { cause });
    }
  }
  const { chromium } = await import("playwright");
  try {
    await access(chromium.executablePath());
  } catch (cause) {
    throw new Error("Full verification requires Playwright Chromium. Run npm exec -- playwright install chromium.", { cause });
  }
  tsx("scripts/crosscheck.ts", "--require-python", "--sets", ...datasets, "--report", "out/full/crosscheck.json");
  for (const name of datasets) await inspectOutputs(name);
}

async function inspectOutputs(name: string) {
  const sample = "out/" + name;
  const evidence = join(sample, "evidence");
  const screenshots = join(sample, "screenshots");
  const isSample = name === "sample";
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

async function checkTemplates(summary: Summary, evidence: string) {
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
