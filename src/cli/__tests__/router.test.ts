import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../router.js";

test("parseArgs defaults to help when run has no prompt", () => {
  const parsed = parseArgs(["run"]);
  assert.equal(parsed.command, "help");
});

test("parseArgs parses run flags and prompt", () => {
  const parsed = parseArgs(["run", "--timeout-ms", "5000", "--yes", "--json", "--no-memory", "fix", "bug"]);
  assert.equal(parsed.command, "run");
  assert.equal(parsed.timeoutMs, 5000);
  assert.equal(parsed.assumeYes, true);
  assert.equal(parsed.json, true);
  assert.equal(parsed.noMemory, true);
  assert.equal(parsed.prompt, "fix bug");
});

test("parseArgs parses history limit", () => {
  const parsed = parseArgs(["history", "--limit", "3", "--json"]);
  assert.equal(parsed.command, "history");
  assert.equal(parsed.historyLimit, 3);
  assert.equal(parsed.json, true);
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

test("parseArgs parses mcp-serve target", () => {
  const parsed = parseArgs(["mcp-serve", "memory"]);
  assert.equal(parsed.command, "mcp-serve");
  assert.equal(parsed.mcpServer, "memory");
});

test("parseArgs parses project-memory inputs", () => {
  const parsed = parseArgs(["project-memory", "write", "--input", "{\"memory\":{}}", "--json"]);
  assert.equal(parsed.command, "project-memory");
  assert.equal(parsed.memoryAction, "write");
  assert.equal(parsed.memoryInput, "{\"memory\":{}}");
  assert.equal(parsed.json, true);
});

test("parseArgs parses agents-init path and flags", () => {
  const parsed = parseArgs(["agents-init", "./repo", "--dry-run", "--force", "--verbose"]);
  assert.equal(parsed.command, "agents-init");
  assert.equal(parsed.agentsInitPath, "./repo");
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.force, true);
  assert.equal(parsed.verbose, true);
});
