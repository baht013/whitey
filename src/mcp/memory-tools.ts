import { existsSync } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { parseNotepadPruneDaysOld } from "./memory-validation.js";
import {
  memoryRoot,
  notepadPath,
  projectMemoryPath,
  resolveProjectMemorySource,
  resolveWorkingDirectory
} from "./paths.js";

export interface ProjectMemory {
  techStack?: string;
  build?: string;
  conventions?: string;
  structure?: string;
  notes?: Array<{ category: string; content: string; timestamp: string }>;
  directives?: Array<{ directive: string; priority: "high" | "normal"; context?: string; timestamp: string }>;
}

type ProjectMemoryReadResult = { ok: true; data: ProjectMemory } | { ok: false; error: string };

const DEFAULT_NOTEPAD_TEMPLATE = "## PRIORITY\n\n## WORKING MEMORY\n\n## MANUAL\n";
const DEFAULT_HYGIENE_DAYS = 7;
const MAX_NOTES = 50;
const MAX_DIRECTIVES = 25;

export function buildMemoryServerTools() {
  return [
    {
      name: "project_memory_read",
      description: "Read project memory or one section.",
      inputSchema: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: ["all", "techStack", "build", "conventions", "structure", "notes", "directives"]
          },
          workingDirectory: { type: "string" }
        }
      }
    },
    {
      name: "project_memory_write",
      description: "Write project memory. Supports merge mode.",
      inputSchema: {
        type: "object",
        properties: {
          memory: { type: "object" },
          merge: { type: "boolean" },
          workingDirectory: { type: "string" }
        },
        required: ["memory"]
      }
    },
    {
      name: "project_memory_add_note",
      description: "Append a timestamped note to project memory.",
      inputSchema: {
        type: "object",
        properties: {
          category: { type: "string" },
          content: { type: "string" },
          workingDirectory: { type: "string" }
        },
        required: ["category", "content"]
      }
    },
    {
      name: "project_memory_add_directive",
      description: "Append a persistent directive with priority.",
      inputSchema: {
        type: "object",
        properties: {
          directive: { type: "string" },
          priority: { type: "string", enum: ["high", "normal"] },
          context: { type: "string" },
          workingDirectory: { type: "string" }
        },
        required: ["directive"]
      }
    },
    {
      name: "notepad_read",
      description: "Read all notepad content or one section.",
      inputSchema: {
        type: "object",
        properties: {
          section: { type: "string", enum: ["all", "priority", "working", "manual"] },
          workingDirectory: { type: "string" }
        }
      }
    },
    {
      name: "notepad_write_priority",
      description: "Replace the priority section (max 500 chars).",
      inputSchema: {
        type: "object",
        properties: {
          content: { type: "string" },
          workingDirectory: { type: "string" }
        },
        required: ["content"]
      }
    },
    {
      name: "notepad_write_working",
      description: "Append a timestamped working-memory line.",
      inputSchema: {
        type: "object",
        properties: {
          content: { type: "string" },
          workingDirectory: { type: "string" }
        },
        required: ["content"]
      }
    },
    {
      name: "notepad_write_manual",
      description: "Append a manual entry.",
      inputSchema: {
        type: "object",
        properties: {
          content: { type: "string" },
          workingDirectory: { type: "string" }
        },
        required: ["content"]
      }
    },
    {
      name: "notepad_prune",
      description: "Prune working-memory entries older than N days.",
      inputSchema: {
        type: "object",
        properties: {
          daysOld: { type: "integer", minimum: 0 },
          workingDirectory: { type: "string" }
        }
      }
    },
    {
      name: "notepad_stats",
      description: "Get notepad stats and section counts.",
      inputSchema: {
        type: "object",
        properties: {
          workingDirectory: { type: "string" }
        }
      }
    }
  ];
}

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorText(message: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }], isError: true };
}

function toSectionHeader(section: string): string {
  return `## ${section.toUpperCase()}`;
}

export function extractNotepadSection(content: string, section: string): string {
  const header = toSectionHeader(section);
  const idx = content.indexOf(header);
  if (idx < 0) return "";
  const nextHeader = content.indexOf("\n## ", idx + header.length);
  if (nextHeader < 0) {
    return content.slice(idx + header.length).trim();
  }
  return content.slice(idx + header.length, nextHeader).trim();
}

