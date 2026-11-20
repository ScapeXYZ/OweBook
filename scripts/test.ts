import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const tests = readdirSync("tests", { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith(".test.ts"))
  .map(entry => join("tests", entry.name))
  .sort();

if (tests.length === 0) throw new Error("No tests/*.test.ts files found");
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...tests], { stdio: "inherit" });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
