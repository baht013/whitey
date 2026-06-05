import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { notepadPath, resolveProjectMemorySource } from "../mcp/paths.js";
import { extractNotepadSection, readProjectMemory, type ProjectMemory } from "../mcp/memory-tools.js";

const MEMORY_CONTEXT_ENV = "WHITEY_MEMORY_CONTEXT";
const MAX_INLINE_LENGTH = 220;
const MAX_PRIORITY_LENGTH = 1200;

export type MemoryContextSourceKind = "whitey-project-memory" | "canonical-project-memory" | "notepad";

export interface MemorySourceMetadata {
  kind: MemoryContextSourceKind;
  path: string;
  loaded: boolean;
  selected: boolean;
  shadowed: boolean;
  error?: string;
}

export interface MemorySectionMetadata {
  name:
    | "project.techStack"
    | "project.conventions"
    | "project.build"
    | "project.directive"
    | "project.note"
    | "notepad.priority";
  charCount: number;
  itemCount: number;
}

export interface RunMemoryContextDetails {
  text: string;
  sources: MemorySourceMetadata[];
  sections: MemorySectionMetadata[];
}

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

function toSourceKind(kind: "whitey" | "canonical"): MemoryContextSourceKind {
  return kind === "whitey" ? "whitey-project-memory" : "canonical-project-memory";
}

function addProjectSectionMetadata(sections: MemorySectionMetadata[], memory: ProjectMemory): void {
  if (memory.techStack?.trim()) {
    sections.push({ name: "project.techStack", charCount: memory.techStack.trim().length, itemCount: 1 });
  }
  if (memory.conventions?.trim()) {
    sections.push({ name: "project.conventions", charCount: memory.conventions.trim().length, itemCount: 1 });
  }
  if (memory.build?.trim()) {
    sections.push({ name: "project.build", charCount: memory.build.trim().length, itemCount: 1 });
  }
  const directive = firstDirective(memory);
  if (directive) {
    sections.push({ name: "project.directive", charCount: directive.length, itemCount: 1 });
  }
  const note = firstNote(memory);
  if (note) {
    sections.push({ name: "project.note", charCount: note.length, itemCount: 1 });
  }
}

async function buildProjectMemoryDetails(cwd: string): Promise<{
  sectionText?: string;
  sources: MemorySourceMetadata[];
  sections: MemorySectionMetadata[];
}> {
  const resolution = resolveProjectMemorySource(cwd);
  const sources: MemorySourceMetadata[] = [];
  const sectionMetadata: MemorySectionMetadata[] = [];
  let sectionText: string | undefined;

  for (const source of resolution.sources) {
    const metadata: MemorySourceMetadata = {
      kind: toSourceKind(source.kind),
      path: source.path,
      loaded: false,
      selected: source.selected,
      shadowed: source.shadowed
    };

    if (source.selected) {
      try {
        const memory = await readProjectMemory(source.path);
        metadata.loaded = true;
        if (Object.keys(memory).length > 0) {
          sectionText = projectMemorySection(source.path, memory);
          addProjectSectionMetadata(sectionMetadata, memory);
        }
      } catch (error) {
        metadata.error = error instanceof Error ? error.message : "Failed to read project memory.";
        sources.push(metadata);
        throw error;
      }
    } else if (source.exists) {
      try {
        await readProjectMemory(source.path);
      } catch (error) {
        metadata.error = error instanceof Error ? error.message : "Failed to inspect shadowed project memory.";
      }
    }
    sources.push(metadata);
  }

  return { sectionText, sources, sections: sectionMetadata };
}

export async function buildRunMemoryContextDetails(cwd: string): Promise<RunMemoryContextDetails> {
  const sectionText: string[] = [];
  const sources: MemorySourceMetadata[] = [];
  const sections: MemorySectionMetadata[] = [];

  const projectDetails = await buildProjectMemoryDetails(cwd);
  sources.push(...projectDetails.sources);
  sections.push(...projectDetails.sections);
  if (projectDetails.sectionText) {
    sectionText.push(projectDetails.sectionText);
  }

  const notesPath = notepadPath(cwd);
  const noteSource: MemorySourceMetadata = {
    kind: "notepad",
    path: notesPath,
    loaded: false,
    selected: true,
    shadowed: false
  };
  if (existsSync(notesPath)) {
    noteSource.loaded = true;
    try {
      const notepad = await readFile(notesPath, "utf8");
      const priority = extractNotepadSection(notepad, "priority");
      if (priority.trim().length > 0) {
        const section = prioritySection(priority);
        sectionText.push(section);
        sections.push({
          name: "notepad.priority",
          charCount: priority.trim().length,
          itemCount: priority.split(/\r?\n/).filter((line) => line.trim().length > 0).length
        });
      }
    } catch (error) {
      noteSource.error = error instanceof Error ? error.message : "Failed to read notepad.";
    }
  }
  sources.push(noteSource);

  return { text: sectionText.join("\n\n"), sources, sections };
}

export async function buildRunMemoryContext(cwd: string): Promise<string> {
  const details = await buildRunMemoryContextDetails(cwd);
  return details.text;
}
