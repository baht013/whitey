<!-- WHITEY_MANAGED_START -->
# AGENTS.md

This file configures agent-facing project guidance for this repository.

## Core workflow

1. Read the canonical state and memory pointers before editing:
   - `state/implemented.md`
   - `state/features.json`
   - `memory/INDEX.md`
2. Keep code, docs, state, and memory pointers in sync for each meaningful change.
3. Run verification after changes:
   - `npm run check`
   - `npm run build`
   - `npm test`

## Scope guardrails

- Do not add orchestration systems, plugin frameworks, or HUD/TUI unless explicitly requested.
- Preserve the current minimal core architecture unless requirements change.
<!-- WHITEY_MANAGED_END -->

<!-- WHITEY_MANUAL_START -->
Add project-specific manual notes below. This section is preserved on refresh.
<!-- WHITEY_MANUAL_END -->
