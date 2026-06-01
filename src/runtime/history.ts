import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { ensureStorage, historyFile, runsDir } from "../utils/fs.js";
import type { RunRecord, RunResult } from "../types/index.js";

export function makePromptDigest(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

export function makePromptPreview(prompt: string): string {
  return prompt.length <= 100 ? prompt : `${prompt.slice(0, 97)}...`;
}

export async function persistRun(cwd: string, prompt: string, result: RunResult): Promise<RunRecord> {
  await ensureStorage(cwd);

  const id = randomUUID();
  const transcriptPath = path.join(runsDir(cwd), `${id}.json`);
  const startedAt = result.startedAt;
  const endedAt = result.endedAt;
  const record: RunRecord = {
    id,
    promptDigest: makePromptDigest(prompt),
    promptPreview: makePromptPreview(prompt),
    cwd,
    startedAt,
    endedAt,
    durationMs: result.durationMs,
    status: result.status,
    exitCode: result.exitCode,
    summary: result.summary,
    transcriptPath
  };

  const transcript = {
    record,
    result,
    prompt
  };

  await writeFile(transcriptPath, JSON.stringify(transcript, null, 2), "utf8");
  await appendFile(historyFile(cwd), `${JSON.stringify(record)}\n`, "utf8");

  return record;
}

export async function readHistory(cwd: string, limit: number): Promise<RunRecord[]> {
  try {
    const content = await readFile(historyFile(cwd), "utf8");
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const parsed = lines
      .map((line) => {
        try {
          return JSON.parse(line) as RunRecord;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is RunRecord => entry !== null);

    return parsed.slice(-Math.max(1, limit)).reverse();
  } catch {
    return [];
  }
}
