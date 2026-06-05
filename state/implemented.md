# Implemented State Snapshot

Date: 2026-06-01

Maintenance:
- Session workflow instructions: `.github/copilot-instructions.md`
- Session entry template: `state/session-entry-template.md`

## Core Runtime

- CLI command entrypoint is implemented.
- Router supports command detection and strict option validation.
- Approval policy supports risky-intent detection with interactive/non-interactive behavior.
- Copilot subprocess executor is implemented with timeout escalation.
- Result normalization includes textual failure detection heuristics.
- History persistence writes append-only summary and full transcripts.
- JSON output mode is available for `run`, `history`, and `status`.
- Status command now checks both command availability and auth readiness.
- Run executor now prepends bounded memory context from project-memory + notepad priority sections by default.
- Memory context injection can be disabled with `--no-memory` or `WHITEY_MEMORY_CONTEXT=0`.
- Memory MCP server is implemented with project-memory and notepad tools.
- Memory MCP server surfaces malformed project-memory JSON as an explicit tool error.
- `mcp-serve memory` is implemented for explicit stdio MCP launch.
- `project-memory` and `notepad` CLI commands now map directly to memory MCP tools.
- `agents-init` installs/refreshed managed `AGENTS.md`, preserving manual sections and backing up overwrites.
- MCP bootstrap supports global auto-start disable (`WHITEY_MCP_SERVER_DISABLE_AUTO_START`) in addition to per-server disable vars.
- Whitey run path now includes a session lifecycle (`.whitey/state/session.json`, `.whitey/logs/session-history.jsonl`, `.whitey/logs/lifecycle-*.jsonl`).
- Session startup context now includes an execution-session section and optional bounded memory context.
- Session close is idempotent and appends a concise working-memory summary when memory context is enabled.
- Runtime hook plugins are supported from `.whitey/hooks/*.mjs` with scoped SDK logging/state storage.
- Runtime hook plugin SDK now includes `sdk.memory` helpers (`addNote`, `addDirective`, `writeWorking`, and bounded read helpers) backed by memory tool handlers.
- Hook event context for `turn-complete` and `session-close` now includes safe run metadata (`summary`, `promptPreview`, `durationMs`, `transcriptPath`, `memoryEnabled`) without raw stdout/stderr payload injection.
- A built-in runtime memory capture hook now runs automatically on `turn-complete`/`session-close` when memory is enabled, with bounded extraction, redaction, and dedupe.
- `whitey run --no-memory` now disables both prompt memory-context injection and built-in runtime memory capture writes for that run.
- MCP bootstrap now owns lifecycle shutdown on stdin close, signals, transport close, and parent watchdog checks.
- MCP lifecycle telemetry now writes bounded JSONL under `.whitey/logs/mcp-lifecycle-*.jsonl` (configurable/disable-able via env).
- Prompt pack for memory read-first, write policy, and session-close is implemented.
- Skill pack for memory capture/recall/hygiene/bootstrap is implemented.

## Quality and Validation

- Typecheck + build scripts are configured.
- Unit tests exist for router, executor, and history modules.
- Integration tests cover end-to-end run/history/status command behavior with mocked subprocesses.
- Integration tests cover run-time memory context behavior, project-memory CLI parity, and agents-init managed refresh behavior.
- Shared test environment isolation helper prevents env leakage across subprocess-oriented tests.
- MCP memory server tests cover contract declarations, core read/write/prune behavior, and malformed project-memory handling.
- Bootstrap tests cover global/per-server MCP auto-start disable controls.
- Session lifecycle tests cover session state persistence, context composition, and close semantics.
- Runtime plugin tests cover hook dispatch, env disable, and timeout behavior.
- Runtime plugin tests now cover `sdk.memory` write behavior, disabled-memory error behavior, and malformed project-memory surfacing.
- MCP server lifecycle tests cover built-entrypoint shutdown on stdin close, SIGTERM, and SIGINT.
- Memory-context unit tests cover source assembly, malformed JSON failures, and env toggle behavior.
- CLI integration tests now cover enriched `turn-complete` hook context metadata and built-in auto memory-capture behavior with `--no-memory` disable coverage.

## Known Limits

- No provider auto-discovery beyond configured executable.
- Auth check remains heuristic and depends on provider output text patterns.
- Runtime plugins are local-only and event-limited (`session-start/context-build/turn-complete/session-close`).
- No multi-agent orchestration yet.
- Explicit MCP serve command currently covers only first-party memory server.
