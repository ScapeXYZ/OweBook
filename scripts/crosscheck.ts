import { spawnSync } from "node:child_process";

const candidates: [string, string[]][] = [["python3", []], ["python", []], ["py", ["-3"]]];
const required = process.argv.includes("--require-python");
const available = candidates.find(([command, args]) =>
  spawnSync(command, [...args, "-c", "import sys; sys.exit(sys.version_info.major != 3)"], { stdio: "ignore" }).status === 0);
if (available) {
  const [command, args] = available;
  const flags = process.argv.slice(2).filter(argument => argument !== "--require-python");
  const result = spawnSync(command, [...args, "verification/crosscheck.py", ...flags], { stdio: "inherit" });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
} else if (required) {
  console.error("Full verification requires Python 3 on PATH.");
  process.exitCode = 1;
} else {
  console.log("Skipping OweBook cross-check: Python 3 is unavailable.");
}
