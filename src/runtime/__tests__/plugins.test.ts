import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { withEnv } from "../../test-support/env.js";
import { dispatchRuntimePluginEvent } from "../plugins.js";

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
