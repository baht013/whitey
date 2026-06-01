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
- Run JSON: `npm run start -- run "your prompt" --yes --json`
- History: `npm run start -- history --limit 10`
- History JSON: `npm run start -- history --limit 10 --json`

## Important Paths

- Runtime data: `.whitey/`
- Docs: `docs/`
- State snapshot: `state/`
- Memory wiki: `memory/`