function replaceSection(content: string, section: string, newContent: string): string {
  const header = toSectionHeader(section);
  const idx = content.indexOf(header);
  if (idx < 0) {
    const prefix = content.trim().length > 0 ? `${content.trimEnd()}\n\n` : "";
    return `${prefix}${header}\n${newContent.trim()}\n`;
  }

  const nextHeader = content.indexOf("\n## ", idx + header.length);
  const replacement = `${header}\n${newContent.trim()}\n`;
  if (nextHeader < 0) {
    return `${content.slice(0, idx)}${replacement}`;
  }
  return `${content.slice(0, idx)}${replacement}${content.slice(nextHeader)}`;
}

function appendToSection(content: string, section: string, entry: string): string {
  const existing = extractNotepadSection(content, section);
  const merged = existing.trim().length > 0 ? `${existing}\n${entry}` : entry;
  return replaceSection(content, section, merged);
}

async function writeAtomic(filePath: string, content: string): Promise<void> {
  const tmpPath = `${filePath}.tmp.${process.pid}`;
  await writeFile(tmpPath, content, "utf8");
  await rename(tmpPath, filePath);
}

export async function appendNotepadWorkingEntry(
  workingDirectory: string,
  content: string,
  timestamp = new Date().toISOString()
): Promise<void> {
  const notePath = notepadPath(workingDirectory);
  await mkdir(memoryRoot(workingDirectory), { recursive: true });
  const existing = existsSync(notePath) ? await readFile(notePath, "utf8") : "";
  const entry = `[${timestamp}] ${content}`;
  const updated = appendToSection(existing, "working memory", entry);
  await writeAtomic(notePath, updated);
}

export async function ensureNotepadTemplate(workingDirectory: string): Promise<{ created: boolean }> {
  const notePath = notepadPath(workingDirectory);
  await mkdir(memoryRoot(workingDirectory), { recursive: true });
  if (existsSync(notePath)) {
    return { created: false };
  }
  await writeAtomic(notePath, DEFAULT_NOTEPAD_TEMPLATE);
  return { created: true };
}

export async function readProjectMemory(filePath: string): Promise<ProjectMemory> {
  if (!existsSync(filePath)) {
    return {};
  }

  const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Project memory must be a JSON object.");
  }

  return parsed as ProjectMemory;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function readProjectMemoryResult(filePath: string): Promise<ProjectMemoryReadResult> {
  try {
    return { ok: true, data: await readProjectMemory(filePath) };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, error: "Invalid project memory JSON." };
    }
    return { ok: false, error: errorMessage(error, "Failed to read project memory.") };
  }
}

function normalizeToken(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function toTimestampValue(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNotes(notes: ProjectMemory["notes"] = []): Array<{ category: string; content: string; timestamp: string }> {
  const deduped = new Map<string, { category: string; content: string; timestamp: string }>();
  for (const note of notes) {
    if (!note || typeof note.category !== "string" || typeof note.content !== "string") {
      continue;
    }
    const category = note.category.trim();
    const content = note.content.trim();
    if (!category || !content) {
      continue;
    }
    const timestamp = typeof note.timestamp === "string" ? note.timestamp : new Date(0).toISOString();
    const key = `${normalizeToken(category)}|${normalizeToken(content)}`;
    const existing = deduped.get(key);
    if (!existing || toTimestampValue(timestamp) >= toTimestampValue(existing.timestamp)) {
      deduped.set(key, { category, content, timestamp });
    }
  }
  return [...deduped.values()]
    .sort((a, b) => toTimestampValue(b.timestamp) - toTimestampValue(a.timestamp))
    .slice(0, MAX_NOTES);
}

function directivePriority(value: "high" | "normal" | undefined): number {
  return value === "high" ? 2 : 1;
}

function normalizeDirectives(
  directives: ProjectMemory["directives"] = []
): Array<{ directive: string; priority: "high" | "normal"; context?: string; timestamp: string }> {
  const deduped = new Map<string, { directive: string; priority: "high" | "normal"; context?: string; timestamp: string }>();
  for (const directiveEntry of directives) {
    if (!directiveEntry || typeof directiveEntry.directive !== "string") {
      continue;
    }
    const directive = directiveEntry.directive.trim();
    if (!directive) {
      continue;
    }
    const timestamp = typeof directiveEntry.timestamp === "string"
      ? directiveEntry.timestamp
      : new Date(0).toISOString();
    const priority = directiveEntry.priority === "high" ? "high" : "normal";
    const context = typeof directiveEntry.context === "string" ? directiveEntry.context.trim() : undefined;
    const key = normalizeToken(directive);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, { directive, priority, context, timestamp });
      continue;
    }

    const existingPriority = directivePriority(existing.priority);
    const nextPriority = directivePriority(priority);
    const existingTs = toTimestampValue(existing.timestamp);
    const nextTs = toTimestampValue(timestamp);
    const shouldReplace = nextPriority > existingPriority || (nextPriority === existingPriority && nextTs >= existingTs);
    if (shouldReplace) {
      deduped.set(key, {
        directive,
        priority,
        context: context || existing.context,
        timestamp
      });
      continue;
    }
    if (!existing.context && context) {
      deduped.set(key, { ...existing, context });
    }
  }
  return [...deduped.values()]
    .sort((a, b) => toTimestampValue(b.timestamp) - toTimestampValue(a.timestamp))
    .slice(0, MAX_DIRECTIVES);
}

