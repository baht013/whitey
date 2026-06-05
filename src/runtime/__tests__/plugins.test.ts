import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { withEnv } from "../../test-support/env.js";
import { dispatchBuiltinRuntimeHooks, dispatchRuntimePluginEvent } from "../plugins.js";

test("dispatchRuntimePluginEvent runs local hook plugin and persists plugin state", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "whitey-plugin-"));
  const hooksPath = join(cwd, ".whitey", "hooks");
  await mkdir(hooksPath, { recursive: true });
  await writeFile(
    join(hooksPath, "capture.mjs"),
    `export async function onHookEvent(event, sdk) {
  await sdk.state.write("last-event", { event: event.event, session: event.session_id });
  await sdk.log.info("hook handled", { event: event.event });
}`,
    "utf8"
  );

  const result = await dispatchRuntimePluginEvent(cwd, "session-start", {
    sessionId: "session-1",
    context: { source: "test" }
  });
  assert.equal(result.loaded, 1);
  assert.equal(result.ran, 1);
  assert.equal(result.failures.length, 0);

  const state = JSON.parse(await readFile(join(cwd, ".whitey", "plugin-state", "capture", "last-event.json"), "utf8")) as {
    event: string;
    session: string;
  };
  assert.equal(state.event, "session-start");
  assert.equal(state.session, "session-1");
});

test("dispatchRuntimePluginEvent supports disabling plugins via env", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "whitey-plugin-disabled-"));
  await withEnv({ WHITEY_HOOK_PLUGINS: "0" }, async () => {
    const result = await dispatchRuntimePluginEvent(cwd, "session-start", {});
    assert.equal(result.loaded, 0);
    assert.equal(result.ran, 0);
  });
});

test("dispatchRuntimePluginEvent enforces plugin timeout", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "whitey-plugin-timeout-"));
  const hooksPath = join(cwd, ".whitey", "hooks");
  await mkdir(hooksPath, { recursive: true });
  await writeFile(
    join(hooksPath, "slow.mjs"),
    `export async function onHookEvent() {
  await new Promise((resolve) => setTimeout(resolve, 50));
}`,
    "utf8"
  );

  await withEnv({ WHITEY_HOOK_PLUGIN_TIMEOUT_MS: "10" }, async () => {
    const result = await dispatchRuntimePluginEvent(cwd, "session-start", {});
    assert.equal(result.loaded, 1);
    assert.equal(result.ran, 0);
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].error, /timed out/);
  });
});

test("dispatchRuntimePluginEvent exposes sdk.memory helpers for note and working writes", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "whitey-plugin-memory-write-"));
  const hooksPath = join(cwd, ".whitey", "hooks");
  await mkdir(hooksPath, { recursive: true });
  await writeFile(
    join(hooksPath, "memory-write.mjs"),
    `export async function onHookEvent(_event, sdk) {
  await sdk.memory.addNote("architecture", "Decision: Keep plugin SDK stable");
  await sdk.memory.writeWorking("Captured memory line");
}`,
    "utf8"
  );

  const result = await dispatchRuntimePluginEvent(cwd, "turn-complete", {
    context: { runId: "run-1", memoryEnabled: true }
  });
  assert.equal(result.failures.length, 0);

  const memoryRaw = await readFile(join(cwd, ".whitey", "memory", "project-memory.json"), "utf8");
  assert.match(memoryRaw, /Decision: Keep plugin SDK stable/);
  const notepadRaw = await readFile(join(cwd, ".whitey", "memory", "notepad.md"), "utf8");
  assert.match(notepadRaw, /Captured memory line/);
});

test("dispatchRuntimePluginEvent marks sdk.memory disabled and write helpers fail explicitly", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "whitey-plugin-memory-disabled-"));
  const hooksPath = join(cwd, ".whitey", "hooks");
  await mkdir(hooksPath, { recursive: true });
  await writeFile(
    join(hooksPath, "memory-disabled.mjs"),
    `export async function onHookEvent(_event, sdk) {
  await sdk.state.write("memory-enabled", sdk.memory.enabled);
  try {
    await sdk.memory.writeWorking("should fail");
  } catch (error) {
    await sdk.state.write("memory-error", error instanceof Error ? error.message : String(error));
  }
}`,
    "utf8"
  );

  const result = await dispatchRuntimePluginEvent(cwd, "turn-complete", {
    context: { runId: "run-2", memoryEnabled: false }
  });
  assert.equal(result.failures.length, 0);

  const enabled = JSON.parse(
    await readFile(join(cwd, ".whitey", "plugin-state", "memory-disabled", "memory-enabled.json"), "utf8")
  ) as boolean;
  assert.equal(enabled, false);
  const errorMessage = JSON.parse(
    await readFile(join(cwd, ".whitey", "plugin-state", "memory-disabled", "memory-error.json"), "utf8")
  ) as string;
  assert.match(errorMessage, /Memory is disabled for this run/);
});

