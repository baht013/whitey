# CLI Reference

## Commands

### `whitey run <prompt> [flags]`
Execute one prompt through Copilot CLI.

Flags:
- `--timeout-ms <N>`: execution timeout in milliseconds (default 120000)
- `--yes`: auto-approve risky actions
- `--non-interactive`: fail if approval is required
- `--verbose`: print executor invocation details to stderr
- `--`: treat all following tokens as prompt text

### `whitey history [--limit N]`
Show recent run summaries from `.whitey/history.jsonl`.

### `whitey status`
Print runtime context and command availability readiness.

### `whitey help`
Show usage and environment variable reference.

## Exit Codes

- `0`: success
- `1`: executor error or unexpected failure
- `2`: validation or argument parsing error
- `3`: approval denied
