# Where To Find

## Command Behavior

- Parse logic: `src/cli/router.ts`
- Help text: `src/cli/router.ts`
- Dispatch flow: `src/cli/index.ts`
- Executable wrapper: `src/cli.ts`

## Safety

- Risk patterns and approval prompt: `src/runtime/approval.ts`

## Persistence

- Storage path helpers: `src/utils/fs.ts`
- Record persistence + history retrieval: `src/runtime/history.ts`
- MCP memory storage operations: `src/mcp/memory-server.ts`

## Testing

- Router tests: `src/cli/__tests__/router.test.ts`
- Executor tests: `src/runtime/__tests__/executor.test.ts`
- History tests: `src/runtime/__tests__/history.test.ts`
- Status tests: `src/runtime/__tests__/status.test.ts`
- Integration tests: `src/cli/__tests__/index.integration.test.ts`
- MCP memory tests: `src/mcp/__tests__/memory-server.test.ts`
- Test environment helper: `src/test-support/env.ts`

## Prompts And Skills

- Memory prompts: `prompts/memory/`
- Memory skills: `skills/`

## Product State

- Snapshot summary: `state/implemented.md`
- Feature matrix: `state/features.json`
