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
