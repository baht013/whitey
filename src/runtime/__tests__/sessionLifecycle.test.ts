import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildWhiteySessionStartContext,
  closeWhiteySession,
  isWhiteySessionUsable,
  readWhiteySession,
  startWhiteySession
} from "../sessionLifecycle.js";

test("startWhiteySession writes session pointer and lifecycle logs", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "whitey-session-"));
  const session = await startWhiteySession(cwd, { provider: "copilot-cli" });

  const current = await readWhiteySession(cwd);
  assert.equal(current?.sessionId, session.sessionId);
  assert.equal(isWhiteySessionUsable(current, cwd), true);

  const logsDir = join(cwd, ".whitey", "logs");
  const files = await readdir(logsDir);
  assert.ok(files.some((entry) => entry.startsWith("lifecycle-")));
  const sessionHistory = await readFile(join(logsDir, "session-history.jsonl"), "utf8");
  assert.match(sessionHistory, /"type":"start"/);
});

test("buildWhiteySessionStartContext includes execution and memory sections", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "whitey-session-context-"));
  await mkdir(join(cwd, ".whitey", "memory"), { recursive: true });
  await writeFile(join(cwd, ".whitey", "memory", "project-memory.json"), "{\"techStack\":\"TypeScript\"}", "utf8");
  await writeFile(join(cwd, ".whitey", "memory", "notepad.md"), "## PRIORITY\nTest priority\n", "utf8");

  const session = await startWhiteySession(cwd);
  const context = await buildWhiteySessionStartContext(cwd, session, { useMemoryContext: true });
  assert.match(context.text, /\[Whitey execution session\]/);
  assert.match(context.text, /\[Whitey project memory\]/);
  assert.match(context.text, /\[Whitey priority notes\]/);
  assert.equal(context.memoryEnabled, true);
  assert.ok(context.memorySources.length >= 2);
  assert.ok(context.memorySections.some((section) => section.name === "project.techStack"));
  assert.ok(context.memorySections.some((section) => section.name === "notepad.priority"));

  const lifecycleRaw = await readFile(join(cwd, ".whitey", "logs", `lifecycle-${new Date().toISOString().slice(0, 10)}.jsonl`), "utf8");
  assert.match(lifecycleRaw, /"event":"context-build"/);
  assert.match(lifecycleRaw, /"memorySources"/);
});

test("buildWhiteySessionStartContext returns empty memory metadata when memory is disabled", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "whitey-session-context-no-memory-"));
  const session = await startWhiteySession(cwd);
  const context = await buildWhiteySessionStartContext(cwd, session, { useMemoryContext: false });
  assert.equal(context.memoryEnabled, false);
  assert.equal(context.memorySources.length, 0);
  assert.equal(context.memorySections.length, 0);
});

test("closeWhiteySession removes owned pointer and appends working-memory summary", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "whitey-session-close-"));
  const session = await startWhiteySession(cwd);

  await closeWhiteySession(
    cwd,
    session.sessionId,
    { status: "success", exitCode: 0, summary: "done", runId: "run-1" },
    { useMemoryContext: true }
  );

  const state = await readWhiteySession(cwd);
  assert.equal(state, null);

  const notepad = await readFile(join(cwd, ".whitey", "memory", "notepad.md"), "utf8");
  assert.match(notepad, /session-close status=success exit_code=0 run_id=run-1/);
});

test("closeWhiteySession keeps pointer when closing session does not own it", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "whitey-session-close-mismatch-"));
  const session = await startWhiteySession(cwd);
  await closeWhiteySession(cwd, "other-session", { status: "runtime_error", exitCode: 1, summary: "no-op" }, { useMemoryContext: false });
  const current = await readWhiteySession(cwd);
  assert.equal(current?.sessionId, session.sessionId);
});
