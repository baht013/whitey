# Architecture Overview

Whitey is a lightweight CLI orchestration layer with a single executor provider (Copilot CLI).

## Runtime Modules

- `src/cli.ts`: thin executable wrapper.
- `src/cli/index.ts`: process command dispatch and command handlers.
- `src/cli/router.ts`: argument parsing and command selection.
- `src/cli/memory-parity.ts`: direct CLI adapters for memory/notepad tools.
- `src/cli/mcp-serve.ts`: explicit MCP stdio server launcher command.
- `src/cli/agents-init.ts`: managed AGENTS template install/refresh command.
- `src/runtime/approval.ts`: risk assessment and approval handling.
- `src/runtime/executor.ts`: normalized run execution and result shaping.
- `src/runtime/memoryContext.ts`: bounded memory context construction for run prompts.
- `src/runtime/sessionLifecycle.ts`: active-session state, lifecycle logs, startup context, and close flow.
- `src/runtime/plugins.ts`: local runtime hook dispatch + plugin SDK.
- `src/runtime/provider/copilotCli.ts`: subprocess invocation of Copilot CLI.
- `src/runtime/status.ts`: command and auth readiness checks for Copilot.
- `src/runtime/history.ts`: append-only history + transcript persistence.
- `src/utils/fs.ts`: storage path helpers for `.whitey/`.
- `src/types/index.ts`: shared contracts.

## MCP Modules

- `src/mcp/memory-tools.ts`: project-memory + notepad tool contracts and handlers.
- `src/mcp/memory-stdio.ts`: MCP server assembly for memory tools.
- `src/mcp/memory-server.ts`: auto-starting memory server entrypoint.
- `src/mcp/bootstrap.ts`: MCP stdio start and auto-start lifecycle helpers.
- `src/mcp/lifecycle-telemetry.ts`: bounded MCP lifecycle JSONL telemetry writer.
- `src/mcp/memory-validation.ts`: memory-specific argument validation.
- `src/mcp/paths.ts`: working-directory resolution for MCP operations.

## Test Support

- `src/test-support/env.ts`: scoped environment overrides for subprocess-oriented tests.

## Flow

1. Parse arguments into a normalized command payload.
2. If command is `run`, evaluate approval policy.
3. Start Whitey session lifecycle pointer and emit lifecycle start events.
4. Build startup context (execution-session + optional memory context).
5. Execute prompt via Copilot CLI provider.
6. Normalize result into `RunResult` status + timings.
7. Persist transcript and summary record under `.whitey/`.
8. Close session lifecycle and append safe working-memory summary when enabled.
9. Print text output or JSON (`--json`) and set exit code.

## Design Constraints

- No team orchestration in current phase.
- Runtime plugins are local/project-scoped only (`.whitey/hooks/*.mjs`).
- No TUI/HUD in current phase.
- Provider abstraction is implicit via injectable executor dependency in tests; full multi-provider adapter layer is planned for a later phase.
