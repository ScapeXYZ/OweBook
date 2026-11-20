import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { loadSummary } from "./load-summary.js";

async function main() {
  const { values: { data, "as-of": date, out } } = parseArgs({ options: {
    data: { type: "string" }, "as-of": { type: "string" }, out: { type: "string" }
  } });
  if (!data || !date || !out) throw new Error("--data, --as-of YYYY-MM-DD and --out are required");
  const summary = await loadSummary(data, date);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(summary, null, 2) + "\n");
}

main().catch((cause: unknown) => {
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
});
