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
  - Parsing coverage for `mcp-serve`, `project-memory`, `notepad`, and `agents-init`

- `src/runtime/__tests__/executor.test.ts`
  - Empty prompt validation
  - Success normalization
  - Textual failure normalization
  - Non-zero executor code propagation
  - Memory-context prompt composition and strict malformed-memory handling

- `src/runtime/__tests__/memoryContext.test.ts`
  - Memory-context assembly from project-memory and notepad sources
  - Missing-file no-op behavior
  - Env-based memory-context disable behavior

- `src/runtime/__tests__/history.test.ts`
  - Persistence ordering behavior
  - Missing history fallback behavior

- `src/runtime/__tests__/status.test.ts`
  - Authenticated status detection
  - Unauthenticated status detection

- `src/cli/__tests__/index.integration.test.ts`
  - End-to-end run command behavior with mocked Copilot subprocess
  - JSON mode validation for `run`, `history`, and `status`
  - Run-time memory-context injection behavior and `--no-memory` bypass
  - CLI parity for `project-memory` and managed `agents-init` workflow
  - Isolated Copilot-related environment overrides via `src/test-support/env.ts`

- `src/mcp/__tests__/memory-server.test.ts`
  - MCP memory tool contract coverage
  - Project-memory read/write/append flows
  - Malformed project-memory JSON error handling
  - Notepad section writing and prune validation

- `src/mcp/__tests__/bootstrap.test.ts`
  - Global and per-server MCP auto-start disable behavior

- `src/test-support/__tests__/env.test.ts`
  - Environment override restoration after success and failure

## Commands

- Type check: `npm run check`
- Build: `npm run build`
- Test: `npm test`
