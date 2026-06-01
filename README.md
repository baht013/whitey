# whitey

A lightweight Copilot-first CLI runner inspired by oh-my-codex, focused on core functionality only.

## Current Scope

- Single run execution with Copilot CLI
- Minimal command router
- Local run history in `.whitey/`
- Risk-based approval prompts
- Automatic run-time memory context from `.whitey/memory/`
- Memory MCP server with project-memory and notepad tools
- CLI parity for memory tools and MCP serving
- Managed `AGENTS.md` bootstrap command

## Quick Start

1. Install dependencies:
   - `npm install`
2. Run in dev mode:
   - `npm run dev -- "your prompt"`
3. Build:
   - `npm run build`
4. Use built output:
   - `npm run start -- "your prompt"`
5. Run tests:
   - `npm test`
6. Launch memory MCP server:
   - `npm run mcp:memory` (or `whitey mcp-serve memory`)

## Commands

- `whitey run "..."` executes a prompt
- `whitey run "..." --no-memory` skips memory context injection
- `whitey history` shows recent runs
- `whitey status` checks command availability and auth readiness
- `whitey project-memory <tool|alias> [--input <json>]` manages project memory directly
- `whitey notepad <tool|alias> [--input <json>]` manages notepad sections directly
- `whitey mcp-serve memory` runs the stdio memory MCP server
- `whitey agents-init [path] [--dry-run] [--force]` installs/refreshes managed AGENTS.md guidance
- `whitey help` shows command usage

JSON automation mode:

- Add `--json` to `run`, `history`, and `status` commands for structured output.

## Notes

- Expects `copilot` CLI to be installed and authenticated.
- Persistence is project-local under `.whitey/`.
- Default executor invocation is `copilot --prompt "<your prompt>"`.

## Project Guides

- Full docs: `docs/README.md`
- MCP memory server guide: `docs/mcp-memory-server.md`
- Implemented state snapshot: `state/implemented.md`
- Feature matrix: `state/features.json`
- Wiki-style pointers: `memory/INDEX.md`
- Repo Copilot instructions: `.github/copilot-instructions.md`
- Docs session log: `docs/session-log.md`
- Memory change log: `memory/change-log.md`

## Prompt And Skill Assets

- Prompts: `prompts/memory/`
- Skills: `skills/`
