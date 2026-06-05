# Commands Cheat Sheet

## Build and Verify

- Install deps: `npm install`
- Typecheck: `npm run check`
- Build: `npm run build`
- Test: `npm test`

## Runtime

- Help: `npm run start -- help`
- Status: `npm run start -- status`
- Status JSON: `npm run start -- status --json`
- Run: `npm run start -- run "your prompt" --yes`
- Run without memory context: `npm run start -- run "your prompt" --yes --no-memory`
- Run with explicit memory-capture markers: `npm run start -- run "Decision: Use bounded extraction\nConvention: Keep memory notes concise" --yes`
- Run JSON: `npm run start -- run "your prompt" --yes --json`
- Run with plugins disabled: `WHITEY_HOOK_PLUGINS=0 npm run start -- run "your prompt" --yes`
- History: `npm run start -- history --limit 10`
- History JSON: `npm run start -- history --limit 10 --json`
- Memory MCP serve: `npm run start -- mcp-serve memory`
- Project memory read: `npm run start -- project-memory read --json`
- Read only directives: `npm run start -- project-memory read --input '{"section":"directives"}' --json`
- Project memory write: `npm run start -- project-memory write --input '{"memory":{"techStack":"TypeScript"}}'`
- Notepad priority write: `npm run start -- notepad write-priority --input '{"content":"Urgent next task"}'`
- Agents template dry run: `npm run start -- agents-init --dry-run --json`
- MCP memory server with debug logs: `WHITEY_MCP_TRANSPORT_DEBUG=1 npm run start -- mcp-serve memory`

## Important Paths

- Runtime data: `.whitey/`
- Docs: `docs/`
- State snapshot: `state/`
- Memory wiki: `memory/`
