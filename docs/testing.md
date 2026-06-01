# Testing Guide

## Test Stack

- Node built-in test runner via `tsx --test`
- No external assertion libraries required

## Covered Modules

- `src/cli/__tests__/router.test.ts`
  - Command parsing defaults and validation
  - Unknown flag handling
  - Command-specific option constraints
  - Prompt separator behavior

- `src/runtime/__tests__/executor.test.ts`
  - Empty prompt validation
  - Success normalization
  - Textual failure normalization
  - Non-zero executor code propagation

- `src/runtime/__tests__/history.test.ts`
  - Persistence ordering behavior
  - Missing history fallback behavior

- `src/runtime/__tests__/status.test.ts`
  - Authenticated status detection
  - Unauthenticated status detection

- `src/cli/__tests__/index.integration.test.ts`
  - End-to-end run command behavior with mocked Copilot subprocess
  - JSON mode validation for `run`, `history`, and `status`

- `src/mcp/__tests__/memory-server.test.ts`
  - MCP memory tool contract coverage
  - Project-memory read/write/append flows
  - Notepad section writing and prune validation

## Commands

- Type check: `npm run check`
- Build: `npm run build`
- Test: `npm test`
