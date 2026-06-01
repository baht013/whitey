# Copilot Instructions for Whitey

These instructions apply to all coding sessions in this repository.

## Primary Goal

Keep implementation, docs, state snapshots, and memory pointers synchronized on every meaningful change.

## Mandatory Session-End Workflow

Follow this file before finalizing work.

1. Update state files first:
   - `state/features.json`
   - `state/implemented.md`
2. Update impacted docs pages under `docs/`.
3. Update memory pointers under `memory/`.
4. Run verification:
   - `npm run check`
   - `npm run build`
   - `npm test`

## Required Locations

- Canonical docs index: `docs/README.md`
- Canonical state snapshot: `state/implemented.md`
- Canonical feature matrix: `state/features.json`
- Canonical memory index: `memory/INDEX.md`

## Change Logging

When files are changed:

- Add an entry to `docs/session-log.md` if documentation changed.
- Add an entry to `memory/change-log.md` if memory pointers changed.
- Use `state/session-entry-template.md` for dated state summaries.

## Scope Guardrails

- Do not add team orchestration, plugin systems, or HUD/TUI unless explicitly requested.
- Preserve current minimal-core architecture unless requirements change.
