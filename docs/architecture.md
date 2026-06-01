# Architecture Overview

Whitey is a lightweight CLI orchestration layer with a single executor provider (Copilot CLI).

## Runtime Modules

- `src/cli.ts`: thin executable wrapper.
- `src/cli/index.ts`: process command dispatch and command handlers.
- `src/cli/router.ts`: argument parsing and command selection.
- `src/runtime/approval.ts`: risk assessment and approval handling.
- `src/runtime/executor.ts`: normalized run execution and result shaping.
- `src/runtime/provider/copilotCli.ts`: subprocess invocation of Copilot CLI.
- `src/runtime/status.ts`: command and auth readiness checks for Copilot.
- `src/runtime/history.ts`: append-only history + transcript persistence.
- `src/utils/fs.ts`: storage path helpers for `.whitey/`.
- `src/types/index.ts`: shared contracts.

## MCP Modules

- `src/mcp/memory-server.ts`: stdio MCP server for project memory and notepad tools.
- `src/mcp/bootstrap.ts`: MCP stdio auto-start lifecycle helper.
- `src/mcp/memory-validation.ts`: memory-specific argument validation.
- `src/mcp/paths.ts`: working-directory resolution for MCP operations.

## Test Support

- `src/test-support/env.ts`: scoped environment overrides for subprocess-oriented tests.

## Flow

1. Parse arguments into a normalized command payload.
2. If command is `run`, evaluate approval policy.
3. Execute prompt via Copilot CLI provider.
4. Normalize result into `RunResult` status + timings.
5. Persist transcript and summary record under `.whitey/`.
6. Print text output or JSON (`--json`) and set exit code.

## Design Constraints

- No team orchestration in current phase.
- No plugin system in current phase.
- No TUI/HUD in current phase.
- Provider abstraction is implicit via injectable executor dependency in tests; full multi-provider adapter layer is planned for a later phase.
