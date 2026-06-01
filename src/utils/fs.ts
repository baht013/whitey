import { mkdir } from "node:fs/promises";
import path from "node:path";

export const WHITEY_DIR = ".whitey";

export function whiteyRoot(cwd: string): string {
  return path.join(cwd, WHITEY_DIR);
}

export function runsDir(cwd: string): string {
  return path.join(whiteyRoot(cwd), "runs");
}

export function historyFile(cwd: string): string {
  return path.join(whiteyRoot(cwd), "history.jsonl");
}

export function stateDir(cwd: string): string {
  return path.join(whiteyRoot(cwd), "state");
}

export function logsDir(cwd: string): string {
  return path.join(whiteyRoot(cwd), "logs");
}

export function sessionStateFile(cwd: string): string {
  return path.join(stateDir(cwd), "session.json");
}

export function sessionHistoryFile(cwd: string): string {
  return path.join(logsDir(cwd), "session-history.jsonl");
}

export function lifecycleLogFile(cwd: string, date = new Date()): string {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return path.join(logsDir(cwd), `lifecycle-${yyyy}-${mm}-${dd}.jsonl`);
}

export function hooksLogFile(cwd: string, date = new Date()): string {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return path.join(logsDir(cwd), `hooks-${yyyy}-${mm}-${dd}.jsonl`);
}

export function hooksDir(cwd: string): string {
  return path.join(whiteyRoot(cwd), "hooks");
}

export function pluginStateRoot(cwd: string): string {
  return path.join(whiteyRoot(cwd), "plugin-state");
}

export function pluginStateDir(cwd: string, pluginName: string): string {
  return path.join(pluginStateRoot(cwd), pluginName);
}

export async function ensureStorage(cwd: string): Promise<void> {
  await mkdir(runsDir(cwd), { recursive: true });
  await mkdir(stateDir(cwd), { recursive: true });
  await mkdir(logsDir(cwd), { recursive: true });
}
