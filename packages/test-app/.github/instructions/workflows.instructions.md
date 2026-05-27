---
applyTo: "**/*"
---

# Workflows — test-app

## Research pattern

When investigating unfamiliar code or evaluating options:
1. State what you're looking for.
2. Search relevant files (grep, glob).
3. Read matched ranges, not entire files.
4. Summarize findings with file paths and line numbers.

## Implement pattern

When coding a bounded task:
1. List files to touch and the order.
2. Implement in slices — one logical change per slice.
3. Run `npx tsc --noEmit && npm run lint` between slices.
4. For UI changes, verify visually in `npm run dev`.

## Review pattern

When reviewing a diff:
1. Check for correctness, security, and data-safety issues.
2. Flag blockers and concerns; skip pure nits (balanced strictness).
3. Verify Tailwind v4 conventions (no `tailwind.config.*`, tokens in CSS).
4. Verify App Router conventions (`"use client"` only when needed, correct special file usage).
5. Check that no secrets or `.env` values are committed.
