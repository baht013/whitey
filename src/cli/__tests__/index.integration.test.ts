import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { mkdtemp, writeFile, chmod, readFile, mkdir } from "node:fs/promises";
import { runCli } from "../index.js";
import { withEnv } from "../../test-support/env.js";

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

  await withEnv({ WHITEY_COPILOT_CMD: mockCopilot, WHITEY_COPILOT_ARGS_TEMPLATE: undefined }, async () => {
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
  });
});

test("status command json mode reports unauthenticated state", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "whitey-status-json-"));
  const mockCopilot = await createMockCopilot();

  await withEnv({ WHITEY_COPILOT_CMD: mockCopilot, MOCK_AUTH_MODE: "unauthenticated" }, async () => {
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
  });
});

test("history command json mode returns structured entries", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "whitey-history-json-"));
  const mockCopilot = await createMockCopilot();

  await withEnv({ WHITEY_COPILOT_CMD: mockCopilot, WHITEY_COPILOT_ARGS_TEMPLATE: undefined }, async () => {
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
  });
});

test("run injects memory context by default and preserves original history prompt", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "whitey-run-memory-"));
  const mockCopilot = await createMockCopilot();
  await mkdir(path.join(cwd, ".whitey", "memory"), { recursive: true });
  await writeFile(
    path.join(cwd, ".whitey", "memory", "project-memory.json"),
    JSON.stringify(
      {
        techStack: "TypeScript",
        conventions: "Keep handlers pure",
        build: "npm run build",
        directives: [{ directive: "Always run tests", priority: "high", timestamp: new Date().toISOString() }],
        notes: [{ category: "ops", content: "Ship quickly", timestamp: new Date().toISOString() }]
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(path.join(cwd, ".whitey", "memory", "notepad.md"), "## PRIORITY\nFinish this today\n", "utf8");

  await withEnv({ WHITEY_COPILOT_CMD: mockCopilot, WHITEY_COPILOT_ARGS_TEMPLATE: undefined }, async () => {
    const captured = await withCapturedOutput(() => runCli(["run", "ship release", "--yes", "--json"], cwd));
    assert.equal(captured.result, 0);
    const payload = JSON.parse(captured.stdout.trim()) as { result: { stdout: string } };
    assert.match(payload.result.stdout, /\[Whitey execution session\]/);
    assert.match(payload.result.stdout, /\[Whitey project memory\]/);
    assert.match(payload.result.stdout, /\[Whitey priority notes\]/);
    assert.match(payload.result.stdout, /\[User request\]\nship release/);

    const historyRaw = await readFile(path.join(cwd, ".whitey", "history.jsonl"), "utf8");
    assert.match(historyRaw, /ship release/);
    assert.doesNotMatch(historyRaw, /\[Whitey project memory\]/);
  });
});

test("run --no-memory bypasses memory context injection", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "whitey-run-no-memory-"));
  const mockCopilot = await createMockCopilot();
  await mkdir(path.join(cwd, ".whitey", "memory"), { recursive: true });
  await writeFile(path.join(cwd, ".whitey", "memory", "project-memory.json"), "{\"techStack\":\"TypeScript\"}", "utf8");

  await withEnv({ WHITEY_COPILOT_CMD: mockCopilot, WHITEY_COPILOT_ARGS_TEMPLATE: undefined }, async () => {
    const captured = await withCapturedOutput(() => runCli(["run", "plain prompt", "--yes", "--no-memory", "--json"], cwd));
    assert.equal(captured.result, 0);
    const payload = JSON.parse(captured.stdout.trim()) as { result: { stdout: string } };
    assert.match(payload.result.stdout, /\[Whitey execution session\]/);
    assert.match(payload.result.stdout, /\[User request\]\nplain prompt/);
    assert.doesNotMatch(payload.result.stdout, /\[Whitey project memory\]/);
    assert.equal(existsSync(path.join(cwd, ".whitey", "memory", "notepad.md")), false);
  });
});

test("run turn-complete plugin context includes bounded metadata and memoryEnabled toggle", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "whitey-run-hook-context-"));
  const mockCopilot = await createMockCopilot();
  await mkdir(path.join(cwd, ".whitey", "hooks"), { recursive: true });
  await writeFile(
    path.join(cwd, ".whitey", "hooks", "capture-context.mjs"),
    `export async function onHookEvent(event, sdk) {
  if (event.event !== "turn-complete") return;
  await sdk.state.write("turn-context", event.context || {});
}`,
    "utf8"
  );

  await withEnv({ WHITEY_COPILOT_CMD: mockCopilot, WHITEY_COPILOT_ARGS_TEMPLATE: undefined }, async () => {
    const enabledRun = await withCapturedOutput(() => runCli(["run", "context on", "--yes", "--json"], cwd));
    assert.equal(enabledRun.result, 0);
    const enabledContext = JSON.parse(
      await readFile(path.join(cwd, ".whitey", "plugin-state", "capture-context", "turn-context.json"), "utf8")
    ) as { memoryEnabled: boolean; transcriptPath: string; promptPreview: string; durationMs: number };
    assert.equal(enabledContext.memoryEnabled, true);
    assert.match(enabledContext.transcriptPath, /\.whitey\/runs\//);
    assert.equal(typeof enabledContext.promptPreview, "string");
    assert.equal(typeof enabledContext.durationMs, "number");

    const disabledRun = await withCapturedOutput(() => runCli(["run", "context off", "--yes", "--no-memory", "--json"], cwd));
    assert.equal(disabledRun.result, 0);
    const disabledContext = JSON.parse(
      await readFile(path.join(cwd, ".whitey", "plugin-state", "capture-context", "turn-context.json"), "utf8")
    ) as { memoryEnabled: boolean };
    assert.equal(disabledContext.memoryEnabled, false);
  });
});

