import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, writeFile, chmod } from "node:fs/promises";
import { getCopilotStatus } from "../status.js";

async function createMockCopilot(mode: "authenticated" | "unauthenticated"): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "whitey-status-"));
  const scriptPath = path.join(dir, "mock-copilot.mjs");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === '--version') {
  console.log('mock-copilot 1.0.0');
  process.exit(0);
}
if (args[0] === 'auth' && args[1] === 'status') {
  if ('${mode}' === 'authenticated') {
    console.log('You are logged in.');
    process.exit(0);
  }
  console.error('Not logged in. Please run auth login.');
  process.exit(1);
}
console.error('Unsupported command', args.join(' '));
process.exit(2);
`;

  await writeFile(scriptPath, script, "utf8");
  await chmod(scriptPath, 0o755);
  return scriptPath;
}

test("getCopilotStatus detects authenticated state", async () => {
  const cmd = await createMockCopilot("authenticated");
  const previous = process.env.WHITEY_COPILOT_CMD;
  process.env.WHITEY_COPILOT_CMD = cmd;

  const report = await getCopilotStatus(process.cwd());
  assert.equal(report.commandAvailable, true);
  assert.equal(report.authChecked, true);
  assert.equal(report.authenticated, true);

  if (previous === undefined) {
    delete process.env.WHITEY_COPILOT_CMD;
  } else {
    process.env.WHITEY_COPILOT_CMD = previous;
  }
});

test("getCopilotStatus detects unauthenticated state", async () => {
  const cmd = await createMockCopilot("unauthenticated");
  const previous = process.env.WHITEY_COPILOT_CMD;
  process.env.WHITEY_COPILOT_CMD = cmd;

  const report = await getCopilotStatus(process.cwd());
  assert.equal(report.commandAvailable, true);
  assert.equal(report.authChecked, true);
  assert.equal(report.authenticated, false);
  assert.match(report.authHint, /unauthenticated|login/i);

  if (previous === undefined) {
    delete process.env.WHITEY_COPILOT_CMD;
  } else {
    process.env.WHITEY_COPILOT_CMD = previous;
  }
});
