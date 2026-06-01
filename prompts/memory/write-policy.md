# Memory Write Policy Prompt

Write to the appropriate memory channel based on information durability.

## Routing Rules

- Durable project standards -> `project_memory_add_directive`.
- Architectural and implementation facts -> `project_memory_add_note` category `architecture`.
- Temporary in-session findings -> `notepad_write_working`.
- High-priority short context -> `notepad_write_priority`.
- Operator reminders/manual runbooks -> `notepad_write_manual`.

## Safety Rules

- Never store secrets, credentials, tokens, or personal data.
- Keep directives concise and action-oriented.
- Keep working memory entries timestamped and atomic.

## Merge Rules

- Use `project_memory_write` only for controlled schema updates.
- Prefer `merge=true` when extending memory sections.