test("run auto memory capture writes when enabled and skips with --no-memory", async () => {
  const cwdEnabled = await mkdtemp(path.join(os.tmpdir(), "whitey-run-auto-memory-on-"));
  const cwdDisabled = await mkdtemp(path.join(os.tmpdir(), "whitey-run-auto-memory-off-"));
  const mockCopilot = await createMockCopilot();

  await withEnv({ WHITEY_COPILOT_CMD: mockCopilot, WHITEY_COPILOT_ARGS_TEMPLATE: undefined }, async () => {
    const onRun = await withCapturedOutput(() =>
      runCli(
        [
          "run",
          "Decision: Use sdk.memory for durable notes\nArchitecture: Keep runtime hook dispatch centralized\nConvention: Keep memory writes bounded",
          "--yes",
          "--json"
        ],
        cwdEnabled
      )
    );
    assert.equal(onRun.result, 0);
    const projectMemory = await readFile(path.join(cwdEnabled, ".whitey", "memory", "project-memory.json"), "utf8");
    assert.match(projectMemory, /Use sdk.memory for durable notes/);
    assert.match(projectMemory, /Keep runtime hook dispatch centralized/);
    assert.match(projectMemory, /Keep memory writes bounded/);

    const offRun = await withCapturedOutput(
      () =>
        runCli(
          ["run", "Decision: This should not persist when disabled", "--yes", "--no-memory", "--json"],
          cwdDisabled
        )
    );
    assert.equal(offRun.result, 0);
    assert.equal(existsSync(path.join(cwdDisabled, ".whitey", "memory", "project-memory.json")), false);
    assert.equal(existsSync(path.join(cwdDisabled, ".whitey", "memory", "notepad.md")), false);
  });
});

test("run creates lifecycle logs and clears active session pointer on close", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "whitey-run-lifecycle-"));
  const mockCopilot = await createMockCopilot();

  await withEnv({ WHITEY_COPILOT_CMD: mockCopilot, WHITEY_COPILOT_ARGS_TEMPLATE: undefined }, async () => {
    const captured = await withCapturedOutput(() => runCli(["run", "capture lifecycle", "--yes", "--json"], cwd));
    assert.equal(captured.result, 0);
  });

  await assert.rejects(readFile(path.join(cwd, ".whitey", "state", "session.json"), "utf8"));
  const sessionHistory = await readFile(path.join(cwd, ".whitey", "logs", "session-history.jsonl"), "utf8");
  assert.match(sessionHistory, /"type":"start"/);
  assert.match(sessionHistory, /"type":"close"/);
});

test("project-memory command writes and reads project memory", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "whitey-project-memory-cli-"));

  const writeCaptured = await withCapturedOutput(() =>
    runCli(["project-memory", "write", "--input", "{\"memory\":{\"techStack\":\"TypeScript\"}}", "--json"], cwd)
  );
  assert.equal(writeCaptured.result, 0);

  const readCaptured = await withCapturedOutput(() => runCli(["project-memory", "read", "--json"], cwd));
  assert.equal(readCaptured.result, 0);
  const payload = JSON.parse(readCaptured.stdout.trim()) as { ok: boolean; result: { techStack: string } };
  assert.equal(payload.ok, true);
  assert.equal(payload.result.techStack, "TypeScript");
});

test("agents-init creates managed file and preserves manual section on refresh", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "whitey-agents-init-"));

  const firstRun = await withCapturedOutput(() => runCli(["agents-init", "--json"], cwd));
  assert.equal(firstRun.result, 0);
  const firstPayload = JSON.parse(firstRun.stdout.trim()) as { target: string };
  const original = await readFile(firstPayload.target, "utf8");
  const manualReplaced = original.replace(
    "<!-- WHITEY_MANUAL_START -->\nAdd project-specific manual notes below. This section is preserved on refresh.\n<!-- WHITEY_MANUAL_END -->",
    "<!-- WHITEY_MANUAL_START -->\nKeep this manual note.\n<!-- WHITEY_MANUAL_END -->"
  );
  await writeFile(firstPayload.target, manualReplaced, "utf8");

  const secondRun = await withCapturedOutput(() => runCli(["agents-init", "--json"], cwd));
  assert.equal(secondRun.result, 0);
  const secondPayload = JSON.parse(secondRun.stdout.trim()) as { backup: string | null };
  assert.ok(secondPayload.backup);
  const refreshed = await readFile(firstPayload.target, "utf8");
  assert.match(refreshed, /Keep this manual note\./);
});
