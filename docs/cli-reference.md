# CLI Reference

## Commands

### `whitey run <prompt> [flags]`
Execute one prompt through Copilot CLI.

Flags:
- `--timeout-ms <N>`: execution timeout in milliseconds (default 120000)
- `--yes`: auto-approve risky actions
- `--non-interactive`: fail if approval is required
- `--no-memory`: skip automatic memory-context injection for this run
- `--verbose`: print executor invocation details to stderr
- `--json`: emit structured JSON instead of text output
- `--`: treat all following tokens as prompt text

### `whitey history [--limit N] [--json]`
Show recent run summaries from `.whitey/history.jsonl`.

### `whitey status [--json]`
Print runtime context with command availability and Copilot auth readiness.

### `whitey mcp-serve memory`
Run the memory MCP server over stdio for external MCP clients.

### `whitey project-memory <tool|alias> [--input <json>] [--json]`
Call project-memory tools directly from CLI.

Aliases:
- `read` -> `project_memory_read`
- `write` -> `project_memory_write`
- `add-note` -> `project_memory_add_note`
- `add-directive` -> `project_memory_add_directive`

### `whitey notepad <tool|alias> [--input <json>] [--json]`
Call notepad tools directly from CLI.

Aliases:
- `read` -> `notepad_read`
- `write-priority` -> `notepad_write_priority`
- `write-working` -> `notepad_write_working`
- `write-manual` -> `notepad_write_manual`
- `prune` -> `notepad_prune`
- `stats` -> `notepad_stats`

### `whitey agents-init [path] [--dry-run] [--force] [--verbose] [--json]`
Install or refresh managed `AGENTS.md` guidance from `templates/AGENTS.md`.

- Preserves manual section for managed files.
- Refuses to overwrite unmanaged `AGENTS.md` unless `--force` is set.
- Stores backups in `.whitey/backups/agents-init/` when overwriting.

### `whitey help`
Show usage and environment variable reference.

## Exit Codes

- `0`: success
- `1`: executor error, unexpected failure, or status readiness failure
- `2`: validation or argument parsing error
- `3`: approval denied
