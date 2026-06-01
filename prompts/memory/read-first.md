# Memory Read-First Prompt

Before making code or documentation decisions, query memory first.

## Required Sequence

1. Read project memory via `project_memory_read`.
2. Read notepad via `notepad_read` section `priority`, then `working`.
3. Summarize relevant constraints before action.

## Guardrails

- Do not overwrite memory objects unless explicitly requested.
- Prefer additive writes (`project_memory_add_note`, `project_memory_add_directive`).
- Treat memory as factual context, not speculative planning.

## Output Contract

- `memory_summary`: short bullet list of applicable constraints.
- `action_plan`: what will be changed given the memory context.
