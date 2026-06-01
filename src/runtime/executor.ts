import type { RunRequest, RunResult } from "../types/index.js";
import { executeWithCopilot } from "./provider/copilotCli.js";

export interface RunPromptDependencies {
  execute?: typeof executeWithCopilot;
}

function hasTextualFailure(stdout: string, stderr: string): boolean {
  const combined = `${stdout}\n${stderr}`.toLowerCase();
  const errorSignals = [
    "error:",
    "invalid command format",
    "try 'copilot --help'",
    "not authenticated",
    "authentication required"
  ];

  return errorSignals.some((signal) => combined.includes(signal));
}

export async function runPrompt(
  request: RunRequest,
  dependencies: RunPromptDependencies = {}
): Promise<RunResult> {
  const startedAt = new Date().toISOString();
  const start = Date.now();

  if (!request.prompt.trim()) {
    const endedAt = new Date().toISOString();
    return {
      status: "validation_error",
      exitCode: 2,
      startedAt,
      endedAt,
      durationMs: Date.now() - start,
      summary: "Prompt cannot be empty.",
      stdout: "",
      stderr: "Prompt cannot be empty."
    };
  }

  const execute = dependencies.execute ?? executeWithCopilot;
  const result = await execute({
    prompt: request.prompt,
    cwd: request.cwd,
    timeoutMs: request.timeoutMs,
    verbose: request.verbose
  });

  const endedAt = new Date().toISOString();
  const durationMs = Date.now() - start;
  const ok = result.exitCode === 0 && !hasTextualFailure(result.stdout, result.stderr);
  const exitCode = ok ? 0 : (result.exitCode === 0 ? 1 : result.exitCode);

  return {
    status: ok ? "success" : "executor_error",
    exitCode,
    startedAt,
    endedAt,
    durationMs,
    summary: ok ? "Execution completed." : "Copilot execution failed.",
    stdout: result.stdout,
    stderr: result.stderr
  };
}
