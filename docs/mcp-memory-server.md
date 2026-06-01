# MCP Memory Server

This document defines the Whitey memory MCP server implementation and usage.

## Entry Point

- Auto-start entrypoint: `src/mcp/memory-server.ts`
- Server builder: `src/mcp/memory-stdio.ts`
- Tool handlers: `src/mcp/memory-tools.ts`

## Server Name

- `whitey-memory`

## Auto-Start Control

- Environment variable: `WHITEY_MCP_SERVER_DISABLE_AUTO_START=1` (global)
- Environment variable: `WHITEY_MEMORY_SERVER_DISABLE_AUTO_START=1`

## Explicit Serve Command

- `whitey mcp-serve memory`
- Equivalent script: `npm run mcp:memory`

## Storage

- `.whitey/memory/project-memory.json`
- `.whitey/memory/notepad.md`

Malformed project-memory JSON returns an explicit tool error instead of silently replacing memory content.

Run-time memory-context injection follows the same strictness: malformed project-memory JSON returns a run validation error.

## Tools

- `project_memory_read`
- `project_memory_write`
- `project_memory_add_note`
- `project_memory_add_directive`
- `notepad_read`
- `notepad_write_priority`
- `notepad_write_working`
- `notepad_write_manual`
- `notepad_prune`
- `notepad_stats`

## Test Coverage

- `src/mcp/__tests__/memory-server.test.ts`
- `src/mcp/__tests__/bootstrap.test.ts`

## External Client Configuration

Minimal MCP client snippet:

```json
{
  "mcpServers": {
    "whitey_memory": {
      "command": "whitey",
      "args": ["mcp-serve", "memory"]
    }
  }
}
```

Template location: `templates/mcp.json`.

## Prompt + Skill Assets

Prompts:
- `prompts/memory/read-first.md`
- `prompts/memory/write-policy.md`
- `prompts/memory/session-close.md`

Skills:
- `skills/memory-capture/SKILL.md`
- `skills/memory-recall/SKILL.md`
- `skills/memory-hygiene/SKILL.md`
- `skills/memory-bootstrap/SKILL.md`
