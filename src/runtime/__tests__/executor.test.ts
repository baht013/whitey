import test from "node:test";
import assert from "node:assert/strict";
import { runPrompt } from "../executor.js";
import type { RunRequest } from "../../types/index.js";

const baseRequest: RunRequest = {
  prompt: "hello",
  cwd: process.cwd(),
  timeoutMs: 1000,
  verbose: false
};

test("runPrompt returns validation_error for empty prompt", async () => {
  const result = await runPrompt({ ...baseRequest, prompt: "   " });
  assert.equal(result.status, "validation_error");
  assert.equal(result.exitCode, 2);
});

test("runPrompt returns success on clean executor result", async () => {
  const result = await runPrompt(baseRequest, {
    execute: async () => ({ exitCode: 0, stdout: "done", stderr: "" })
  });

  assert.equal(result.status, "success");
  assert.equal(result.exitCode, 0);
  assert.equal(result.summary, "Execution completed.");
});

test("runPrompt marks textual failures as executor_error", async () => {
  const result = await runPrompt(baseRequest, {
    execute: async () => ({
      exitCode: 0,
      stdout: "",
      stderr: "error: Invalid command format. Try 'copilot --help'"
    })
  });

  assert.equal(result.status, "executor_error");
  assert.equal(result.exitCode, 1);
});

test("runPrompt preserves non-zero executor exit code", async () => {
  const result = await runPrompt(baseRequest, {
    execute: async () => ({ exitCode: 124, stdout: "", stderr: "timeout" })
  });

  assert.equal(result.status, "executor_error");
  assert.equal(result.exitCode, 124);
});
