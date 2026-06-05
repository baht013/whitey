import { pathToFileURL } from "node:url";
import path from "node:path";
import { readdir } from "node:fs/promises";
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { hooksDir, hooksLogFile, pluginStateDir } from "../utils/fs.js";
import type { WhiteyLifecycleEventName } from "../types/index.js";
import { handleMemoryToolCall } from "../mcp/memory-tools.js";
import { onBuiltinMemoryCaptureEvent } from "./memoryCaptureHook.js";

const HOOKS_ENABLED_ENV = "WHITEY_HOOK_PLUGINS";
const HOOKS_TIMEOUT_ENV = "WHITEY_HOOK_PLUGIN_TIMEOUT_MS";
const DEFAULT_HOOK_TIMEOUT_MS = 1500;

const MEMORY_DISABLED_ERROR = "Memory is disabled for this run.";
const BUILTIN_MEMORY_CAPTURE_PLUGIN = "builtin-memory-capture";

export type HookEvent = {
  schema_version: "1";
  event: WhiteyLifecycleEventName;
  timestamp: string;
  source: "whitey-run";
  session_id?: string;
  cwd: string;
  context?: Record<string, unknown>;
};

type HookPluginModule = {
  onHookEvent?: (event: HookEvent, sdk: PluginSdk) => Promise<void> | void;
};

export type PluginSdk = {
  log: {
    info: (message: string, data?: Record<string, unknown>) => Promise<void>;
    warn: (message: string, data?: Record<string, unknown>) => Promise<void>;
    error: (message: string, data?: Record<string, unknown>) => Promise<void>;
  };
  state: {
    read: (key: string) => Promise<unknown>;
    write: (key: string, value: unknown) => Promise<void>;
    delete: (key: string) => Promise<void>;
    all: () => Promise<Record<string, unknown>>;
  };
  paths: {
    cwd: string;
    pluginStateDir: string;
  };
  memory: {
    enabled: boolean;
    addNote: (category: string, content: string) => Promise<void>;
    addDirective: (directive: string, options?: { priority?: "high" | "normal"; context?: string }) => Promise<void>;
    writeWorking: (content: string) => Promise<void>;
    readProjectMemory: (
      section?: "all" | "techStack" | "build" | "conventions" | "structure" | "notes" | "directives"
    ) => Promise<unknown>;
    readNotepad: (section?: "all" | "priority" | "working" | "manual") => Promise<unknown>;
  };
};

type MemoryToolCallResult = {
  content?: Array<{ type?: string; text?: string }>;
  isError?: boolean;
};

export type RuntimePluginDispatchResult = {
  loaded: number;
  ran: number;
  failures: Array<{ plugin: string; error: string }>;
};

function areHookPluginsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[HOOKS_ENABLED_ENV] !== "0";
}

function hookTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env[HOOKS_TIMEOUT_ENV];
  if (!raw) {
    return DEFAULT_HOOK_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_HOOK_TIMEOUT_MS;
  }
  return Math.trunc(parsed);
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function safeStateKey(key: string): string {
  return `${safeName(key)}.json`;
}

function parseMemoryToolMessage(response: MemoryToolCallResult, fallback: string): string {
  const text = response.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(text) as { error?: string };
    if (parsed && typeof parsed === "object" && typeof parsed.error === "string") {
      return parsed.error;
    }
  } catch {
    return text;
  }
  return fallback;
}

function parseMemoryToolData(response: MemoryToolCallResult): unknown {
  const text = response.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function callMemoryTool(
  cwd: string,
  name: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  const response = (await handleMemoryToolCall({
    params: {
      name,
      arguments: {
        ...args,
        workingDirectory: cwd
      }
    }
  })) as MemoryToolCallResult;
  if (response.isError) {
    throw new Error(parseMemoryToolMessage(response, `Memory tool failed: ${name}`));
  }
  return parseMemoryToolData(response);
}

function assertMemoryWriteEnabled(enabled: boolean): void {
  if (!enabled) {
    throw new Error(MEMORY_DISABLED_ERROR);
  }
}

async function writeHookLog(
  cwd: string,
  plugin: string,
  level: "info" | "warn" | "error",
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  await mkdir(path.dirname(hooksLogFile(cwd)), { recursive: true });
  await appendFile(
    hooksLogFile(cwd),
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      plugin,
      level,
      message,
      data
    })}\n`,
    "utf8"
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out in ${ms}ms`)), ms);
    void promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function buildSdk(cwd: string, pluginName: string, memoryEnabled: boolean): Promise<PluginSdk> {
  const stateDir = pluginStateDir(cwd, pluginName);
  await mkdir(stateDir, { recursive: true });
  return {
    log: {
      info: async (message, data) => writeHookLog(cwd, pluginName, "info", message, data),
      warn: async (message, data) => writeHookLog(cwd, pluginName, "warn", message, data),
      error: async (message, data) => writeHookLog(cwd, pluginName, "error", message, data)
    },
    state: {
      read: async (key) => {
        try {
          const data = await readFile(path.join(stateDir, safeStateKey(key)), "utf8");
          return JSON.parse(data) as unknown;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return null;
          }
          throw error;
        }
      },
      write: async (key, value) => {
        await writeFile(path.join(stateDir, safeStateKey(key)), `${JSON.stringify(value, null, 2)}\n`, "utf8");
      },
      delete: async (key) => {
        await rm(path.join(stateDir, safeStateKey(key)), { force: true });
      },
      all: async () => {
        const entries = await readdir(stateDir);
        const result: Record<string, unknown> = {};
        for (const entry of entries) {
          if (!entry.endsWith(".json")) {
            continue;
          }
          const key = entry.replace(/\.json$/, "");
          const raw = await readFile(path.join(stateDir, entry), "utf8");
          result[key] = JSON.parse(raw) as unknown;
        }
        return result;
      }
    },
    paths: {
      cwd,
      pluginStateDir: stateDir
    },
    memory: {
      enabled: memoryEnabled,
      addNote: async (category, content) => {
        assertMemoryWriteEnabled(memoryEnabled);
        await callMemoryTool(cwd, "project_memory_add_note", { category, content });
      },
      addDirective: async (directive, options = {}) => {
        assertMemoryWriteEnabled(memoryEnabled);
        await callMemoryTool(cwd, "project_memory_add_directive", {
          directive,
          priority: options.priority,
          context: options.context
        });
      },
      writeWorking: async (content) => {
        assertMemoryWriteEnabled(memoryEnabled);
        await callMemoryTool(cwd, "notepad_write_working", { content });
      },
      readProjectMemory: async (section = "all") => callMemoryTool(cwd, "project_memory_read", { section }),
      readNotepad: async (section = "all") => callMemoryTool(cwd, "notepad_read", { section })
    }
  };
}