export async function applyProjectMemoryHygiene(workingDirectory: string): Promise<{
  selectedSource: string;
  notesBefore: number;
  notesAfter: number;
  directivesBefore: number;
  directivesAfter: number;
}> {
  const resolution = resolveProjectMemorySource(workingDirectory);
  const selectedPath = resolution.selected?.path ?? projectMemoryPath(workingDirectory);
  const result = await readProjectMemoryResult(selectedPath);
  if (!result.ok) {
    throw new Error(result.error);
  }

  const data = result.data;
  const notesBefore = Array.isArray(data.notes) ? data.notes.length : 0;
  const directivesBefore = Array.isArray(data.directives) ? data.directives.length : 0;
  const notes = normalizeNotes(data.notes);
  const directives = normalizeDirectives(data.directives);
  const updated: ProjectMemory = {
    ...data,
    notes,
    directives
  };

  await mkdir(memoryRoot(workingDirectory), { recursive: true });
  await writeAtomic(projectMemoryPath(workingDirectory), JSON.stringify(updated, null, 2));
  return {
    selectedSource: selectedPath,
    notesBefore,
    notesAfter: notes.length,
    directivesBefore,
    directivesAfter: directives.length
  };
}

export async function pruneNotepadWorkingEntries(
  workingDirectory: string,
  daysOld = DEFAULT_HYGIENE_DAYS
): Promise<{ pruned: number; remaining: number; message?: string }> {
  const notePath = notepadPath(workingDirectory);
  if (!existsSync(notePath)) {
    return { pruned: 0, remaining: 0, message: "No notepad file found" };
  }

  const content = await readFile(notePath, "utf8");
  const workingSection = extractNotepadSection(content, "working memory");
  if (!workingSection) {
    return { pruned: 0, remaining: 0, message: "No working memory entries found" };
  }

  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const lines = workingSection.split("\n");
  let pruned = 0;
  const kept: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\]/);
    if (!match) {
      kept.push(line);
      continue;
    }

    const entryTime = new Date(match[1]).getTime();
    if (entryTime < cutoff) {
      pruned += 1;
      continue;
    }
    kept.push(line);
  }

  if (pruned > 0) {
    const updated = replaceSection(content, "working memory", kept.join("\n"));
    await writeAtomic(notePath, updated);
  }

  return { pruned, remaining: kept.filter((line) => /^\[/.test(line)).length };
}

