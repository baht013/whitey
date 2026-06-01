# Architecture Overview

Whitey is a lightweight CLI orchestration layer with a single executor provider (Copilot CLI).

## Runtime Modules

- `src/cli.ts`: thin executable wrapper.
- `src/app.ts`: process command dispatch and command handlers.
- `src/core/router.ts`: argument parsing and command selection.
- `src/core/approval.ts`: risk assessment and approval handling.
- `src/core/executor.ts`: normalized run execution and result shaping.
- `src/core/provider/copilotCli.ts`: subprocess invocation of Copilot CLI.
- `src/core/status.ts`: command and auth readiness checks for Copilot.
- `src/core/history.ts`: append-only history + transcript persistence.
- `src/core/fs.ts`: storage path helpers for `.whitey/`.
- `src/types.ts`: shared contracts.

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
