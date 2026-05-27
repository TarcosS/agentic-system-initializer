---
applyTo: "**/*.test.{ts,tsx}"
---

# Testing — test-app

## Current state

No test framework is configured. The only automated correctness signals are:

- `npm run lint` (ESLint)
- `npx tsc --noEmit` (TypeScript type-check)
- Visual smoke test via `npm run dev`

## When introducing tests

- Propose Vitest (Next.js-friendly, fast) before installing.
- Colocate test files as `*.test.tsx` next to source.
- Don't introduce a second test framework if one already exists.

## Pre-commit verification

Run `npx tsc --noEmit && npm run lint` before every commit.
For UI changes, visually verify in `npm run dev`.
