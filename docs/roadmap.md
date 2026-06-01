# Roadmap

## Implemented in Phase 1 + 2

- Single-run Copilot execution
- Command router (`run`, `history`, `status`, `help`, `mcp-serve`, `project-memory`, `notepad`, `agents-init`)
- Approval gate and non-interactive fail-closed mode
- Persistent local run history and transcripts
- Baseline unit tests and build checks
- Integration tests with mocked Copilot subprocess behavior
- JSON output mode for `run`, `history`, and `status`
- Auth-aware status checks (command + auth readiness)
- Memory MCP server for persistent project memory and notepad operations
- CLI parity commands for memory tools (`project-memory`, `notepad`)
- CLI MCP server launch command (`mcp-serve memory`)
- Run-time memory-context prompt injection with strict malformed-memory errors
- Managed AGENTS template bootstrap (`agents-init`)
- Prompt pack for memory read/write/session-close behavior
- Skill pack for memory bootstrap/recall/capture/hygiene workflows

## Planned Next

1. Add explicit provider adapter interface for multiple backends.
2. Improve auth diagnostics with provider-specific parsing and fallback strategies.
3. Add optional machine-readable error taxonomy in JSON mode.
4. Expand first-party MCP coverage beyond memory server where needed.

## Deferred by Design

- Team orchestration and worker routing
- Hooks/plugins execution framework
- Interactive TUI/HUD
