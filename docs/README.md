# Documentation Index

This directory documents the current Whitey implementation and operating model.

## Documents

- [Architecture Overview](architecture.md)
- [CLI Reference](cli-reference.md)
- [Execution Lifecycle](execution-lifecycle.md)
- [Testing Guide](testing.md)
- [Configuration Reference](configuration.md)
- [Roadmap](roadmap.md)
- [MCP Memory Server](mcp-memory-server.md)
- [Session Log](session-log.md)

## Maintenance

- Session workflow instructions: `.github/copilot-instructions.md`

## Scope Baseline

Current implementation is intentionally minimal:

- Single-agent execution using Copilot CLI
- Minimal command router
- Approval gate for risky prompt intents
- Local persistence in `.whitey/`
- Unit tests for parser, executor behavior, and history storage
- Memory MCP server with project-memory and notepad tools
- Run-time memory context injection with opt-out controls
- CLI parity commands for memory operations and MCP serving
- Managed AGENTS template bootstrap command
