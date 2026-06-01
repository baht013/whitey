export type RunStatus = "success" | "executor_error" | "validation_error" | "approval_denied";

export interface RunRequest {
  prompt: string;
  cwd: string;
  timeoutMs: number;
  verbose: boolean;
  useMemoryContext?: boolean;
  startupContext?: string;
}

export interface RunResult {
  status: RunStatus;
  exitCode: number;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  summary: string;
  stdout: string;
  stderr: string;
}

export interface RunRecord {
  id: string;
  promptDigest: string;
  promptPreview: string;
  cwd: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: RunStatus;
  exitCode: number;
  summary: string;
  transcriptPath: string;
}

export type CliCommand = "run" | "history" | "status" | "help" | "mcp-serve" | "project-memory" | "notepad" | "agents-init";

export interface ParsedArgs {
  command: CliCommand;
  prompt?: string;
  nonInteractive: boolean;
  assumeYes: boolean;
  timeoutMs: number;
  verbose: boolean;
  json: boolean;
  noMemory: boolean;
  historyLimit: number;
  mcpServer?: string;
  memoryAction?: string;
  memoryInput?: string;
  agentsInitPath?: string;
  dryRun: boolean;
  force: boolean;
}

export interface RiskAssessment {
  risky: boolean;
  reasons: string[];
}

export interface CopilotExecutionInput {
  prompt: string;
  cwd: string;
  timeoutMs: number;
  verbose: boolean;
}

export interface CopilotExecutionOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CopilotStatusCheckResult {
  ok: boolean;
  timedOut: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CopilotStatusReport {
  cwd: string;
  copilotCommand: string;
  commandAvailable: boolean;
  authChecked: boolean;
  authenticated: boolean;
  authHint: string;
  checks: {
    version: CopilotStatusCheckResult;
    auth: CopilotStatusCheckResult;
  };
}

export interface WhiteySessionState {
  sessionId: string;
  startedAt: string;
  cwd: string;
  pid: number;
  platform: NodeJS.Platform;
  provider?: string;
  nativeMode?: boolean;
}

export interface WhiteySessionCloseOutcome {
  status: RunStatus | "runtime_error";
  exitCode: number;
  summary: string;
  runId?: string;
}

export type WhiteyLifecycleEventName =
  | "session-start"
  | "context-build"
  | "turn-complete"
  | "session-close"
  | "mcp-start"
  | "mcp-shutdown";

export interface WhiteyLifecycleEvent {
  schemaVersion: "1";
  event: WhiteyLifecycleEventName;
  timestamp: string;
  sessionId?: string;
  cwd: string;
  source: "whitey-run" | "whitey-mcp" | "whitey-hooks";
  payload?: Record<string, unknown>;
}
