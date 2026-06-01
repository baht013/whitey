import process from "node:process";
import { buildMemoryServerTools, handleMemoryToolCall } from "../mcp/memory-tools.js";

function print(message: string): void {
  process.stdout.write(`${message}\n`);
}

function printErr(message: string): void {
  process.stderr.write(`${message}\n`);
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

type MemoryCommand = "project-memory" | "notepad";

const PROJECT_MEMORY_TOOL_MAP: Record<string, string> = {
  read: "project_memory_read",
  write: "project_memory_write",
  "add-note": "project_memory_add_note",
  "add-directive": "project_memory_add_directive",
  project_memory_read: "project_memory_read",
  project_memory_write: "project_memory_write",
  project_memory_add_note: "project_memory_add_note",
  project_memory_add_directive: "project_memory_add_directive"
};

const NOTEPAD_TOOL_MAP: Record<string, string> = {
  read: "notepad_read",
  "write-priority": "notepad_write_priority",
  "write-working": "notepad_write_working",
  "write-manual": "notepad_write_manual",
  prune: "notepad_prune",
  stats: "notepad_stats",
  notepad_read: "notepad_read",
  notepad_write_priority: "notepad_write_priority",
  notepad_write_working: "notepad_write_working",
  notepad_write_manual: "notepad_write_manual",
  notepad_prune: "notepad_prune",
  notepad_stats: "notepad_stats"
};

function resolveToolName(command: MemoryCommand, action: string): string | undefined {
  const declaredTools = new Set(buildMemoryServerTools().map((tool) => tool.name));
  if (command === "project-memory") {
    const resolved = PROJECT_MEMORY_TOOL_MAP[action];
    return resolved && declaredTools.has(resolved) ? resolved : undefined;
  }
  const resolved = NOTEPAD_TOOL_MAP[action];
  return resolved && declaredTools.has(resolved) ? resolved : undefined;
}

function parseInput(memoryInput: string | undefined): Record<string, unknown> {
  if (memoryInput === undefined) {
    return {};
  }

  const parsed = JSON.parse(memoryInput) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--input must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
}

function decodeResult(response: { content: Array<{ type: "text"; text: string }> }): unknown {
  const raw = response.content.filter((item) => item.type === "text").map((item) => item.text).join("\n").trim();
  if (!raw) {
    return "";
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export async function runMemoryCommand(
  command: MemoryCommand,
  action: string | undefined,
  memoryInput: string | undefined,
  cwd: string,
  json: boolean
): Promise<number> {
  if (!action) {
    printErr(`${command} requires a tool name or alias.`);
    return 2;
  }

  const toolName = resolveToolName(command, action);
  if (!toolName) {
    printErr(`Unknown ${command} action: ${action}`);
    return 2;
  }

  let inputArgs: Record<string, unknown>;
  try {
    inputArgs = parseInput(memoryInput);
  } catch (error) {
    printErr(error instanceof Error ? error.message : "Failed to parse --input JSON.");
    return 2;
  }

  const result = await handleMemoryToolCall({
    params: {
      name: toolName,
      arguments: { ...inputArgs, workingDirectory: cwd }
    }
  });
  const payload = decodeResult(result);
  const ok = !("isError" in result && result.isError === true);
  const exitCode = ok ? 0 : 1;

  if (json) {
    printJson({ command, tool: toolName, ok, result: payload });
    return exitCode;
  }

  if (typeof payload === "string") {
    if (payload.trim().length > 0) {
      if (ok) {
        print(payload);
      } else {
        printErr(payload);
      }
    }
  } else {
    const output = JSON.stringify(payload, null, 2);
    if (ok) {
      print(output);
    } else {
      printErr(output);
    }
  }

  return exitCode;
}
