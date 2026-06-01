import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

const REQUIRED_TOOLS = [
  "project_memory_read",
  "project_memory_write",
  "project_memory_add_note",
  "project_memory_add_directive",
  "notepad_read",
  "notepad_write_priority",
  "notepad_write_working",
  "notepad_write_manual",
  "notepad_prune",
  "notepad_stats"
] as const;

process.env.WHITEY_MEMORY_SERVER_DISABLE_AUTO_START = "1";

describe("mcp/memory-server", () => {
  it("declares expected memory tools", async () => {
    const { buildMemoryServerTools } = await import("../memory-server.js");
    const names = buildMemoryServerTools().map((tool: { name: string }) => tool.name);

    for (const tool of REQUIRED_TOOLS) {
      assert.ok(names.includes(tool), `missing tool declaration: ${tool}`);
    }
  });

  it("writes and reads project memory", async () => {
    const { handleMemoryToolCall } = await import("../memory-server.js");
    const wd = await mkdtemp(join(tmpdir(), "whitey-mcp-memory-"));

    const write = await handleMemoryToolCall({
      params: {
        name: "project_memory_write",
        arguments: {
          workingDirectory: wd,
          memory: { techStack: "typescript", build: "npm run build" }
        }
      }
    });
    assert.equal("isError" in write, false);

    const read = await handleMemoryToolCall({
      params: {
        name: "project_memory_read",
        arguments: { workingDirectory: wd }
      }
    });

    const payload = JSON.parse(read.content[0]?.text || "{}");
    assert.equal(payload.techStack, "typescript");
    assert.equal(payload.build, "npm run build");
  });

  it("handles notes and directives append", async () => {
    const { handleMemoryToolCall } = await import("../memory-server.js");
    const wd = await mkdtemp(join(tmpdir(), "whitey-mcp-memory-"));

    await handleMemoryToolCall({
      params: {
        name: "project_memory_add_note",
        arguments: {
          workingDirectory: wd,
          category: "architecture",
          content: "Use runtime/provider separation"
        }
      }
    });

    await handleMemoryToolCall({
      params: {
        name: "project_memory_add_directive",
        arguments: {
          workingDirectory: wd,
          directive: "Always run tests after edits",
          priority: "high"
        }
      }
    });

    const read = await handleMemoryToolCall({
      params: {
        name: "project_memory_read",
        arguments: { workingDirectory: wd }
      }
    });

    const payload = JSON.parse(read.content[0]?.text || "{}");
    assert.equal(Array.isArray(payload.notes), true);
    assert.equal(Array.isArray(payload.directives), true);
    assert.equal(payload.notes.length, 1);
    assert.equal(payload.directives.length, 1);
  });

  it("returns error for malformed project memory", async () => {
    const { handleMemoryToolCall } = await import("../memory-server.js");
    const wd = await mkdtemp(join(tmpdir(), "whitey-mcp-memory-"));
    const memoryDir = join(wd, ".whitey", "memory");
    await mkdir(memoryDir, { recursive: true });
    await writeFile(join(memoryDir, "project-memory.json"), "{", "utf8");

    const response = await handleMemoryToolCall({
      params: {
        name: "project_memory_read",
        arguments: { workingDirectory: wd }
      }
    });

    assert.equal("isError" in response ? response.isError : false, true);
    const payload = JSON.parse(response.content[0]?.text || "{}");
    assert.match(payload.error, /Invalid project memory JSON/);
  });

  it("writes notepad sections and reports stats", async () => {
    const { handleMemoryToolCall } = await import("../memory-server.js");
    const wd = await mkdtemp(join(tmpdir(), "whitey-mcp-memory-"));

    await handleMemoryToolCall({
      params: {
        name: "notepad_write_priority",
        arguments: {
          workingDirectory: wd,
          content: "Keep responses concise"
        }
      }
    });

    await handleMemoryToolCall({
      params: {
        name: "notepad_write_working",
        arguments: {
          workingDirectory: wd,
          content: "Investigated MCP wiring"
        }
      }
    });

    const stats = await handleMemoryToolCall({
      params: {
        name: "notepad_stats",
        arguments: { workingDirectory: wd }
      }
    });

    const payload = JSON.parse(stats.content[0]?.text || "{}");
    assert.equal(payload.exists, true);
    assert.equal(payload.sections.working, 1);

    const notepad = await readFile(join(wd, ".whitey", "memory", "notepad.md"), "utf8");
    assert.match(notepad, /## PRIORITY/);
    assert.match(notepad, /## WORKING MEMORY/);
  });

  it("returns validation error for invalid prune argument", async () => {
    const { handleMemoryToolCall } = await import("../memory-server.js");
    const wd = await mkdtemp(join(tmpdir(), "whitey-mcp-memory-"));

    await handleMemoryToolCall({
      params: {
        name: "notepad_write_working",
        arguments: {
          workingDirectory: wd,
          content: "seed entry"
        }
      }
    });

    const response = await handleMemoryToolCall({
      params: {
        name: "notepad_prune",
        arguments: {
          workingDirectory: wd,
          daysOld: -1
        }
      }
    });

    assert.equal("isError" in response ? response.isError : false, true);
    const payload = JSON.parse(response.content[0]?.text || "{}");
    assert.match(payload.error, />= 0/);
  });
});
