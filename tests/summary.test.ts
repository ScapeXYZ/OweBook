import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

test("S7 sample summary-only command writes one file byte-identical to build", async () => {
  const root = await mkdtemp(join(tmpdir(), "owebook-summary-"));
  const input = ["--data", "data/sample", "--as-of", "2026-11-20"];
  function run(script: string, out: string) {
    const result = spawnSync(process.execPath, ["--import", "tsx", script, ...input, "--out", out], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.error?.message || "Process failed");
  }
  try {
    const summary = join(root, "only", "summary.json");
    const output = join(root, "build");
    run("scripts/summary.ts", summary);
    run("scripts/build.tsx", output);
    assert.deepEqual(await readdir(join(root, "only")), ["summary.json"]);
    assert.deepEqual(await readFile(summary), await readFile(join(output, "summary.json")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
