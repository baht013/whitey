import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { applyProjectMemoryHygiene, ensureNotepadTemplate, pruneNotepadWorkingEntries } from "../mcp/memory-tools.js";
import { canonicalProjectMemoryPath, memoryRoot, projectMemoryPath } from "../mcp/paths.js";
import type { HookEvent, PluginSdk } from "./plugins.js";

const MAX_TRANSCRIPT_CHARS = 16000;
const MAX_NOTE_LENGTH = 240;
const MAX_DIRECTIVE_LENGTH = 240;
const MAX_WORKING_LENGTH = 240;
const MAX_NOTES_PER_RUN = 3;
const MAX_DIRECTIVES_PER_RUN = 2;
const DEFAULT_HYGIENE_DAYS = 7;
const SUMMARY_KEYWORDS = /\b(Implemented|Changed|Fixed|Known limit)\b/i;
const SECRET_PATTERNS = [
  /\b(token|api[_-]?key|secret|password)\s*[:=]\s*[^\s,;]+/gi,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bsk-[A-Za-z0-9]{16,}\b/g,
  /\bbearer\s+[A-Za-z0-9._-]{20,}\b/gi
];

type CaptureNote = { category: "architecture" | "implementation"; content: string };
type CaptureDirective = { directive: string };

function clip(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function redact(value: string): string {
  let output = value;
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, "[REDACTED]");
  }
  return output;
}

function normalizeCandidate(value: string, max: number): string | null {
  const normalized = redact(value.replace(/\s+/g, " ").trim());
  if (!normalized) {
    return null;
  }
  if (/\[REDACTED\]/.test(normalized) && normalized.length < 16) {
    return null;
  }
  return clip(normalized, max);
}

function hashCandidate(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function taggedCandidates(source: string): { notes: CaptureNote[]; directives: CaptureDirective[] } {
  const notes: CaptureNote[] = [];
  const directives: CaptureDirective[] = [];
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/\b(Memory|Decision|Convention|Directive|Architecture)\s*:\s*(.+)$/i);
    if (!match) {
      continue;
    }
    const kind = match[1].toLowerCase();
    const raw = match[2];
    if (kind === "convention" || kind === "directive") {
      const directive = normalizeCandidate(raw, MAX_DIRECTIVE_LENGTH);
      if (directive) {
        directives.push({ directive });
      }
      continue;
    }
    const content = normalizeCandidate(raw, MAX_NOTE_LENGTH);
    if (!content) {
      continue;
    }
    notes.push({
      category: kind === "architecture" ? "architecture" : "implementation",
      content
    });
  }
  return { notes, directives };
}

function buildWorkingSummary(
  summary: string | undefined,
  notes: CaptureNote[],
  directives: CaptureDirective[]
): string | null {
  if (notes[0]) {
    return normalizeCandidate(`${notes[0].category}: ${notes[0].content}`, MAX_WORKING_LENGTH);
  }
  if (directives[0]) {
    return normalizeCandidate(`directive: ${directives[0].directive}`, MAX_WORKING_LENGTH);
  }
  if (summary && SUMMARY_KEYWORDS.test(summary)) {
    return normalizeCandidate(summary, MAX_WORKING_LENGTH);
  }
  return null;
}

async function markWorkingSummary(sdk: PluginSdk, runId: string): Promise<void> {
  await sdk.state.write(`run-${runId}-working-written`, true);
}

async function hasWorkingSummary(sdk: PluginSdk, runId: string): Promise<boolean> {
  return (await sdk.state.read(`run-${runId}-working-written`)) === true;
}

async function isDuplicateRunCandidate(sdk: PluginSdk, runId: string, value: string): Promise<boolean> {
  const key = `run-${runId}-hashes`;
  const raw = await sdk.state.read(key);
  const hashes = Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === "string") : [];
  const hash = hashCandidate(value);
  if (hashes.includes(hash)) {
    return true;
  }
  hashes.push(hash);
  await sdk.state.write(key, hashes);
  return false;
}

async function readTranscriptSource(transcriptPath: string): Promise<string> {
  const raw = (await readFile(transcriptPath, "utf8")).slice(0, MAX_TRANSCRIPT_CHARS);
  let summary = "";
  let stdout = "";
  let stderr = "";
  try {
    const parsed = JSON.parse(raw) as {
      result?: { summary?: unknown; stdout?: unknown; stderr?: unknown };
    };
    if (typeof parsed.result?.summary === "string") {
      summary = parsed.result.summary;
    }
    if (typeof parsed.result?.stdout === "string") {
      stdout = parsed.result.stdout;
    }
    if (typeof parsed.result?.stderr === "string") {
      stderr = parsed.result.stderr;
    }
  } catch {
    return raw;
  }
  return [summary, stdout, stderr].filter((value) => value.trim().length > 0).join("\n");
}

