# Where To Find

## Command Behavior

- Parse logic: `src/cli/router.ts`
- Help text: `src/cli/router.ts`
- Dispatch flow: `src/cli/index.ts`
- Memory CLI parity handlers: `src/cli/memory-parity.ts`
- MCP serve command handler: `src/cli/mcp-serve.ts`
- AGENTS bootstrap handler: `src/cli/agents-init.ts`
- Executable wrapper: `src/cli.ts`

## Safety

- Risk patterns and approval prompt: `src/runtime/approval.ts`

## Persistence

- Storage path helpers: `src/utils/fs.ts`
- Record persistence + history retrieval: `src/runtime/history.ts`
- Session lifecycle state + logs + startup context: `src/runtime/sessionLifecycle.ts`
- Runtime hook plugins and SDK: `src/runtime/plugins.ts`
- Built-in hook memory capture extraction logic: `src/runtime/memoryCaptureHook.ts`
- Run memory-context assembly: `src/runtime/memoryContext.ts`
- MCP memory tool handlers: `src/mcp/memory-tools.ts`
- MCP memory server assembly: `src/mcp/memory-stdio.ts`
- MCP memory entrypoint + auto-start: `src/mcp/memory-server.ts`
- MCP lifecycle telemetry + watchdog shutdown: `src/mcp/bootstrap.ts`, `src/mcp/lifecycle-telemetry.ts`

## Testing

- Router tests: `src/cli/__tests__/router.test.ts`
- Executor tests: `src/runtime/__tests__/executor.test.ts`
- History tests: `src/runtime/__tests__/history.test.ts`
- Status tests: `src/runtime/__tests__/status.test.ts`
- Integration tests: `src/cli/__tests__/index.integration.test.ts`
- MCP memory tests: `src/mcp/__tests__/memory-server.test.ts`
- Memory context tests: `src/runtime/__tests__/memoryContext.test.ts`
- MCP bootstrap tests: `src/mcp/__tests__/bootstrap.test.ts`
- Session lifecycle tests: `src/runtime/__tests__/sessionLifecycle.test.ts`
- Runtime plugin tests: `src/runtime/__tests__/plugins.test.ts`
- Hook context + built-in memory capture integration tests: `src/cli/__tests__/index.integration.test.ts`
- MCP server lifecycle tests: `src/mcp/__tests__/server-lifecycle.test.ts`
- Test environment helper: `src/test-support/env.ts`

## Prompts And Skills

- Memory prompts: `prompts/memory/`
- Memory skills: `skills/`

## Product State

- Snapshot summary: `state/implemented.md`
- Feature matrix: `state/features.json`
