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

test("runPrompt prepends memory context when enabled", async () => {
  let prompt = "";
  await runPrompt(baseRequest, {
    buildMemoryContext: async () => "[Whitey project memory]\ntech stack: TypeScript",
    execute: async (input) => {
      prompt = input.prompt;
      return { exitCode: 0, stdout: "ok", stderr: "" };
    }
  });

  assert.match(prompt, /^\[Whitey project memory\]/);
  assert.match(prompt, /\[User request\]\nhello$/);
});

test("runPrompt skips memory context when disabled in request", async () => {
  let prompt = "";
  await runPrompt({ ...baseRequest, useMemoryContext: false }, {
    buildMemoryContext: async () => "[Whitey project memory]\ntech stack: TypeScript",
    execute: async (input) => {
      prompt = input.prompt;
      return { exitCode: 0, stdout: "ok", stderr: "" };
    }
  });

  assert.equal(prompt, "hello");
});

test("runPrompt uses startupContext when provided", async () => {
  let prompt = "";
  await runPrompt({ ...baseRequest, startupContext: "[Whitey execution session]\nsession id: test-1" }, {
    buildMemoryContext: async () => "[Whitey project memory]\ntech stack: TypeScript",
    execute: async (input) => {
      prompt = input.prompt;
      return { exitCode: 0, stdout: "ok", stderr: "" };
    }
  });

  assert.match(prompt, /^\[Whitey execution session\]/);
  assert.match(prompt, /\[User request\]\nhello$/);
  assert.doesNotMatch(prompt, /\[Whitey project memory\]/);
});

test("runPrompt returns validation_error for malformed memory context source", async () => {
  const result = await runPrompt(baseRequest, {
    buildMemoryContext: async () => {
      throw new SyntaxError("Invalid JSON");
    },
    execute: async () => ({ exitCode: 0, stdout: "ok", stderr: "" })
  });

  assert.equal(result.status, "validation_error");
  assert.equal(result.exitCode, 2);
  assert.equal(result.summary, "Invalid project memory JSON.");
});
