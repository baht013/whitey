# System Overview

Whitey is a minimal CLI orchestrator for Copilot execution.

## Canonical Sources

- Main docs index: `docs/README.md`
- Architecture: `docs/architecture.md`
- Runtime state snapshot: `state/implemented.md`

## Core Entry Points

- CLI entry: `src/cli.ts`
- Router: `src/cli/router.ts`
- Executor: `src/runtime/executor.ts`
- Provider: `src/runtime/provider/copilotCli.ts`
- History: `src/runtime/history.ts`
- MCP memory server: `src/mcp/memory-server.ts`
