# Troubleshooting

## Command Not Found

Symptom:
- Run fails because Copilot binary cannot be executed.

Check:
- `whitey status`
- `WHITEY_COPILOT_CMD` value
- shell PATH

Fix:
- Install/authenticate Copilot CLI.
- Set `WHITEY_COPILOT_CMD` if executable name/path differs.

## Approval Denied in CI

Symptom:
- Exit code 3 in non-interactive runs.

Check:
- Prompt risk keywords
- `--non-interactive` usage

Fix:
- Add `--yes` for trusted automation workflows.

## Unexpected Success with Error Text

Guard:
- Executor normalizes known textual error signatures into failure.

Reference:
- `src/runtime/executor.ts`

## Malformed Project Memory

Symptom:
- MCP memory tools return `Invalid project memory JSON.`
- `whitey run` returns validation error when memory context is enabled.

Check:
- `.whitey/memory/project-memory.json`

Fix:
- Restore the file to a valid JSON object before using project-memory tools.
- Use `--no-memory` (or `WHITEY_MEMORY_CONTEXT=0`) as a temporary bypass for `run`.

## Session State Parse Failure

Symptom:
- `whitey run` reports an invalid session state JSON error.

Check:
- `.whitey/state/session.json`

Fix:
- Repair or remove malformed `.whitey/state/session.json`.
- Re-run the command so Whitey recreates a valid active-session pointer.

## Runtime Hook Plugin Failures

Symptom:
- stderr shows plugin lifecycle failure warnings.

Check:
- `.whitey/hooks/*.mjs`
- `.whitey/logs/hooks-YYYY-MM-DD.jsonl`

Fix:
- Correct plugin module export (`onHookEvent(event, sdk)`).
- Reduce plugin latency or increase `WHITEY_HOOK_PLUGIN_TIMEOUT_MS`.
- Disable plugin dispatch temporarily with `WHITEY_HOOK_PLUGINS=0`.

## MCP Server Exits Unexpectedly

Symptom:
- memory MCP process exits after parent process changes or stream closure.

Check:
- stdin/transport state from MCP client
- `WHITEY_MCP_PARENT_WATCHDOG_INTERVAL_MS`
- `.whitey/logs/mcp-lifecycle-YYYY-MM-DD.jsonl`

Fix:
- Keep client stdin open while server should remain active.
- Tune watchdog interval if needed.
- Use `WHITEY_MCP_TRANSPORT_DEBUG=1` for bootstrap diagnostics.

## AGENTS.md Not Overwritten

Symptom:
- `whitey agents-init` reports unmanaged `AGENTS.md`.

Check:
- Existing file does not contain Whitey managed markers.

Fix:
- Re-run with `--force` to overwrite unmanaged files.
- Existing content will be backed up under `.whitey/backups/agents-init/`.
