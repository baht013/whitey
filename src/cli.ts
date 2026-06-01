#!/usr/bin/env node
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import process from "node:process";
import { parseArgs, helpText } from "./core/router.js";
import { requestApproval } from "./core/approval.js";
import { runPrompt } from "./core/executor.js";
import { persistRun, readHistory } from "./core/history.js";

function print(message: string): void {
  process.stdout.write(`${message}\n`);
}

function printErr(message: string): void {
  process.stderr.write(`${message}\n`);
}

function mapExitCode(status: string): number {
  if (status === "success") return 0;
  if (status === "approval_denied") return 3;
  if (status === "validation_error") return 2;
  return 1;
}

async function commandStatus(cwd: string): Promise<number> {
  const copilotCmd = process.env.WHITEY_COPILOT_CMD || "copilot";
  const pathValue = process.env.PATH || "";
  const hasPath = pathValue.split(":").some((segment) => segment.length > 0);

  print("whitey status");
  print(`cwd: ${cwd}`);
  print(`copilot command: ${copilotCmd}`);
  print(`path configured: ${hasPath ? "yes" : "no"}`);

  return 0;
}

async function commandHistory(cwd: string, limit: number): Promise<number> {
  const entries = await readHistory(cwd, limit);
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
    printErr(`Execution blocked: ${approval.reason || "approval denied"}`);
    const now = new Date().toISOString();
    await persistRun(cwd, prompt, {
      status: "approval_denied",
      exitCode: 3,
      startedAt: now,
      endedAt: now,
      durationMs: 0,
      summary: approval.reason || "approval denied",
      stdout: "",
      stderr: approval.reason || "approval denied"
    });
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

async function main(): Promise<void> {
  const cwd = process.cwd();
  await ensureReadableCwd(cwd);

  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Argument parsing failed.";
    printErr(message);
    process.exitCode = 2;
    return;
  }

  if (parsed.command === "help") {
    print(helpText());
    process.exitCode = 0;
    return;
  }

  if (parsed.command === "status") {
    process.exitCode = await commandStatus(cwd);
    return;
  }

  if (parsed.command === "history") {
    process.exitCode = await commandHistory(cwd, parsed.historyLimit);
    return;
  }

  process.exitCode = await commandRun(parsed, cwd);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected failure";
  printErr(message);
  process.exitCode = 1;
});
