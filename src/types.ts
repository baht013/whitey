export type RunStatus = "success" | "executor_error" | "validation_error" | "approval_denied";

export interface RunRequest {
  prompt: string;
  cwd: string;
  nonInteractive: boolean;
  assumeYes: boolean;
  timeoutMs: number;
  verbose: boolean;
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

export interface CommandContext {
  argv: string[];
  cwd: string;
}

export interface ParsedArgs {
  command: "run" | "history" | "status" | "help";
  prompt?: string;
  nonInteractive: boolean;
  assumeYes: boolean;
  timeoutMs: number;
  verbose: boolean;
  historyLimit: number;
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
