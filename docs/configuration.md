# Configuration Reference

## Environment Variables

- `WHITEY_COPILOT_CMD`
  - Override the executable name/path (default: `copilot`).

- `WHITEY_COPILOT_ARGS_TEMPLATE`
  - Space-delimited template for provider args.
  - Use `{prompt}` placeholder for prompt insertion.
  - If unset, default args are `--prompt <prompt>`.

- `WHITEY_MEMORY_CONTEXT`
  - Set to `0` to disable automatic memory-context injection for `whitey run`.

- `WHITEY_MCP_SERVER_DISABLE_AUTO_START`
  - Set to `1` to disable auto-start for all first-party MCP servers.

- `WHITEY_MEMORY_SERVER_DISABLE_AUTO_START`
  - Set to `1` to disable auto-start for memory MCP server only.

## Storage Layout

Runtime data is project-local under `.whitey/`:

- `.whitey/history.jsonl`: append-only run index.
- `.whitey/runs/<uuid>.json`: per-run full transcript bundle.
- `.whitey/memory/project-memory.json`: MCP durable project memory.
- `.whitey/memory/notepad.md`: MCP notepad sections (priority, working, manual).
- `.whitey/backups/agents-init/*.md`: overwritten `AGENTS.md` backups.

## MCP Scripts

- `npm run mcp:memory` launches the stdio memory MCP server.
- `whitey mcp-serve memory` launches the same server via CLI.

## Templates

- `templates/AGENTS.md`: managed agent guidance template used by `whitey agents-init`.
- `templates/mcp.json`: starter MCP client snippet using `whitey mcp-serve memory`.

## Status Check Behavior

`whitey status` now runs two checks against the configured Copilot command:

- `--version` to verify command availability
- `auth status` to estimate authentication readiness

If either command is unavailable or authentication appears missing, status exits with code `1`.
