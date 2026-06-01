# Memory Bootstrap Skill

## Purpose

Initialize memory for a new or reset project.

## Actions

1. Seed baseline memory sections via `project_memory_write` with `merge=true`.
2. Add first directive enforcing test/build checks.
3. Add initial architecture note describing runtime boundaries.
4. Initialize priority notepad with current goals.

## Output

- `memory_initialized`
- `seed_sections`
- `initial_directives`
