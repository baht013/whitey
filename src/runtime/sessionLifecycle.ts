import process from "node:process";
import { randomUUID } from "node:crypto";
import { appendFile, readFile, rm, writeFile } from "node:fs/promises";
import { appendNotepadWorkingEntry } from "../mcp/memory-tools.js";
import { ensureStorage, lifecycleLogFile, sessionHistoryFile, sessionStateFile } from "../utils/fs.js";
import type { WhiteyLifecycleEvent, WhiteySessionCloseOutcome, WhiteySessionState } from "../types/index.js";
import { buildRunMemoryContextDetails, type MemorySectionMetadata, type MemorySourceMetadata } from "./memoryContext.js";

interface SessionStartOptions {
  provider?: string;
  nativeMode?: boolean;
}

interface SessionStartContextOptions {
  useMemoryContext: boolean;
}

export interface SessionStartContextResult {
  text: string;
  sectionCount: number;
  contextLength: number;
  memoryEnabled: boolean;
  memorySources: MemorySourceMetadata[];
  memorySections: MemorySectionMetadata[];
}

function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function executionSessionSection(session: WhiteySessionState): string {
  const lines = [
    "[Whitey execution session]",
    `session id: ${session.sessionId}`,
    `started at: ${session.startedAt}`,
    `cwd: ${session.cwd}`,
    `pid: ${session.pid}`,
    `platform: ${session.platform}`
  ];
  if (session.provider) {
    lines.push(`provider: ${session.provider}`);
  }
  if (session.nativeMode !== undefined) {
    lines.push(`native mode: ${session.nativeMode ? "true" : "false"}`);
  }
  return lines.join("\n");
}

function summarizeCloseOutcome(outcome: WhiteySessionCloseOutcome): string {
  const cleanSummary = outcome.summary.replace(/\s+/g, " ").trim().slice(0, 240);
  const summary = cleanSummary.length > 0 ? cleanSummary : "No summary.";
  return `status=${outcome.status} exit_code=${outcome.exitCode} run_id=${outcome.runId ?? "none"} summary="${summary}"`;
}

async function appendSessionHistory(cwd: string, data: Record<string, unknown>): Promise<void> {
  await appendFile(sessionHistoryFile(cwd), `${JSON.stringify(data)}\n`, "utf8");
}

export async function appendLifecycleLog(cwd: string, event: WhiteyLifecycleEvent): Promise<void> {
  await ensureStorage(cwd);
  await appendFile(lifecycleLogFile(cwd), `${JSON.stringify(event)}\n`, "utf8");
}

export async function readWhiteySession(cwd: string): Promise<WhiteySessionState | null> {
  try {
    const content = await readFile(sessionStateFile(cwd), "utf8");
    const parsed = JSON.parse(content) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Session state must be an object.");
    }
    const candidate = parsed as Partial<WhiteySessionState>;
    if (
      typeof candidate.sessionId !== "string"
      || typeof candidate.startedAt !== "string"
      || typeof candidate.cwd !== "string"
      || typeof candidate.pid !== "number"
      || typeof candidate.platform !== "string"
    ) {
      throw new Error("Session state is missing required fields.");
    }
    return candidate as WhiteySessionState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    if (error instanceof SyntaxError) {
      throw new Error("Invalid session state JSON.");
    }
    throw error;
  }
}

export function isWhiteySessionUsable(state: WhiteySessionState | null, cwd: string): boolean {
  if (!state) {
    return false;
  }
  if (state.cwd !== cwd) {
    return false;
  }
  return isProcessAlive(state.pid);
}

export async function startWhiteySession(cwd: string, options: SessionStartOptions = {}): Promise<WhiteySessionState> {
  await ensureStorage(cwd);

  const previous = await readWhiteySession(cwd);
  if (previous && !isWhiteySessionUsable(previous, cwd)) {
    await appendLifecycleLog(cwd, {
      schemaVersion: "1",
      event: "session-close",
      timestamp: new Date().toISOString(),
      sessionId: previous.sessionId,
      cwd,
      source: "whitey-run",
      payload: {
        status: "stale_session_cleanup",
        pid: previous.pid
      }
    });
  }

  const session: WhiteySessionState = {
    sessionId: `whitey-${Date.now()}-${randomUUID().slice(0, 8)}`,
    startedAt: new Date().toISOString(),
    cwd,
    pid: process.pid,
    platform: process.platform,
    provider: options.provider,
    nativeMode: options.nativeMode
  };
  await writeFile(sessionStateFile(cwd), `${JSON.stringify(session, null, 2)}\n`, "utf8");
  await appendSessionHistory(cwd, { type: "start", ...session });
  await appendLifecycleLog(cwd, {
    schemaVersion: "1",
    event: "session-start",
    timestamp: new Date().toISOString(),
    sessionId: session.sessionId,
    cwd,
    source: "whitey-run",
    payload: {
      pid: session.pid,
      provider: session.provider
    }
  });
  return session;
}

export async function buildWhiteySessionStartContext(
  cwd: string,
  session: WhiteySessionState,
  options: SessionStartContextOptions
): Promise<SessionStartContextResult> {
  const sections = [executionSessionSection(session)];
  let memorySources: MemorySourceMetadata[] = [];
  let memorySections: MemorySectionMetadata[] = [];
  if (options.useMemoryContext) {
    const memoryContext = await buildRunMemoryContextDetails(cwd);
    memorySources = memoryContext.sources;
    memorySections = memoryContext.sections;
    if (memoryContext.text.trim().length > 0) {
      sections.push(memoryContext.text);
    }
  }
  const text = sections.join("\n\n");
  await appendLifecycleLog(cwd, {
    schemaVersion: "1",
    event: "context-build",
    timestamp: new Date().toISOString(),
    sessionId: session.sessionId,
    cwd,
    source: "whitey-run",
    payload: {
      memoryEnabled: options.useMemoryContext,
      sectionCount: sections.length,
      contextLength: text.length,
      memorySources,
      memorySections
    }
  });
  return {
    text,
    sectionCount: sections.length,
    contextLength: text.length,
    memoryEnabled: options.useMemoryContext,
    memorySources,
    memorySections
  };
}

export async function closeWhiteySession(
  cwd: string,
  sessionId: string,
  outcome: WhiteySessionCloseOutcome,
  options: { useMemoryContext: boolean } = { useMemoryContext: true }
): Promise<void> {
  await ensureStorage(cwd);
  const now = new Date().toISOString();
  if (options.useMemoryContext) {
    await appendNotepadWorkingEntry(cwd, `session-close ${summarizeCloseOutcome(outcome)}`, now);
  }

  const current = await readWhiteySession(cwd);
  if (current?.sessionId === sessionId) {
    await rm(sessionStateFile(cwd), { force: true });
  }

  await appendSessionHistory(cwd, {
    type: "close",
    sessionId,
    timestamp: now,
    outcome
  });
  await appendLifecycleLog(cwd, {
    schemaVersion: "1",
    event: "session-close",
    timestamp: now,
    sessionId,
    cwd,
    source: "whitey-run",
    payload: {
      status: outcome.status,
      exitCode: outcome.exitCode,
      runId: outcome.runId
    }
  });
}
