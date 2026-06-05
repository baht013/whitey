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
  - Equivalent to running with `--no-memory` for memory-context behavior.

- `WHITEY_MCP_SERVER_DISABLE_AUTO_START`
  - Set to `1` to disable auto-start for all first-party MCP servers.

- `WHITEY_MEMORY_SERVER_DISABLE_AUTO_START`
  - Set to `1` to disable auto-start for memory MCP server only.

- `WHITEY_HOOK_PLUGINS`
  - Set to `0` to disable runtime hook plugin dispatch.

- `WHITEY_HOOK_PLUGIN_TIMEOUT_MS`
  - Per-plugin timeout in milliseconds (default: `1500`).

- `WHITEY_MCP_TRANSPORT_DEBUG`
  - Set to `1` to emit MCP bootstrap debug logs to stderr.

- `WHITEY_MCP_PARENT_WATCHDOG_INTERVAL_MS`
  - Parent-process watchdog interval in milliseconds (default: `5000`).

- `WHITEY_MCP_LIFECYCLE_LOG`
  - Set to `0`, `false`, `off`, or `no` to disable MCP lifecycle telemetry.

- `WHITEY_MCP_LIFECYCLE_LOG_DIR`
  - Override directory for MCP lifecycle telemetry JSONL output.

## Storage Layout

Runtime data is project-local under `.whitey/`:

- `.whitey/history.jsonl`: append-only run index.
- `.whitey/runs/<uuid>.json`: per-run full transcript bundle.
- `.whitey/state/session.json`: active run-session pointer.
- `.whitey/logs/session-history.jsonl`: append-only session start/close events.
- `.whitey/logs/lifecycle-YYYY-MM-DD.jsonl`: run lifecycle event stream.
- `.whitey/logs/mcp-lifecycle-YYYY-MM-DD.jsonl`: MCP lifecycle telemetry stream.
- `.whitey/logs/hooks-YYYY-MM-DD.jsonl`: runtime hook plugin logs.
- `.whitey/hooks/*.mjs`: project-local runtime hook plugins.
- `.whitey/plugin-state/<plugin>/*.json`: project-local hook plugin state.
- `.whitey/memory/project-memory.json`: MCP durable project memory.
- `.whitey/memory/notepad.md`: MCP notepad sections (priority, working, manual).
- `.whitey/backups/agents-init/*.md`: overwritten `AGENTS.md` backups.

`whitey run --no-memory` disables both memory-context prompt injection and built-in runtime memory capture writes for that run.

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
