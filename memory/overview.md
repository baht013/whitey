# System Overview

Whitey is a minimal CLI orchestrator for Copilot execution.

## Canonical Sources

- Main docs index: `docs/README.md`
- Architecture: `docs/architecture.md`
- Runtime state snapshot: `state/implemented.md`

## Core Entry Points

- CLI entry: `src/cli.ts`
- Router: `src/cli/router.ts`
- CLI dispatch and command handlers: `src/cli/index.ts`
- Executor: `src/runtime/executor.ts`
- Session lifecycle: `src/runtime/sessionLifecycle.ts`
- Runtime plugins: `src/runtime/plugins.ts`
- Built-in memory capture hook: `src/runtime/memoryCaptureHook.ts`
- Memory context: `src/runtime/memoryContext.ts`
- Provider: `src/runtime/provider/copilotCli.ts`
- History: `src/runtime/history.ts`
- MCP memory tools/server: `src/mcp/memory-tools.ts`, `src/mcp/memory-stdio.ts`, `src/mcp/memory-server.ts`
