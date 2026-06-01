# Testing Guide

## Test Stack

- Node built-in test runner via `tsx --test`
- No external assertion libraries required

## Covered Modules

- `src/core/router.test.ts`
  - Command parsing defaults and validation
  - Unknown flag handling
  - Command-specific option constraints
  - Prompt separator behavior

- `src/core/executor.test.ts`
  - Empty prompt validation
  - Success normalization
  - Textual failure normalization
  - Non-zero executor code propagation

- `src/core/history.test.ts`
  - Persistence ordering behavior
  - Missing history fallback behavior

## Commands

- Type check: `npm run check`
- Build: `npm run build`
- Test: `npm test`
