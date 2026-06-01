# Execution Lifecycle

## Run Path

1. User invokes `whitey run`.
2. Router parses command + flags.
3. Approval module assesses prompt text against risk patterns.
4. If approved, runtime starts a session pointer at `.whitey/state/session.json`.
5. Startup context is built from execution-session metadata plus optional memory context.
6. Optional local hook plugins run lifecycle events (`session-start`, `context-build`).
7. Executor calls Copilot provider subprocess.
8. Provider captures stdout/stderr and enforces timeout.
9. Executor converts provider output into normalized `RunResult`.
10. History module writes run transcript + JSONL summary.
11. Runtime emits `turn-complete`, closes session, writes lifecycle/session-history logs, and optionally appends a concise notepad working-memory summary.
12. CLI prints final status and exits with mapped code.

## Failure Modes

- Empty prompt -> validation error.
- Unknown command flags -> argument error.
- Approval required in non-interactive mode -> approval denied.
- Malformed project-memory JSON when memory context is enabled -> validation error.
- Malformed session state JSON -> explicit runtime error when session lifecycle is read.
- Runtime plugin failure -> logged warning/error; run execution continues.
- Copilot process launch error -> executor error.
- Timeout -> executor error with timeout exit code from provider.
- Textual error signature with zero process code -> executor error (normalized to non-zero).
