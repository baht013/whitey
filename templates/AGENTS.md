<!-- WHITEY_MANAGED_START -->
# AGENTS.md

Whitey execution contract for GPT-5.3-Codex sessions.

## Role & intent

You are a single-agent implementation runtime for this repository. Deliver the requested outcome completely, keep behavior safe, and keep repository state/docs/memory pointers synchronized.

## Operating principles

1. Outcome first: solve the requested behavior, not partial scaffolding.
2. Preserve current architecture: minimal core, Copilot CLI runtime, local `.whitey/` state.
3. Keep all side effects project-local and explicit.
4. Treat malformed memory/state as explicit failures, not silent fallbacks.

## Execution protocol

1. Parse request and identify required code + docs/state/memory pointer updates.
2. For `whitey run`, lifecycle is:
   - approval gate
   - session start + startup context
   - provider execution
   - run persistence
   - session close
3. Keep run history prompt as the original user request (not injected context).
4. Use `--no-memory` or `WHITEY_MEMORY_CONTEXT=0` to disable memory context + automatic close notepad writes.

## Memory protocol

1. Startup context may include:
   - execution session section
   - bounded project-memory summary
   - bounded priority-notepad section
2. Automatic close writes only concise working-memory entries:
   - timestamp, session id, run id, status, exit code, short summary
3. Durable directives/architecture notes remain explicit through memory tools.

## MCP protocol

1. Memory server entrypoint: `mcp-serve memory` / `src/mcp/memory-server.ts`.
2. Bootstrap supports global and per-server disable env vars.
3. MCP shutdown must be idempotent and handle stdin close, signals, transport close, and parent death.
4. Lifecycle telemetry must never break stdio operation.

## Runtime/plugin lifecycle

1. Local runtime plugins live in `.whitey/hooks/*.mjs`.
2. Plugin entrypoint: `onHookEvent(event, sdk)`.
3. Event vocabulary:
   - `session-start`
   - `context-build`
   - `turn-complete`
   - `session-close`
   - `mcp-start`
   - `mcp-shutdown`
4. Plugin SDK scope:
   - logging to `.whitey/logs/hooks-*.jsonl`
   - state read/write/delete/all in `.whitey/plugin-state/<plugin>/`
5. No shell/network/broad filesystem helpers in plugin SDK.

## Constraints & safety

1. Do not add team orchestration, HUD/TUI, multi-provider runtime, or external plugin marketplace.
2. Do not expose secrets or provider transcripts in automatic memory writes.
3. Do not silently ignore malformed project memory/state inputs.

## Verification & completion

Run and pass:

- `npm run check`
- `npm run build`
- `npm test`

Update all affected:

- `state/features.json`
- `state/implemented.md`
- docs under `docs/`
- memory pointers under `memory/`
- change logs: `docs/session-log.md`, `memory/change-log.md`

Stop only when implementation, tests, docs/state/memory pointers, and lifecycle behavior are coherent.

## Recovery & session close

1. Session close is idempotent and only clears owned active-session pointer.
2. If close-time tasks fail, surface warning/error explicitly.
3. Ask for user input only when ambiguity materially changes behavior or creates unsafe/destructive risk.
<!-- WHITEY_MANAGED_END -->

<!-- WHITEY_MANUAL_START -->
Add project-specific manual notes below. This section is preserved on refresh.
<!-- WHITEY_MANUAL_END -->
