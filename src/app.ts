import { access } from "node:fs/promises";
import { constants } from "node:fs";
import process from "node:process";
import { parseArgs, helpText } from "./core/router.js";
import { requestApproval } from "./core/approval.js";
import { runPrompt } from "./core/executor.js";
import { persistRun, readHistory } from "./core/history.js";
import { getCopilotStatus } from "./core/status.js";

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

  const result = await runPrompt({
    prompt,
    cwd,
    nonInteractive: parsed.nonInteractive,
    assumeYes: parsed.assumeYes,
    timeoutMs: parsed.timeoutMs,
    verbose: parsed.verbose
  });

  const record = await persistRun(cwd, prompt, result);

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

  return commandRun(parsed, cwd);
}