export async function handleMemoryToolCall(request: {
  params: { name: string; arguments?: Record<string, unknown> };
}) {
  const { name, arguments: rawArgs = {} } = request.params;
  const toolArgs = rawArgs as Record<string, unknown>;

  let wd: string;
  try {
    wd = await resolveWorkingDirectory(toolArgs.workingDirectory as string | undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve working directory.";
    return errorText(message);
  }

  const memPath = projectMemoryPath(wd);
  const notePath = notepadPath(wd);

  switch (name) {
    case "project_memory_read": {
      const selected = resolveProjectMemorySource(wd).selected;
      const selectedPath = selected?.path;
      const result = await readProjectMemoryResult(selectedPath ?? memPath);
      if (!result.ok) {
        return errorText(result.error);
      }

      const data = result.data;
      const section = toolArgs.section as string | undefined;
      if (section && section !== "all" && section in data) {
        return text((data as Record<string, unknown>)[section]);
      }
      return text(data);
    }

    case "project_memory_write": {
      const newMemory = toolArgs.memory as Record<string, unknown>;
      if (!newMemory || typeof newMemory !== "object" || Array.isArray(newMemory)) {
        return errorText("memory must be an object");
      }

      await mkdir(memoryRoot(wd), { recursive: true });
      const merge = Boolean(toolArgs.merge);
      if (merge) {
        const result = await readProjectMemoryResult(memPath);
        if (!result.ok) {
          return errorText(result.error);
        }

        const existing = result.data;
        await writeAtomic(memPath, JSON.stringify({ ...existing, ...newMemory }, null, 2));
      } else {
        await writeAtomic(memPath, JSON.stringify(newMemory, null, 2));
      }
      return text({ success: true });
    }

    case "project_memory_add_note": {
      const category = toolArgs.category as string;
      const content = toolArgs.content as string;
      if (!category || !content) {
        return errorText("category and content are required");
      }

      await mkdir(memoryRoot(wd), { recursive: true });
      const result = await readProjectMemoryResult(memPath);
      if (!result.ok) {
        return errorText(result.error);
      }

      const data = result.data;
      if (!data.notes) data.notes = [];
      data.notes.push({ category, content, timestamp: new Date().toISOString() });
      await writeAtomic(memPath, JSON.stringify(data, null, 2));
      return text({ success: true, noteCount: data.notes.length });
    }

    case "project_memory_add_directive": {
      const directive = toolArgs.directive as string;
      if (!directive) {
        return errorText("directive is required");
      }

      await mkdir(memoryRoot(wd), { recursive: true });
      const result = await readProjectMemoryResult(memPath);
      if (!result.ok) {
        return errorText(result.error);
      }

      const data = result.data;
      if (!data.directives) data.directives = [];
      data.directives.push({
        directive,
        priority: (toolArgs.priority as "high" | "normal") || "normal",
        context: toolArgs.context as string | undefined,
        timestamp: new Date().toISOString()
      });
      await writeAtomic(memPath, JSON.stringify(data, null, 2));
      return text({ success: true, directiveCount: data.directives.length });
    }

    case "notepad_read": {
      if (!existsSync(notePath)) {
        return text({ exists: false, content: "" });
      }

      const content = await readFile(notePath, "utf8");
      const section = toolArgs.section as string | undefined;
      if (section && section !== "all") {
        const sectionName = section === "working" ? "working memory" : section;
        return text({ section, content: extractNotepadSection(content, sectionName) });
      }
      return text({ exists: true, content });
    }

    case "notepad_write_priority": {
      const content = ((toolArgs.content as string) || "").slice(0, 500);
      await mkdir(memoryRoot(wd), { recursive: true });
      const existing = existsSync(notePath) ? await readFile(notePath, "utf8") : "";
      const updated = replaceSection(existing, "priority", content);
      await writeAtomic(notePath, updated);
      return text({ success: true });
    }

    case "notepad_write_working": {
      const content = toolArgs.content as string;
      if (!content) {
        return errorText("content is required");
      }

      await appendNotepadWorkingEntry(wd, content);
      return text({ success: true });
    }

    case "notepad_write_manual": {
      const content = toolArgs.content as string;
      if (!content) {
        return errorText("content is required");
      }

      await mkdir(memoryRoot(wd), { recursive: true });
      const existing = existsSync(notePath) ? await readFile(notePath, "utf8") : "";
      const updated = appendToSection(existing, "manual", content);
      await writeAtomic(notePath, updated);
      return text({ success: true });
    }

    case "notepad_prune": {
      const parsedDays = parseNotepadPruneDaysOld(toolArgs.daysOld);
      if (!parsedDays.ok) {
        return errorText(parsedDays.error);
      }

      const result = await pruneNotepadWorkingEntries(wd, parsedDays.days);
      return text(result);
    }

    case "notepad_stats": {
      if (!existsSync(notePath)) {
        return text({ exists: false, size: 0, entryCount: 0, oldestEntry: null, newestEntry: null });
      }

      const content = await readFile(notePath, "utf8");
      const noteStat = await stat(notePath);
      const workingSection = extractNotepadSection(content, "working memory");
      const prioritySection = extractNotepadSection(content, "priority");
      const manualSection = extractNotepadSection(content, "manual");

      const timestamps = (workingSection.match(/^\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\]/gm) || []).map((line) =>
        line.slice(1, line.indexOf("]"))
      );

      return text({
        exists: true,
        size: noteStat.size,
        sections: {
          priority: prioritySection.trim().length,
          working: timestamps.length,
          manual: manualSection.split("\n").filter((line) => line.trim().length > 0).length
        },
        entryCount: timestamps.length,
        oldestEntry: timestamps.length > 0 ? timestamps[0] : null,
        newestEntry: timestamps.length > 0 ? timestamps[timestamps.length - 1] : null
      });
    }

    default:
      return { content: [{ type: "text" as const, text: `Unknown tool: ${name}` }], isError: true };
  }
}
