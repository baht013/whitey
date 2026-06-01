import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withEnv } from "../../test-support/env.js";
import { parentWatchdogIntervalMs, shouldAutoStartMcpServer } from "../bootstrap.js";

describe("mcp/bootstrap", () => {
  it("supports global auto-start disable env", async () => {
    await withEnv({ WHITEY_MCP_SERVER_DISABLE_AUTO_START: "1", WHITEY_MEMORY_SERVER_DISABLE_AUTO_START: undefined }, async () => {
      assert.equal(shouldAutoStartMcpServer("memory"), false);
    });
  });

  it("supports per-server auto-start disable env", async () => {
    await withEnv({ WHITEY_MCP_SERVER_DISABLE_AUTO_START: undefined, WHITEY_MEMORY_SERVER_DISABLE_AUTO_START: "1" }, async () => {
      assert.equal(shouldAutoStartMcpServer("memory"), false);
    });
  });

  it("allows auto-start when no disable env is set", async () => {
    await withEnv({ WHITEY_MCP_SERVER_DISABLE_AUTO_START: undefined, WHITEY_MEMORY_SERVER_DISABLE_AUTO_START: undefined }, async () => {
      assert.equal(shouldAutoStartMcpServer("memory"), true);
    });
  });

  it("parses parent watchdog interval and falls back to default", async () => {
    await withEnv({ WHITEY_MCP_PARENT_WATCHDOG_INTERVAL_MS: "1200" }, async () => {
      assert.equal(parentWatchdogIntervalMs(), 1200);
    });
    await withEnv({ WHITEY_MCP_PARENT_WATCHDOG_INTERVAL_MS: "invalid" }, async () => {
      assert.equal(parentWatchdogIntervalMs(), 5000);
    });
  });
});
