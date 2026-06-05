import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { existsSync } from "node:fs";
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

export function canonicalProjectMemoryPath(workingDirectory: string): string {
  return path.join(workingDirectory, "project-memory.json");
}

export type ProjectMemorySourceKind = "whitey" | "canonical";

export interface ProjectMemorySource {
  kind: ProjectMemorySourceKind;
  path: string;
  exists: boolean;
  precedence: number;
  selected: boolean;
  shadowed: boolean;
}

export function resolveProjectMemorySource(workingDirectory: string): {
  selected: ProjectMemorySource | null;
  sources: ProjectMemorySource[];
} {
  const whiteyPath = projectMemoryPath(workingDirectory);
  const canonicalPath = canonicalProjectMemoryPath(workingDirectory);
  const whiteyExists = existsSync(whiteyPath);
  const canonicalExists = existsSync(canonicalPath);

  const selectedKind: ProjectMemorySourceKind | null = whiteyExists ? "whitey" : (canonicalExists ? "canonical" : null);
  const sources: ProjectMemorySource[] = [
    {
      kind: "whitey",
      path: whiteyPath,
      exists: whiteyExists,
      precedence: 1,
      selected: selectedKind === "whitey",
      shadowed: selectedKind !== "whitey" && whiteyExists
    },
    {
      kind: "canonical",
      path: canonicalPath,
      exists: canonicalExists,
      precedence: 2,
      selected: selectedKind === "canonical",
      shadowed: selectedKind === "whitey" && canonicalExists
    }
  ];

  return {
    selected: sources.find((source) => source.selected) ?? null,
    sources
  };
}

export function notepadPath(workingDirectory: string): string {
  return path.join(memoryRoot(workingDirectory), "notepad.md");
}
