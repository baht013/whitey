import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, writeFile, chmod, readFile } from "node:fs/promises";
import { runCli } from "../index.js";

async function createMockCopilot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "whitey-cli-"));
  const scriptPath = path.join(dir, "mock-copilot.mjs");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === '--version') {
  console.log('mock-copilot 1.0.0');
  process.exit(0);
}
if (args[0] === 'auth' && args[1] === 'status') {
  if (process.env.MOCK_AUTH_MODE === 'unauthenticated') {
    console.error('Not logged in.');
    process.exit(1);
  }
  console.log('Authenticated session active.');
  process.exit(0);
}
if (args[0] === '--prompt') {
  const prompt = args.slice(1).join(' ');
  if (process.env.MOCK_RUN_MODE === 'fail') {
    console.error('error: mocked run failure');
    process.exit(2);
  }
  console.log('MOCK_RESPONSE:' + prompt);
  process.exit(0);
}
console.error('Unsupported command', args.join(' '));
process.exit(2);
`;

  await writeFile(scriptPath, script, "utf8");
  await chmod(scriptPath, 0o755);
  return scriptPath;
}

async function withCapturedOutput<T>(fn: () => Promise<T>): Promise<{ result: T; stdout: string; stderr: string }> {
  const stdoutWrite = process.stdout.write.bind(process.stdout);
  const stderrWrite = process.stderr.write.bind(process.stderr);
  let stdout = "";
  let stderr = "";

  (process.stdout.write as unknown as (chunk: string | Uint8Array) => boolean) = (chunk) => {
    stdout += chunk.toString();
    return true;
  };
  (process.stderr.write as unknown as (chunk: string | Uint8Array) => boolean) = (chunk) => {
    stderr += chunk.toString();
    return true;
  };

  try {
    const result = await fn();
    return { result, stdout, stderr };
  } finally {
    (process.stdout.write as unknown as typeof process.stdout.write) = stdoutWrite;
    (process.stderr.write as unknown as typeof process.stderr.write) = stderrWrite;
  }
}

test("run command json mode returns structured payload and persists history", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "whitey-run-"));
  const mockCopilot = await createMockCopilot();
  const prevCmd = process.env.WHITEY_COPILOT_CMD;
  process.env.WHITEY_COPILOT_CMD = mockCopilot;
  delete process.env.WHITEY_COPILOT_ARGS_TEMPLATE;

  const captured = await withCapturedOutput(() => runCli(["run", "hello integration", "--yes", "--json"], cwd));
  assert.equal(captured.result, 0);

  const payload = JSON.parse(captured.stdout.trim()) as {
    command: string;
    ok: boolean;
    result: { status: string };
    record: { id: string };
  };
  assert.equal(payload.command, "run");
  assert.equal(payload.ok, true);
  assert.equal(payload.result.status, "success");
  assert.ok(payload.record.id.length > 0);

  const historyRaw = await readFile(path.join(cwd, ".whitey", "history.jsonl"), "utf8");
  assert.match(historyRaw, /hello integration/);

  if (prevCmd === undefined) {
    delete process.env.WHITEY_COPILOT_CMD;
  } else {
    process.env.WHITEY_COPILOT_CMD = prevCmd;
  }
});

test("status command json mode reports unauthenticated state", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "whitey-status-json-"));
  const mockCopilot = await createMockCopilot();
  const prevCmd = process.env.WHITEY_COPILOT_CMD;
  const prevAuth = process.env.MOCK_AUTH_MODE;

  process.env.WHITEY_COPILOT_CMD = mockCopilot;
  process.env.MOCK_AUTH_MODE = "unauthenticated";

  const captured = await withCapturedOutput(() => runCli(["status", "--json"], cwd));
  assert.equal(captured.result, 1);

  const payload = JSON.parse(captured.stdout.trim()) as {
    command: string;
    ok: boolean;
    report: { authenticated: boolean; commandAvailable: boolean };
  };
  assert.equal(payload.command, "status");
  assert.equal(payload.ok, false);
  assert.equal(payload.report.commandAvailable, true);
  assert.equal(payload.report.authenticated, false);

  if (prevCmd === undefined) {
    delete process.env.WHITEY_COPILOT_CMD;
  } else {
    process.env.WHITEY_COPILOT_CMD = prevCmd;
  }

  if (prevAuth === undefined) {
    delete process.env.MOCK_AUTH_MODE;
  } else {
    process.env.MOCK_AUTH_MODE = prevAuth;
  }
});

test("history command json mode returns structured entries", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "whitey-history-json-"));
  const mockCopilot = await createMockCopilot();
  const prevCmd = process.env.WHITEY_COPILOT_CMD;
  process.env.WHITEY_COPILOT_CMD = mockCopilot;
  delete process.env.WHITEY_COPILOT_ARGS_TEMPLATE;

  await withCapturedOutput(() => runCli(["run", "first history record", "--yes", "--json"], cwd));
  const captured = await withCapturedOutput(() => runCli(["history", "--limit", "5", "--json"], cwd));

  assert.equal(captured.result, 0);
  const payload = JSON.parse(captured.stdout.trim()) as {
    command: string;
    count: number;
    entries: Array<{ promptPreview: string }>;
  };
  assert.equal(payload.command, "history");
  assert.ok(payload.count >= 1);
  assert.match(payload.entries[0]?.promptPreview || "", /first history record/);

  if (prevCmd === undefined) {
    delete process.env.WHITEY_COPILOT_CMD;
  } else {
    process.env.WHITEY_COPILOT_CMD = prevCmd;
  }
});
