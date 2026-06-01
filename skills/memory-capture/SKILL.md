# Memory Capture Skill

## Purpose

Persist key session outcomes into Whitey memory MCP without storing noise.

## Inputs

- Session summary text
- Decisions made
- Repeated operator preferences

## Actions

1. Read current memory (`project_memory_read`, `notepad_read`).
2. Append durable facts via `project_memory_add_note`.
3. Append operating rules via `project_memory_add_directive`.
4. Append one short working-memory summary via `notepad_write_working`.

## Output

- JSON summary with counts and written categories.
