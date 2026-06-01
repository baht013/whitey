import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { persistRun, readHistory } from "./history.js";
import type { RunResult } from "../types.js";

async function makeTempCwd(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "whitey-test-"));
}

function makeResult(index: number): RunResult {
  const startedAt = new Date(Date.now() + index).toISOString();
  return {
    status: "success",
    exitCode: 0,
    startedAt,
    endedAt: startedAt,
    durationMs: index,
    summary: `ok ${index}`,
    stdout: "",
    stderr: ""
  };
}

test("persistRun writes history and readHistory returns latest first", async () => {
  const cwd = await makeTempCwd();

  await persistRun(cwd, "first prompt", makeResult(1));
  await persistRun(cwd, "second prompt", makeResult(2));

  const entries = await readHistory(cwd, 2);
  assert.equal(entries.length, 2);
  assert.equal(entries[0]?.promptPreview, "second prompt");
  assert.equal(entries[1]?.promptPreview, "first prompt");
});

test("readHistory returns empty array for missing store", async () => {
  const cwd = await makeTempCwd();
  const entries = await readHistory(cwd, 5);
  assert.deepEqual(entries, []);
});
