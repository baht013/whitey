import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { notepadPath, projectMemoryPath } from "../mcp/paths.js";
import { extractNotepadSection, readProjectMemory, type ProjectMemory } from "../mcp/memory-tools.js";

const MEMORY_CONTEXT_ENV = "WHITEY_MEMORY_CONTEXT";
const MAX_INLINE_LENGTH = 220;
const MAX_PRIORITY_LENGTH = 1200;

function truncateInline(value: string, maxLength = MAX_INLINE_LENGTH): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function truncateBlock(value: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function firstDirective(memory: ProjectMemory): string | undefined {
  if (!memory.directives || memory.directives.length === 0) {
    return undefined;
  }

  const directive = memory.directives.find((item) => item.priority === "high" && item.directive.trim().length > 0)
    ?? memory.directives.find((item) => item.directive.trim().length > 0);
  if (!directive) {
    return undefined;
  }

  const context = directive.context?.trim();
  const text = context ? `${directive.directive} (context: ${context})` : directive.directive;
  return truncateInline(text);
}

function firstNote(memory: ProjectMemory): string | undefined {
  if (!memory.notes || memory.notes.length === 0) {
    return undefined;
  }

  const note = memory.notes.find((item) => item.content.trim().length > 0);
  if (!note) {
    return undefined;
  }

  const category = note.category.trim();
  const text = category ? `[${category}] ${note.content}` : note.content;
  return truncateInline(text);
}

function projectMemorySection(sourcePath: string, memory: ProjectMemory): string {
  const lines = ["[Whitey project memory]", `source: ${sourcePath}`];

  if (memory.techStack?.trim()) {
    lines.push(`tech stack: ${truncateInline(memory.techStack)}`);
  }
  if (memory.conventions?.trim()) {
    lines.push(`conventions: ${truncateInline(memory.conventions)}`);
  }
  if (memory.build?.trim()) {
    lines.push(`build command: ${truncateInline(memory.build)}`);
  }

  const directive = firstDirective(memory);
  if (directive) {
    lines.push(`priority directive: ${directive}`);
  }

  const note = firstNote(memory);
  if (note) {
    lines.push(`note: ${note}`);
  }

  return lines.join("\n");
}

function prioritySection(priority: string): string {
  return `[Whitey priority notes]\n${truncateBlock(priority, MAX_PRIORITY_LENGTH)}`;
}

export function isMemoryContextEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[MEMORY_CONTEXT_ENV] !== "0";
}

export async function buildRunMemoryContext(cwd: string): Promise<string> {
  const sections: string[] = [];
  const projectPath = projectMemoryPath(cwd);
  if (existsSync(projectPath)) {
    const memory = await readProjectMemory(projectPath);
    sections.push(projectMemorySection(projectPath, memory));
  }

  const notesPath = notepadPath(cwd);
  if (existsSync(notesPath)) {
    const notepad = await readFile(notesPath, "utf8");
    const priority = extractNotepadSection(notepad, "priority");
    if (priority.trim().length > 0) {
      sections.push(prioritySection(priority));
    }
  }

  return sections.join("\n\n");
}
