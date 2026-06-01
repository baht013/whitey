# Execution Lifecycle

## Run Path

1. User invokes `whitey run`.
2. Router parses command + flags.
3. Approval module assesses prompt text against risk patterns.
4. If approved, executor calls Copilot provider subprocess.
5. Provider captures stdout/stderr and enforces timeout.
6. Executor converts provider output into normalized `RunResult`.
7. History module writes run transcript + JSONL summary.
8. CLI prints final status and exits with mapped code.

## Failure Modes

- Empty prompt -> validation error.
- Unknown command flags -> argument error.
- Approval required in non-interactive mode -> approval denied.
- Copilot process launch error -> executor error.
- Timeout -> executor error with timeout exit code from provider.
- Textual error signature with zero process code -> executor error (normalized to non-zero).
