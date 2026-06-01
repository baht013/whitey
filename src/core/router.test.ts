import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "./router.js";

test("parseArgs defaults to help when run has no prompt", () => {
  const parsed = parseArgs(["run"]);
  assert.equal(parsed.command, "help");
});

test("parseArgs parses run flags and prompt", () => {
  const parsed = parseArgs(["run", "--timeout-ms", "5000", "--yes", "fix", "bug"]);
  assert.equal(parsed.command, "run");
  assert.equal(parsed.timeoutMs, 5000);
  assert.equal(parsed.assumeYes, true);
  assert.equal(parsed.prompt, "fix bug");
});

test("parseArgs parses history limit", () => {
  const parsed = parseArgs(["history", "--limit", "3"]);
  assert.equal(parsed.command, "history");
  assert.equal(parsed.historyLimit, 3);
});

test("parseArgs rejects unknown options", () => {
  assert.throws(() => parseArgs(["run", "--wat"]), /Unknown option/);
});

test("parseArgs supports -- separator for prompt that starts with hyphen", () => {
  const parsed = parseArgs(["run", "--", "--complex", "prompt"]);
  assert.equal(parsed.command, "run");
  assert.equal(parsed.prompt, "--complex prompt");
});

test("parseArgs rejects command-specific flag misuse", () => {
  assert.throws(() => parseArgs(["status", "--limit", "2"]), /only valid with history/);
});
