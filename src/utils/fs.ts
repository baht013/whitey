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

export async function ensureStorage(cwd: string): Promise<void> {
  await mkdir(runsDir(cwd), { recursive: true });
}
