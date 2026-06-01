# Roadmap

## Implemented in Phase 1 + 2

- Single-run Copilot execution
- Command router (`run`, `history`, `status`, `help`)
- Approval gate and non-interactive fail-closed mode
- Persistent local run history and transcripts
- Baseline unit tests and build checks
- Integration tests with mocked Copilot subprocess behavior
- JSON output mode for `run`, `history`, and `status`
- Auth-aware status checks (command + auth readiness)

## Planned Next

1. Add explicit provider adapter interface for multiple backends.
2. Improve auth diagnostics with provider-specific parsing and fallback strategies.
3. Add optional machine-readable error taxonomy in JSON mode.
4. Add prompt packs and skill-style command presets.

## Deferred by Design

- Team orchestration and worker routing
- Hooks/plugins execution framework
- Interactive TUI/HUD
