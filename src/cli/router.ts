import type { ParsedArgs } from "../types/index.js";

const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_HISTORY_LIMIT = 10;
const COMMANDS: ParsedArgs["command"][] = [
  "run",
  "history",
  "status",
  "help",
  "mcp-serve",
  "project-memory",
  "notepad",
  "agents-init"
];

function parseValue(flag: string, value: string | undefined): number {
  const parsed = value ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${flag}.`);
  }
  return Math.trunc(parsed);
}

export function parseArgs(argv: string[]): ParsedArgs {
  let command: ParsedArgs["command"] = "run";
  const positional: string[] = [];
  let nonInteractive = false;
  let assumeYes = false;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let verbose = false;
  let json = false;
  let noMemory = false;
  let historyLimit = DEFAULT_HISTORY_LIMIT;
  let memoryInput: string | undefined;
  let dryRun = false;
  let force = false;

  const args = [...argv];

  if (args.includes("--help") || args.includes("-h")) {
    command = "help";
  }

  if (args[0] && COMMANDS.includes(args[0] as ParsedArgs["command"])) {
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
      positional.push(arg);
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
      if (!["run", "agents-init"].includes(command)) throw new Error("--verbose is only valid with run or agents-init.");
      verbose = true;
      continue;
    }
    if (arg === "--no-memory") {
      if (command !== "run") throw new Error("--no-memory is only valid with run.");
      noMemory = true;
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
    if (arg === "--input") {
      if (!["project-memory", "notepad"].includes(command)) {
        throw new Error("--input is only valid with project-memory or notepad.");
      }
      memoryInput = args[i + 1];
      if (!memoryInput) {
        throw new Error("Missing value for --input.");
      }
      i += 1;
      continue;
    }
    if (arg === "--dry-run") {
      if (command !== "agents-init") {
        throw new Error("--dry-run is only valid with agents-init.");
      }
      dryRun = true;
      continue;
    }
    if (arg === "--force") {
      if (command !== "agents-init") {
        throw new Error("--force is only valid with agents-init.");
      }
      force = true;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    positional.push(arg);
  }

  let prompt: string | undefined;
  let mcpServer: string | undefined;
  let memoryAction: string | undefined;
  let agentsInitPath: string | undefined;

  if (command === "run") {
    if (positional.length === 0) {
      command = "help";
    } else {
      prompt = positional.join(" ");
    }
  } else if (command === "history" || command === "status" || command === "help") {
    if (positional.length > 0) {
      throw new Error(`${command} does not accept positional arguments.`);
    }
  } else if (command === "mcp-serve") {
    if (positional.length > 1) {
      throw new Error("mcp-serve accepts exactly one server name.");
    }
    mcpServer = positional[0];
  } else if (command === "project-memory" || command === "notepad") {
    if (positional.length > 1) {
      throw new Error(`${command} accepts only one tool name or alias.`);
    }
    memoryAction = positional[0];
  } else if (command === "agents-init") {
    if (positional.length > 1) {
      throw new Error("agents-init accepts at most one target path.");
    }
    agentsInitPath = positional[0];
  }

  return {
    command,
    prompt,
    nonInteractive,
    assumeYes,
    timeoutMs,
    verbose,
    json,
    noMemory,
    historyLimit,
    mcpServer,
    memoryAction,
    memoryInput,
    agentsInitPath,
    dryRun,
    force
  };
}

export function helpText(): string {
  return [
    "whitey: lightweight Copilot-first runner",
    "",
    "Usage:",
    "  whitey run <prompt> [--timeout-ms N] [--yes] [--non-interactive] [--no-memory] [--verbose] [--json]",
    "  whitey history [--limit N] [--json]",
    "  whitey status [--json]",
    "  whitey mcp-serve memory",
    "  whitey project-memory <tool|alias> [--input <json>] [--json]",
    "  whitey notepad <tool|alias> [--input <json>] [--json]",
    "  whitey agents-init [path] [--dry-run] [--force] [--verbose] [--json]",
    "  whitey help",
    "",
    "Project-memory aliases: read, write, add-note, add-directive",
    "Notepad aliases: read, write-priority, write-working, write-manual, prune, stats",
    "",
    "Environment:",
    "  WHITEY_COPILOT_CMD            Override copilot executable (default: copilot)",
    "  WHITEY_COPILOT_ARGS_TEMPLATE  Space-separated args with {prompt} placeholder",
    "                               Default invocation: copilot --prompt <prompt>",
    "  WHITEY_MEMORY_CONTEXT         Set to 0 to disable run-time memory-context injection",
    "  WHITEY_HOOK_PLUGINS           Set to 0 to disable runtime hook plugins",
    "  WHITEY_HOOK_PLUGIN_TIMEOUT_MS Timeout for each runtime hook plugin (default: 1500)",
    "  WHITEY_MCP_SERVER_DISABLE_AUTO_START",
    "                               Set to 1 to disable MCP server auto-start globally",
    "  WHITEY_MEMORY_SERVER_DISABLE_AUTO_START",
    "                               Set to 1 to disable memory MCP server auto-start",
    "  WHITEY_MCP_TRANSPORT_DEBUG    Set to 1 to log MCP bootstrap debug info to stderr",
    "  WHITEY_MCP_PARENT_WATCHDOG_INTERVAL_MS",
    "                               Parent PID watchdog interval (default: 5000)",
    "  WHITEY_MCP_LIFECYCLE_LOG      Set to 0|false|off|no to disable MCP lifecycle logs",
    "  WHITEY_MCP_LIFECYCLE_LOG_DIR  Override MCP lifecycle telemetry directory"
  ].join("\n");
}
