import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MANAGED_START = "<!-- WHITEY_MANAGED_START -->";
const MANAGED_END = "<!-- WHITEY_MANAGED_END -->";
const MANUAL_START = "<!-- WHITEY_MANUAL_START -->";
const MANUAL_END = "<!-- WHITEY_MANUAL_END -->";

function print(message: string): void {
  process.stdout.write(`${message}\n`);
}

function printErr(message: string): void {
  process.stderr.write(`${message}\n`);
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function manualSectionPattern(): RegExp {
  return new RegExp(`${escapeRegex(MANUAL_START)}([\\s\\S]*?)${escapeRegex(MANUAL_END)}`);
}

function isManagedAgents(content: string): boolean {
  return content.includes(MANAGED_START) && content.includes(MANAGED_END) && content.includes(MANUAL_START) && content.includes(MANUAL_END);
}

function extractManualSection(content: string): string | null {
  const match = content.match(manualSectionPattern());
  return match ? match[1] : null;
}

function injectManualSection(template: string, manualSection: string): string {
  return template.replace(manualSectionPattern(), `${MANUAL_START}${manualSection}${MANUAL_END}`);
}

function timestampLabel(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function templatePath(): string {
  return path.resolve(__dirname, "../../templates/AGENTS.md");
}

interface AgentsInitOptions {
  targetPath: string | undefined;
  cwd: string;
  dryRun: boolean;
  force: boolean;
  verbose: boolean;
  json: boolean;
}

export async function runAgentsInitCommand(options: AgentsInitOptions): Promise<number> {
  const targetDirectory = path.resolve(options.cwd, options.targetPath ?? ".");
  let directoryStat;
  try {
    directoryStat = await stat(targetDirectory);
  } catch {
    printErr(`Target path does not exist: ${targetDirectory}`);
    return 2;
  }

  if (!directoryStat.isDirectory()) {
    printErr(`Target path is not a directory: ${targetDirectory}`);
    return 2;
  }

  const targetFile = path.join(targetDirectory, "AGENTS.md");
  const backupFile = path.join(
    targetDirectory,
    ".whitey",
    "backups",
    "agents-init",
    `${timestampLabel()}-AGENTS.md`
  );
  const template = await readFile(templatePath(), "utf8");

  let existingContent: string | undefined;
  let wasManaged = false;
  let preservedManual = false;
  if (existsSync(targetFile)) {
    existingContent = await readFile(targetFile, "utf8");
    wasManaged = isManagedAgents(existingContent);
    if (!wasManaged && !options.force) {
      printErr("AGENTS.md exists and is unmanaged. Re-run with --force to overwrite.");
      return 1;
    }
  }

  let finalContent = template;
  if (existingContent && wasManaged) {
    const manualSection = extractManualSection(existingContent);
    if (manualSection !== null) {
      finalContent = injectManualSection(template, manualSection);
      preservedManual = true;
    }
  }

  if (options.dryRun) {
    const report = {
      command: "agents-init",
      ok: true,
      dryRun: true,
      target: targetFile,
      willWrite: true,
      overwrite: Boolean(existingContent),
      backup: existingContent ? backupFile : null,
      managedSource: wasManaged,
      preservedManual
    };
    if (options.json) {
      printJson(report);
    } else {
      print(`Dry run: would write ${targetFile}`);
      if (existingContent) {
        print(`Dry run: would back up existing file to ${backupFile}`);
      }
    }
    return 0;
  }

  if (existingContent) {
    await mkdir(path.dirname(backupFile), { recursive: true });
    await writeFile(backupFile, existingContent, "utf8");
  }

  await writeFile(targetFile, finalContent, "utf8");

  if (options.json) {
    printJson({
      command: "agents-init",
      ok: true,
      target: targetFile,
      backup: existingContent ? backupFile : null,
      managedSource: wasManaged,
      preservedManual
    });
    return 0;
  }

  print(`Wrote ${targetFile}`);
  if (existingContent) {
    print(`Backed up previous file to ${backupFile}`);
  }
  if (options.verbose && preservedManual) {
    print("Preserved manual section from existing managed file.");
  }
  return 0;
}
