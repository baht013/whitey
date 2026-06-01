import { pathToFileURL } from "node:url";
import path from "node:path";
import { readdir } from "node:fs/promises";
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { hooksDir, hooksLogFile, pluginStateDir } from "../utils/fs.js";
import type { WhiteyLifecycleEventName } from "../types/index.js";

const HOOKS_ENABLED_ENV = "WHITEY_HOOK_PLUGINS";
const HOOKS_TIMEOUT_ENV = "WHITEY_HOOK_PLUGIN_TIMEOUT_MS";
const DEFAULT_HOOK_TIMEOUT_MS = 1500;

type HookEvent = {
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

type PluginSdk = {
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
};

type RuntimePluginDispatchResult = {
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

async function buildSdk(cwd: string, pluginName: string): Promise<PluginSdk> {
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
    }
  };
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

    const envelope: HookEvent = {
      schema_version: "1",
      event,
      timestamp: new Date().toISOString(),
      source: "whitey-run",
      session_id: context.sessionId,
      cwd,
      context: context.context
    };

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
        const sdk = await buildSdk(cwd, pluginName);
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
