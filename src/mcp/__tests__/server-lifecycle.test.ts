import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { describe, it } from "node:test";

const ENTRYPOINT = path.resolve(process.cwd(), "dist/mcp/memory-server.js");
const distAvailable = existsSync(ENTRYPOINT);

function startServer(): ChildProcess {
  return spawn(process.execPath, [ENTRYPOINT], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      WHITEY_MCP_SERVER_DISABLE_AUTO_START: "",
      WHITEY_MEMORY_SERVER_DISABLE_AUTO_START: "",
      WHITEY_MCP_LIFECYCLE_LOG: "0"
    }
  });
}

function waitForExit(child: ChildProcess, timeoutMs = 3000): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (child.pid) {
        process.kill(child.pid, "SIGKILL");
      }
      reject(new Error("memory server did not exit in time"));
    }, timeoutMs);

    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("mcp/memory-server lifecycle", () => {
  it(
    "exits cleanly on stdin close",
    { skip: !distAvailable },
    async () => {
      const child = startServer();
      child.stdin?.end();
      const exited = await waitForExit(child);
      assert.equal(exited.code, 0);
      assert.equal(exited.signal, null);
    }
  );

  it(
    "exits cleanly on SIGTERM",
    { skip: !distAvailable },
    async () => {
      const child = startServer();
      try {
        await sleep(150);
        if (!child.pid) {
          throw new Error("child process pid not available");
        }
        process.kill(child.pid, "SIGTERM");
        const exited = await waitForExit(child);
        assert.equal(exited.code === 0 || exited.signal === "SIGTERM", true);
      } finally {
        if (child.pid) {
          try {
            process.kill(child.pid, "SIGKILL");
          } catch {
            // child already exited
          }
        }
      }
    }
  );

  it(
    "exits cleanly on SIGINT",
    { skip: !distAvailable },
    async () => {
      const child = startServer();
      try {
        await sleep(150);
        if (!child.pid) {
          throw new Error("child process pid not available");
        }
        process.kill(child.pid, "SIGINT");
        const exited = await waitForExit(child);
        assert.equal(exited.code === 0 || exited.signal === "SIGINT", true);
      } finally {
        if (child.pid) {
          try {
            process.kill(child.pid, "SIGKILL");
          } catch {
            // child already exited
          }
        }
      }
    }
  );
});
