# Memory Recall Skill

## Purpose

Load relevant memory context before implementation work.

## Inputs

- Current task intent
- Optional area filters (architecture, build, testing)

## Actions

1. Read full memory (`project_memory_read`).
2. Read priority and working notepad (`notepad_read`).
3. Produce ranked context list for the task.

## Output

- `must_follow`
- `should_consider`
- `temporary_context`