async function runSessionStartBootstrap(event: HookEvent, sdk: PluginSdk): Promise<void> {
  const memoryEnabled = event.context?.memoryEnabled === true && sdk.memory.enabled;
  if (!memoryEnabled) {
    await sdk.log.info("builtin memory bootstrap skipped", { reason: "memory-disabled" });
    return;
  }

  const sessionId = event.session_id ?? "unknown-session";
  const stateKey = `session-${sessionId}-hygiene-ran`;
  if ((await sdk.state.read(stateKey)) === true) {
    await sdk.log.info("builtin memory bootstrap skipped", { reason: "already-ran", sessionId });
    return;
  }

  const cwd = event.cwd;
  const whiteyMemory = projectMemoryPath(cwd);
  const canonicalMemory = canonicalProjectMemoryPath(cwd);
  const whiteyExists = existsSync(whiteyMemory);
  const canonicalExists = existsSync(canonicalMemory);

  let initialized = false;
  let notepadCreated = false;
  if (!whiteyExists && !canonicalExists) {
    await mkdir(memoryRoot(cwd), { recursive: true });
    await writeFile(whiteyMemory, "{}\n", "utf8");
    initialized = true;
    const notepadResult = await ensureNotepadTemplate(cwd);
    notepadCreated = notepadResult.created;
  }

  let projectHygiene: Awaited<ReturnType<typeof applyProjectMemoryHygiene>> | null = null;
  if (initialized || whiteyExists) {
    projectHygiene = await applyProjectMemoryHygiene(cwd);
  }
  const notepadHygiene = await pruneNotepadWorkingEntries(cwd, DEFAULT_HYGIENE_DAYS);
  await sdk.state.write(stateKey, true);
  await sdk.log.info("builtin memory bootstrap completed", {
    initialized,
    notepadCreated,
    projectHygiene,
    notepadHygiene,
    canonicalFallbackUsed: !whiteyExists && canonicalExists
  });
}

async function runTurnCompleteCapture(context: Record<string, unknown>, sdk: PluginSdk): Promise<void> {
  const runId = typeof context.runId === "string" ? context.runId : undefined;
  if (!runId) {
    await sdk.log.info("builtin memory capture skipped", { reason: "missing-run-id", event: "turn-complete" });
    return;
  }
  const status = typeof context.status === "string" ? context.status : "unknown";
  const exitCode = typeof context.exitCode === "number" ? context.exitCode : -1;
  const summary = typeof context.summary === "string" ? context.summary : undefined;
  if (status !== "success") {
    const line = normalizeCandidate(`run failed status=${status} exit=${exitCode}`, MAX_WORKING_LENGTH);
    if (line) {
      await sdk.memory.writeWorking(line);
      await markWorkingSummary(sdk, runId);
    }
    await sdk.log.info("builtin memory capture wrote failure summary", { runId, status, exitCode });
    return;
  }

  let source = "";
  const transcriptPath = typeof context.transcriptPath === "string" ? context.transcriptPath : undefined;
  if (transcriptPath) {
    try {
      source = await readTranscriptSource(transcriptPath);
    } catch (error) {
      await sdk.log.warn("builtin memory capture transcript read failed", {
        runId,
        error: error instanceof Error ? error.message : "Unknown transcript read error."
      });
    }
  }
  if (summary) {
    source = `${source}\n${summary}`;
  }

  const extracted = taggedCandidates(source);
  if (summary && SUMMARY_KEYWORDS.test(summary)) {
    const summaryCandidate = normalizeCandidate(summary, MAX_NOTE_LENGTH);
    if (summaryCandidate) {
      extracted.notes.push({ category: "implementation", content: summaryCandidate });
    }
  }

  let notesWritten = 0;
  let directivesWritten = 0;
  for (const note of extracted.notes) {
    if (notesWritten >= MAX_NOTES_PER_RUN) {
      break;
    }
    const key = `${note.category}:${note.content}`;
    if (await isDuplicateRunCandidate(sdk, runId, key)) {
      continue;
    }
    await sdk.memory.addNote(note.category, note.content);
    notesWritten += 1;
  }
  for (const directive of extracted.directives) {
    if (directivesWritten >= MAX_DIRECTIVES_PER_RUN) {
      break;
    }
    const key = `directive:${directive.directive}`;
    if (await isDuplicateRunCandidate(sdk, runId, key)) {
      continue;
    }
    await sdk.memory.addDirective(directive.directive, { priority: "normal", context: "runtime-memory-capture" });
    directivesWritten += 1;
  }

  const working = buildWorkingSummary(summary, extracted.notes, extracted.directives);
  if (working && !(await hasWorkingSummary(sdk, runId))) {
    await sdk.memory.writeWorking(working);
    await markWorkingSummary(sdk, runId);
  }
  await sdk.log.info("builtin memory capture completed", { runId, notesWritten, directivesWritten });
}

async function runSessionCloseCapture(context: Record<string, unknown>, sdk: PluginSdk): Promise<void> {
  const runId = typeof context.runId === "string" ? context.runId : undefined;
  if (!runId) {
    await sdk.log.info("builtin memory capture skipped", { reason: "missing-run-id", event: "session-close" });
    return;
  }
  if (await hasWorkingSummary(sdk, runId)) {
    return;
  }
  const status = typeof context.status === "string" ? context.status : "unknown";
  const exitCode = typeof context.exitCode === "number" ? context.exitCode : -1;
  const summaryText = typeof context.summary === "string" ? normalizeCandidate(context.summary, 120) : null;
  const line = normalizeCandidate(
    `session-close status=${status} exit=${exitCode}${summaryText ? ` summary=${summaryText}` : ""}`,
    MAX_WORKING_LENGTH
  );
  if (line) {
    await sdk.memory.writeWorking(line);
    await markWorkingSummary(sdk, runId);
  }
}

export async function onBuiltinMemoryCaptureEvent(event: HookEvent, sdk: PluginSdk): Promise<void> {
  const context = event.context ?? {};
  const memoryEnabled = context.memoryEnabled === true && sdk.memory.enabled;
  if (!memoryEnabled) {
    await sdk.log.info("builtin memory capture skipped", { reason: "memory-disabled", event: event.event });
    return;
  }

  if (event.event === "session-start") {
    await runSessionStartBootstrap(event, sdk);
    return;
  }
  if (event.event === "turn-complete") {
    await runTurnCompleteCapture(context, sdk);
    return;
  }
  if (event.event === "session-close") {
    await runSessionCloseCapture(context, sdk);
  }
}
