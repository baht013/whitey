# whitey

A lightweight Copilot-first CLI runner inspired by oh-my-codex, focused on core functionality only.

## Current Scope

- Single run execution with Copilot CLI
- Minimal command router
- Local run history in `.whitey/`
- Risk-based approval prompts

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

## Commands

- `whitey run "..."` executes a prompt
- `whitey history` shows recent runs
- `whitey status` checks command availability and auth readiness
- `whitey help` shows command usage

JSON automation mode:

- Add `--json` to `run`, `history`, and `status` commands for structured output.

## Notes

- Expects `copilot` CLI to be installed and authenticated.
- Persistence is project-local under `.whitey/`.
- Default executor invocation is `copilot --prompt "<your prompt>"`.

## Project Guides

- Full docs: `docs/README.md`
- Implemented state snapshot: `state/implemented.md`
- Feature matrix: `state/features.json`
- Wiki-style pointers: `memory/INDEX.md`
- Repo Copilot instructions: `.github/copilot-instructions.md`
- Docs session log: `docs/session-log.md`
- Memory change log: `memory/change-log.md`
