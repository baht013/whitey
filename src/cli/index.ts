import { access } from "node:fs/promises";
import { constants } from "node:fs";
import process from "node:process";
import { parseArgs, helpText } from "./router.js";
import { runMcpServeCommand } from "./mcp-serve.js";
import { runMemoryCommand } from "./memory-parity.js";
import { runAgentsInitCommand } from "./agents-init.js";
import { requestApproval } from "../runtime/approval.js";
import { runPrompt } from "../runtime/executor.js";
import { persistRun, readHistory } from "../runtime/history.js";
import { getCopilotStatus } from "../runtime/status.js";
import { isMemoryContextEnabled } from "../runtime/memoryContext.js";
import { dispatchRuntimePluginEvent } from "../runtime/plugins.js";
import {
  appendLifecycleLog,
  buildWhiteySessionStartContext,
  closeWhiteySession,
  startWhiteySession
} from "../runtime/sessionLifecycle.js";
import type { WhiteySessionCloseOutcome } from "../types/index.js";

function print(message: string): void {
  process.stdout.write(`${message}\n`);
}

function printErr(message: string): void {
  process.stderr.write(`${message}\n`);
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function mapExitCode(status: string): number {
  if (status === "success") return 0;
  if (status === "approval_denied") return 3;
  if (status === "validation_error") return 2;
  return 1;
}

async function commandStatus(cwd: string, json: boolean): Promise<number> {
  const report = await getCopilotStatus(cwd);
  const exitCode = report.commandAvailable && report.authenticated ? 0 : 1;

  if (json) {
    printJson({
      command: "status",
      ok: exitCode === 0,
      report
    });
    return exitCode;
  }

  print("whitey status");
  print(`cwd: ${report.cwd}`);
  print(`copilot command: ${report.copilotCommand}`);
  print(`command available: ${report.commandAvailable ? "yes" : "no"}`);
  print(`auth checked: ${report.authChecked ? "yes" : "no"}`);
  print(`authenticated: ${report.authenticated ? "yes" : "no"}`);
  print(`auth hint: ${report.authHint}`);

  return exitCode;
}

async function commandHistory(cwd: string, limit: number, json: boolean): Promise<number> {
  const entries = await readHistory(cwd, limit);
  if (json) {
    printJson({
      command: "history",
      count: entries.length,
      entries
    });
    return 0;
  }

  if (entries.length === 0) {
    print("No run history yet.");
    return 0;
  }

  for (const entry of entries) {
    print(`${entry.startedAt} | ${entry.status} | ${entry.promptDigest} | ${entry.promptPreview}`);
  }

  return 0;
}

async function commandRun(parsed: ReturnType<typeof parseArgs>, cwd: string): Promise<number> {
  const prompt = parsed.prompt || "";
  const useMemoryContext = !parsed.noMemory && isMemoryContextEnabled();

  const approval = await requestApproval({
    prompt,
    nonInteractive: parsed.nonInteractive,
    assumeYes: parsed.assumeYes
  });

  if (!approval.approved) {
    if (!parsed.json) {
      printErr(`Execution blocked: ${approval.reason || "approval denied"}`);
    }
    const now = new Date().toISOString();
    const deniedRecord = await persistRun(cwd, prompt, {
      status: "approval_denied",
      exitCode: 3,
      startedAt: now,
      endedAt: now,
      durationMs: 0,
      summary: approval.reason || "approval denied",
      stdout: "",
      stderr: approval.reason || "approval denied"
    });
    if (parsed.json) {
      printJson({
        command: "run",
        ok: false,
        reason: approval.reason || "approval denied",
        result: {
          status: "approval_denied",
          exitCode: 3
        },
        record: deniedRecord
      });
    }
    return 3;
  }

  const session = await startWhiteySession(cwd, { provider: "copilot-cli", nativeMode: false });
  let closeOutcome: WhiteySessionCloseOutcome = {
    status: "runtime_error",
    exitCode: 1,
    summary: "Run did not complete."
  };

  try {
    const sessionEvent = await dispatchRuntimePluginEvent(cwd, "session-start", {
      sessionId: session.sessionId,
      context: { provider: "copilot-cli" }
    });
    for (const failure of sessionEvent.failures) {
      printErr(`Plugin ${failure.plugin} failed during session-start: ${failure.error}`);
    }

    const startupContext = await buildWhiteySessionStartContext(cwd, session, { useMemoryContext });
    const contextEvent = await dispatchRuntimePluginEvent(cwd, "context-build", {
      sessionId: session.sessionId,
      context: {
        useMemoryContext,
        contextLength: startupContext.length
      }
    });
    for (const failure of contextEvent.failures) {
      printErr(`Plugin ${failure.plugin} failed during context-build: ${failure.error}`);
    }

    const result = await runPrompt({
      prompt,
      cwd,
      timeoutMs: parsed.timeoutMs,
      verbose: parsed.verbose,
      useMemoryContext,
      startupContext
    });
    const record = await persistRun(cwd, prompt, result);
    closeOutcome = {
      status: result.status,
      exitCode: result.exitCode,
      summary: result.summary,
      runId: record.id
    };
    await appendLifecycleLog(cwd, {
      schemaVersion: "1",
      event: "turn-complete",
      timestamp: new Date().toISOString(),
      sessionId: session.sessionId,
      cwd,
      source: "whitey-run",
      payload: {
        runId: record.id,
        status: result.status,
        exitCode: result.exitCode
      }
    });

    const turnEvent = await dispatchRuntimePluginEvent(cwd, "turn-complete", {
      sessionId: session.sessionId,
      context: {
        runId: record.id,
        status: result.status,
        exitCode: result.exitCode
      }
    });
    for (const failure of turnEvent.failures) {
      printErr(`Plugin ${failure.plugin} failed during turn-complete: ${failure.error}`);
    }

    if (parsed.json) {
      printJson({
        command: "run",
        ok: result.status === "success",
        result,
        record
      });
      return mapExitCode(result.status);
    }

    if (result.stdout.trim()) {
      print(result.stdout.trim());
    }
    if (result.stderr.trim()) {
      printErr(result.stderr.trim());
    }

    print(`Run: ${record.id}`);
    print(`Status: ${result.status}`);
    print(`Duration(ms): ${result.durationMs}`);

    return mapExitCode(result.status);
  } finally {
    try {
      await closeWhiteySession(cwd, session.sessionId, closeOutcome, { useMemoryContext });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to close session.";
      printErr(`Session close warning: ${message}`);
    }
    const closeEvent = await dispatchRuntimePluginEvent(cwd, "session-close", {
      sessionId: session.sessionId,
      context: {
        status: closeOutcome.status,
        exitCode: closeOutcome.exitCode,
        runId: closeOutcome.runId
      }
    });
    for (const failure of closeEvent.failures) {
      printErr(`Plugin ${failure.plugin} failed during session-close: ${failure.error}`);
    }
  }
}

async function ensureReadableCwd(cwd: string): Promise<void> {
  await access(cwd, constants.R_OK | constants.W_OK);
}

export async function runCli(argv: string[], cwd = process.cwd()): Promise<number> {
  await ensureReadableCwd(cwd);

  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Argument parsing failed.";
    printErr(message);
    return 2;
  }

  if (parsed.command === "help") {
    if (parsed.json) {
      printJson({ command: "help", ok: true, text: helpText() });
    } else {
      print(helpText());
    }
    return 0;
  }

  if (parsed.command === "status") {
    return commandStatus(cwd, parsed.json);
  }

  if (parsed.command === "history") {
    return commandHistory(cwd, parsed.historyLimit, parsed.json);
  }

  if (parsed.command === "mcp-serve") {
    return runMcpServeCommand(parsed.mcpServer);
  }

  if (parsed.command === "project-memory" || parsed.command === "notepad") {
    return runMemoryCommand(parsed.command, parsed.memoryAction, parsed.memoryInput, cwd, parsed.json);
  }

  if (parsed.command === "agents-init") {
    return runAgentsInitCommand({
      targetPath: parsed.agentsInitPath,
      cwd,
      dryRun: parsed.dryRun,
      force: parsed.force,
      verbose: parsed.verbose,
      json: parsed.json
    });
  }

  return commandRun(parsed, cwd);
}
