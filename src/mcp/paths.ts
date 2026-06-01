import { access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

export async function resolveWorkingDirectory(workingDirectory?: string): Promise<string> {
  const cwd = process.cwd();
  const resolved = workingDirectory ? path.resolve(workingDirectory) : cwd;

  await access(resolved, constants.R_OK | constants.W_OK);
  return resolved;
}

export function memoryRoot(workingDirectory: string): string {
  return path.join(workingDirectory, ".whitey", "memory");
}

export function projectMemoryPath(workingDirectory: string): string {
  return path.join(memoryRoot(workingDirectory), "project-memory.json");
}

export function notepadPath(workingDirectory: string): string {
  return path.join(memoryRoot(workingDirectory), "notepad.md");
}
