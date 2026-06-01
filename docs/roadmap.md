# Roadmap

## Implemented in Phase 1 + 2

- Single-run Copilot execution
- Command router (`run`, `history`, `status`, `help`)
- Approval gate and non-interactive fail-closed mode
- Persistent local run history and transcripts
- Baseline unit tests and build checks

## Planned Next

1. Add explicit provider adapter interface for multiple backends.
2. Introduce integration tests with a mocked subprocess layer.
3. Add richer status diagnostics (auth, binary version, dry-run checks).
4. Add optional JSON output mode for automation.
5. Add prompt packs and skill-style command presets.

## Deferred by Design

- Team orchestration and worker routing
- Hooks/plugins execution framework
- Interactive TUI/HUD
