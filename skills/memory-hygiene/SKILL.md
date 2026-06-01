# Memory Hygiene Skill

## Purpose

Keep working memory small and high-signal.

## Actions

1. Read working section via `notepad_read`.
2. Prune stale entries via `notepad_prune` (default 7 days unless overridden).
3. Read `notepad_stats` and report post-prune state.

## Output

- `pruned_count`
- `remaining_working_entries`
- `size_bytes`