test("dispatchRuntimePluginEvent surfaces malformed project-memory errors from sdk.memory", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "whitey-plugin-memory-malformed-"));
  const hooksPath = join(cwd, ".whitey", "hooks");
  await mkdir(hooksPath, { recursive: true });
  await mkdir(join(cwd, ".whitey", "memory"), { recursive: true });
  await writeFile(join(cwd, ".whitey", "memory", "project-memory.json"), "{not-json", "utf8");
  await writeFile(
    join(hooksPath, "memory-malformed.mjs"),
    `export async function onHookEvent(_event, sdk) {
  await sdk.memory.addNote("implementation", "Should fail");
}`,
    "utf8"
  );

  const result = await dispatchRuntimePluginEvent(cwd, "turn-complete", {
    context: { runId: "run-3", memoryEnabled: true }
  });
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0].error, /Invalid project memory JSON/);

  const logRaw = await readFile(join(cwd, ".whitey", "logs", `hooks-${new Date().toISOString().slice(0, 10)}.jsonl`), "utf8");
  assert.match(logRaw, /plugin dispatch failed/);
});

test("dispatchBuiltinRuntimeHooks bootstraps memory on session-start and prunes stale working entries", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "whitey-plugin-builtin-bootstrap-"));
  await mkdir(join(cwd, ".whitey", "memory"), { recursive: true });
  await writeFile(
    join(cwd, ".whitey", "memory", "notepad.md"),
    "## PRIORITY\n\n## WORKING MEMORY\n[2000-01-01T00:00:00.000Z] stale\n## MANUAL\n",
    "utf8"
  );
  await writeFile(
    join(cwd, ".whitey", "memory", "project-memory.json"),
    JSON.stringify(
      {
        notes: [
          { category: "architecture", content: "Keep hooks small", timestamp: "2026-01-01T00:00:00.000Z" },
          { category: "architecture", content: "Keep hooks small", timestamp: "2026-01-02T00:00:00.000Z" }
        ],
        directives: [
          { directive: "Run tests", priority: "normal", timestamp: "2026-01-01T00:00:00.000Z" },
          { directive: "Run tests", priority: "high", timestamp: "2026-01-01T12:00:00.000Z" }
        ]
      },
      null,
      2
    ),
    "utf8"
  );

  const result = await dispatchBuiltinRuntimeHooks(cwd, "session-start", {
    sessionId: "session-boot",
    context: { memoryEnabled: true }
  });
  assert.equal(result.failures.length, 0);

  const memory = JSON.parse(await readFile(join(cwd, ".whitey", "memory", "project-memory.json"), "utf8")) as {
    notes: Array<{ content: string }>;
    directives: Array<{ directive: string; priority: string }>;
  };
  assert.equal(memory.notes.length, 1);
  assert.equal(memory.directives.length, 1);
  assert.equal(memory.directives[0].priority, "high");

  const notepad = await readFile(join(cwd, ".whitey", "memory", "notepad.md"), "utf8");
  assert.doesNotMatch(notepad, /stale/);
});

test("dispatchRuntimePluginEvent sdk.memory.readProjectMemory uses canonical fallback source", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "whitey-plugin-memory-fallback-"));
  const hooksPath = join(cwd, ".whitey", "hooks");
  await mkdir(hooksPath, { recursive: true });
  await writeFile(join(cwd, "project-memory.json"), "{\"techStack\":\"Canonical\"}", "utf8");
  await writeFile(
    join(hooksPath, "memory-read.mjs"),
    `export async function onHookEvent(_event, sdk) {
  const memory = await sdk.memory.readProjectMemory("all");
  await sdk.state.write("memory-tech", memory?.techStack || "");
}`,
    "utf8"
  );

  const result = await dispatchRuntimePluginEvent(cwd, "context-build", {
    context: { memoryEnabled: true }
  });
  assert.equal(result.failures.length, 0);
  const tech = JSON.parse(await readFile(join(cwd, ".whitey", "plugin-state", "memory-read", "memory-tech.json"), "utf8")) as string;
  assert.equal(tech, "Canonical");
});
