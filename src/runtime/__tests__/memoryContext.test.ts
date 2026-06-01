import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildRunMemoryContext, isMemoryContextEnabled } from "../memoryContext.js";
import { withEnv } from "../../test-support/env.js";

describe("runtime/memoryContext", () => {
  it("returns empty context when no memory files exist", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "whitey-memory-context-"));
    const context = await buildRunMemoryContext(cwd);
    assert.equal(context, "");
  });

  it("throws on malformed project-memory json", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "whitey-memory-context-"));
    await mkdir(join(cwd, ".whitey", "memory"), { recursive: true });
    await writeFile(join(cwd, ".whitey", "memory", "project-memory.json"), "{", "utf8");
    await assert.rejects(buildRunMemoryContext(cwd), SyntaxError);
  });

  it("builds project and priority sections", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "whitey-memory-context-"));
    await mkdir(join(cwd, ".whitey", "memory"), { recursive: true });
    await writeFile(
      join(cwd, ".whitey", "memory", "project-memory.json"),
      JSON.stringify(
        {
          techStack: "TypeScript",
          build: "npm run build",
          conventions: "Be concise",
          directives: [{ directive: "Always run tests", priority: "high", timestamp: "2026-01-01T00:00:00.000Z" }],
          notes: [{ category: "ops", content: "Watch perf", timestamp: "2026-01-01T00:00:00.000Z" }]
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(cwd, ".whitey", "memory", "notepad.md"), "## PRIORITY\nShip this first\n", "utf8");

    const context = await buildRunMemoryContext(cwd);
    assert.match(context, /\[Whitey project memory\]/);
    assert.match(context, /priority directive: Always run tests/);
    assert.match(context, /\[Whitey priority notes\]/);
    assert.match(context, /Ship this first/);
  });

  it("honors WHITEY_MEMORY_CONTEXT env toggle", async () => {
    await withEnv({ WHITEY_MEMORY_CONTEXT: "0" }, async () => {
      assert.equal(isMemoryContextEnabled(), false);
    });
    await withEnv({ WHITEY_MEMORY_CONTEXT: undefined }, async () => {
      assert.equal(isMemoryContextEnabled(), true);
    });
  });
});
