import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import process from "node:process";
import { appendMcpLifecycleTelemetry } from "./lifecycle-telemetry.js";

const GLOBAL_DISABLE_ENV = "WHITEY_MCP_SERVER_DISABLE_AUTO_START";
const DEBUG_ENV = "WHITEY_MCP_TRANSPORT_DEBUG";
const WATCHDOG_INTERVAL_ENV = "WHITEY_MCP_PARENT_WATCHDOG_INTERVAL_MS";
const DEFAULT_WATCHDOG_INTERVAL_MS = 5000;

function disableEnvForServer(name: string): string {
  return `WHITEY_${name.toUpperCase()}_SERVER_DISABLE_AUTO_START`;
}

function debug(message: string): void {
  if (process.env[DEBUG_ENV] === "1") {
    process.stderr.write(`[whitey:mcp] ${message}\n`);
  }
}

export function shouldAutoStartMcpServer(name: string): boolean {
  const disableEnv = disableEnvForServer(name);
  return process.env[GLOBAL_DISABLE_ENV] !== "1" && process.env[disableEnv] !== "1";
}

export function parentWatchdogIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env[WATCHDOG_INTERVAL_ENV];
  if (!raw) {
    return DEFAULT_WATCHDOG_INTERVAL_MS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_WATCHDOG_INTERVAL_MS;
  }
  return Math.trunc(parsed);
}

export async function startStdioMcpServer(server: Server): Promise<StdioServerTransport> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return transport;
}

export function autoStartStdioMcpServer(name: string, server: Server): void {
  if (!shouldAutoStartMcpServer(name)) {
    return;
  }

  void (async () => {
    const transport = await startStdioMcpServer(server);
    let closed = false;
    let watchdog: NodeJS.Timeout | undefined;
    const listeners: Array<{ event: NodeJS.Signals | "end" | "close"; handler: () => void }> = [];

    const removeListeners = (): void => {
      for (const { event, handler } of listeners) {
        if (event === "end" || event === "close") {
          process.stdin.removeListener(event, handler);
        } else {
          process.removeListener(event, handler);
        }
      }
      listeners.length = 0;
    };

    const shutdown = async (reason: string): Promise<void> => {
      if (closed) {
        return;
      }
      closed = true;
      debug(`shutting down ${name} server (${reason})`);
      if (watchdog) {
        clearInterval(watchdog);
        watchdog = undefined;
      }
      removeListeners();
      try {
        await server.close();
      } catch (error) {
        debug(`server.close failed: ${error instanceof Error ? error.message : "unknown error"}`);
      }
      await appendMcpLifecycleTelemetry({
        server: name,
        phase: "shutdown",
        reason,
        pid: process.pid,
        ppid: process.ppid
      });
      process.exit(0);
    };

    await appendMcpLifecycleTelemetry({
      server: name,
      phase: "start",
      pid: process.pid,
      ppid: process.ppid
    });

    const addProcessListener = (event: NodeJS.Signals, handler: () => void): void => {
      listeners.push({ event, handler });
      process.once(event, handler);
    };
    const addStdinListener = (event: "end" | "close", handler: () => void): void => {
      listeners.push({ event, handler });
      process.stdin.once(event, handler);
    };

    addStdinListener("end", () => void shutdown("stdin-end"));
    addStdinListener("close", () => void shutdown("stdin-close"));
    addProcessListener("SIGTERM", () => void shutdown("sigterm"));
    addProcessListener("SIGINT", () => void shutdown("sigint"));
    (transport as StdioServerTransport & { onclose?: () => void }).onclose = () => {
      void shutdown("transport-close");
    };

    const intervalMs = parentWatchdogIntervalMs();
    watchdog = setInterval(() => {
      if (closed) {
        return;
      }
      const parentPid = process.ppid;
      if (!parentPid || parentPid <= 1) {
        void shutdown("parent-missing");
        return;
      }
      try {
        process.kill(parentPid, 0);
      } catch {
        void appendMcpLifecycleTelemetry({
          server: name,
          phase: "watchdog",
          reason: "parent-not-alive",
          pid: process.pid,
          ppid: parentPid
        });
        void shutdown("parent-not-alive");
      }
    }, intervalMs);
    watchdog.unref();
  })().catch((error) => {
    const message = error instanceof Error ? error.message : "unknown bootstrap error";
    debug(`bootstrap failed: ${message}`);
    void appendMcpLifecycleTelemetry({
      server: name,
      phase: "shutdown",
      reason: "bootstrap-error",
      pid: process.pid,
      ppid: process.ppid,
      details: { error: message }
    });
    process.exit(1);
  });
}