function toHookEvent(
  cwd: string,
  event: WhiteyLifecycleEventName,
  context: { sessionId?: string; context?: Record<string, unknown> }
): HookEvent {
  return {
    schema_version: "1",
    event,
    timestamp: new Date().toISOString(),
    source: "whitey-run",
    session_id: context.sessionId,
    cwd,
    context: context.context
  };
}

function memoryEnabledFromContext(context?: Record<string, unknown>): boolean {
  return context?.memoryEnabled !== false;
}

export async function dispatchBuiltinRuntimeHooks(
  cwd: string,
  event: WhiteyLifecycleEventName,
  context: { sessionId?: string; context?: Record<string, unknown> }
): Promise<RuntimePluginDispatchResult> {
  const envelope = toHookEvent(cwd, event, context);
  const timeout = hookTimeoutMs();
  try {
    const sdk = await buildSdk(cwd, BUILTIN_MEMORY_CAPTURE_PLUGIN, memoryEnabledFromContext(context.context));
    await withTimeout(
      Promise.resolve(onBuiltinMemoryCaptureEvent(envelope, sdk)),
      timeout,
      `Plugin ${BUILTIN_MEMORY_CAPTURE_PLUGIN}`
    );
    return { loaded: 1, ran: 1, failures: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown plugin error.";
    await writeHookLog(cwd, BUILTIN_MEMORY_CAPTURE_PLUGIN, "error", "plugin dispatch failed", {
      event,
      error: message
    });
    return {
      loaded: 1,
      ran: 0,
      failures: [{ plugin: BUILTIN_MEMORY_CAPTURE_PLUGIN, error: message }]
    };
  }
}

export async function dispatchRuntimePluginEvent(
  cwd: string,
  event: WhiteyLifecycleEventName,
  context: { sessionId?: string; context?: Record<string, unknown> }
): Promise<RuntimePluginDispatchResult> {
  try {
    if (!areHookPluginsEnabled()) {
      return { loaded: 0, ran: 0, failures: [] };
    }

    const directory = hooksDir(cwd);
    let files: string[] = [];
    try {
      files = (await readdir(directory)).filter((entry) => entry.endsWith(".mjs"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { loaded: 0, ran: 0, failures: [] };
      }
      throw error;
    }

    const envelope = toHookEvent(cwd, event, context);
    const memoryEnabled = memoryEnabledFromContext(context.context);

    const timeout = hookTimeoutMs();
    const failures: Array<{ plugin: string; error: string }> = [];
    let ran = 0;

    for (const file of files) {
      const pluginName = safeName(path.basename(file, ".mjs"));
      try {
        const modulePath = path.join(directory, file);
        const loaded = (await import(pathToFileURL(modulePath).href)) as HookPluginModule;
        if (typeof loaded.onHookEvent !== "function") {
          continue;
        }
        const sdk = await buildSdk(cwd, pluginName, memoryEnabled);
        await withTimeout(Promise.resolve(loaded.onHookEvent(envelope, sdk)), timeout, `Plugin ${pluginName}`);
        ran += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown plugin error.";
        failures.push({ plugin: pluginName, error: message });
        await writeHookLog(cwd, pluginName, "error", "plugin dispatch failed", {
          event,
          error: message
        });
      }
    }

    return {
      loaded: files.length,
      ran,
      failures
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plugin dispatch failed.";
    return {
      loaded: 0,
      ran: 0,
      failures: [{ plugin: "runtime", error: message }]
    };
  }
}
