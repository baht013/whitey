import type { ParsedArgs } from "../types/index.js";

const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_HISTORY_LIMIT = 10;

function parseValue(flag: string, value: string | undefined): number {
  const parsed = value ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${flag}.`);
  }
  return Math.trunc(parsed);
}

export function parseArgs(argv: string[]): ParsedArgs {
  let command: ParsedArgs["command"] = "run";
  let promptParts: string[] = [];
  let nonInteractive = false;
  let assumeYes = false;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let verbose = false;
  let json = false;
  let historyLimit = DEFAULT_HISTORY_LIMIT;

  const args = [...argv];

  if (args.includes("--help") || args.includes("-h")) {
    command = "help";
  }

  if (args[0] && ["run", "history", "status", "help"].includes(args[0])) {
    command = args.shift() as ParsedArgs["command"];
  }

  let promptStarted = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--") {
      promptStarted = true;
      continue;
    }

    if (promptStarted) {
      promptParts.push(arg);
      continue;
    }

    if (arg === "--non-interactive") {
      if (command !== "run") throw new Error("--non-interactive is only valid with run.");
      nonInteractive = true;
      continue;
    }
    if (arg === "--json") {
      if (command === "help") throw new Error("--json is not valid with help.");
      json = true;
      continue;
    }
    if (arg === "--yes") {
      if (command !== "run") throw new Error("--yes is only valid with run.");
      assumeYes = true;
      continue;
    }
    if (arg === "--verbose") {
      if (command !== "run") throw new Error("--verbose is only valid with run.");
      verbose = true;
      continue;
    }
    if (arg === "--timeout-ms") {
      if (command !== "run") throw new Error("--timeout-ms is only valid with run.");
      timeoutMs = parseValue("--timeout-ms", args[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--limit") {
      if (command !== "history") throw new Error("--limit is only valid with history.");
      historyLimit = parseValue("--limit", args[i + 1]);
      i += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    promptParts.push(arg);
  }

  if (command === "run" && promptParts.length === 0) {
    command = "help";
  }

  return {
    command,
    prompt: promptParts.length > 0 ? promptParts.join(" ") : undefined,
    nonInteractive,
    assumeYes,
    timeoutMs,
    verbose,
    json,
    historyLimit
  };
}

export function helpText(): string {
  return [
    "whitey: lightweight Copilot-first runner",
    "",
    "Usage:",
    "  whitey run <prompt> [--timeout-ms N] [--yes] [--non-interactive] [--verbose] [--json]",
    "  whitey history [--limit N] [--json]",
    "  whitey status [--json]",
    "  whitey help",
    "",
    "Environment:",
    "  WHITEY_COPILOT_CMD            Override copilot executable (default: copilot)",
    "  WHITEY_COPILOT_ARGS_TEMPLATE  Space-separated args with {prompt} placeholder",
    "                               Default invocation: copilot --prompt <prompt>"
  ].join("\n");
}
