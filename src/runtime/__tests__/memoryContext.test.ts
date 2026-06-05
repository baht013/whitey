import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildRunMemoryContext, buildRunMemoryContextDetails, isMemoryContextEnabled } from "../memoryContext.js";
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

  it("loads canonical project-memory fallback when whitey memory is absent", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "whitey-memory-context-"));
    await writeFile(join(cwd, "project-memory.json"), "{\"techStack\":\"Node.js\"}", "utf8");

    const details = await buildRunMemoryContextDetails(cwd);
    assert.match(details.text, /source: .*project-memory\.json/);
    assert.match(details.text, /tech stack: Node\.js/);
    const selected = details.sources.find((source) => source.kind === "canonical-project-memory");
    assert.equal(selected?.selected, true);
    assert.equal(selected?.loaded, true);
  });

  it("prefers whitey project-memory when whitey and canonical files both exist", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "whitey-memory-context-"));
    await mkdir(join(cwd, ".whitey", "memory"), { recursive: true });
    await writeFile(join(cwd, "project-memory.json"), "{\"techStack\":\"Fallback\"}", "utf8");
    await writeFile(join(cwd, ".whitey", "memory", "project-memory.json"), "{\"techStack\":\"Primary\"}", "utf8");

    const details = await buildRunMemoryContextDetails(cwd);
    assert.match(details.text, /tech stack: Primary/);
    assert.doesNotMatch(details.text, /Fallback/);
    const whitey = details.sources.find((source) => source.kind === "whitey-project-memory");
    const canonical = details.sources.find((source) => source.kind === "canonical-project-memory");
    assert.equal(whitey?.selected, true);
    assert.equal(canonical?.shadowed, true);
  });

  it("records shadowed canonical parse errors in metadata without failing", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "whitey-memory-context-"));
    await mkdir(join(cwd, ".whitey", "memory"), { recursive: true });
    await writeFile(join(cwd, ".whitey", "memory", "project-memory.json"), "{\"techStack\":\"TypeScript\"}", "utf8");
    await writeFile(join(cwd, "project-memory.json"), "{", "utf8");

    const details = await buildRunMemoryContextDetails(cwd);
    const canonical = details.sources.find((source) => source.kind === "canonical-project-memory");
    assert.equal(typeof canonical?.error, "string");
    assert.match(canonical?.error || "", /Unexpected end of JSON input/);
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

    const details = await buildRunMemoryContextDetails(cwd);
    assert.match(details.text, /\[Whitey project memory\]/);
    assert.match(details.text, /priority directive: Always run tests/);
    assert.match(details.text, /\[Whitey priority notes\]/);
    assert.match(details.text, /Ship this first/);
    assert.ok(details.sections.some((section) => section.name === "project.techStack"));
    assert.ok(details.sections.some((section) => section.name === "project.directive"));
    assert.ok(details.sections.some((section) => section.name === "notepad.priority"));

    const context = await buildRunMemoryContext(cwd);
    assert.equal(context, details.text);
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
