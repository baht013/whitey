# Configuration Reference

## Environment Variables

- `WHITEY_COPILOT_CMD`
  - Override the executable name/path (default: `copilot`).

- `WHITEY_COPILOT_ARGS_TEMPLATE`
  - Space-delimited template for provider args.
  - Use `{prompt}` placeholder for prompt insertion.
  - If unset, default args are `--prompt <prompt>`.

## Storage Layout

Runtime data is project-local under `.whitey/`:

- `.whitey/history.jsonl`: append-only run index.
- `.whitey/runs/<uuid>.json`: per-run full transcript bundle.

## Status Check Behavior

`whitey status` now runs two checks against the configured Copilot command:

- `--version` to verify command availability
- `auth status` to estimate authentication readiness

If either command is unavailable or authentication appears missing, status exits with code `1`.
