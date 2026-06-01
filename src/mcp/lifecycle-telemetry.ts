import path from "node:path";
import { appendFile, mkdir } from "node:fs/promises";

const DISABLE_VALUES = new Set(["0", "false", "off", "no"]);

function lifecycleLogEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.WHITEY_MCP_LIFECYCLE_LOG?.trim().toLowerCase();
  if (!raw) {
    return true;
  }
  return !DISABLE_VALUES.has(raw);
}

function lifecycleLogDirectory(cwd = process.cwd(), env: NodeJS.ProcessEnv = process.env): string {
  return env.WHITEY_MCP_LIFECYCLE_LOG_DIR ? path.resolve(env.WHITEY_MCP_LIFECYCLE_LOG_DIR) : path.join(cwd, ".whitey", "logs");
}

function lifecycleLogFileName(date = new Date()): string {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `mcp-lifecycle-${yyyy}-${mm}-${dd}.jsonl`;
}

export async function appendMcpLifecycleTelemetry(event: {
  server: string;
  phase: "start" | "shutdown" | "watchdog";
  reason?: string;
  pid: number;
  ppid: number;
  timestamp?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  if (!lifecycleLogEnabled()) {
    return;
  }
  const timestamp = event.timestamp ?? new Date().toISOString();
  const dir = lifecycleLogDirectory();
  try {
    await mkdir(dir, { recursive: true });
    await appendFile(
      path.join(dir, lifecycleLogFileName()),
      `${JSON.stringify({
        timestamp,
        server: event.server,
        phase: event.phase,
        reason: event.reason,
        pid: event.pid,
        ppid: event.ppid,
        details: event.details
      })}\n`,
      "utf8"
    );
  } catch {
    // lifecycle logging must never break stdio MCP operation
  }
}
