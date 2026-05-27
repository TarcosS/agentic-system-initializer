# Project constitution — test-app

> Governing principles for Spec-Kit workflows in this package. High-level rules of engagement that don't change session-to-session.
> Read before any non-trivial work. Session-specific decisions go in `.claude/memory/decisions.md`.

## Identity

- **Project:** `test-app` — Next.js 16 + React 19 + Tailwind v4 + TypeScript scaffold.
- **Role:** proving ground for the sibling `agentinit` CLI inside the `agentic-system-initializer` monorepo. Code here is exercised so that changes in the generator can be validated against a real project.
- **Stewards:** the maintainer of `agentic-system-initializer`. No formal team yet.

## Articles

### I. Spec-first for non-trivial work

Any change spanning more than one file, with unclear requirements, or affecting public-facing behavior **must** start with a short spec (via `/speckit.specify` or an inline equivalent). Single-file fixes, typos, and one-shot configuration tweaks may skip the workflow.

The order: `specify` → `clarify` → `plan` → `tasks` → `analyze` → `implement`. Don't skip steps for a change you'd have to undo if a clarifying question surfaced late.

### II. Smallest viable change

Every change does one thing. Refactors live in their own PR. Mechanical noise (formatter output, generated files) is squashed into the commit that produced it, not piled on top of feature work.

### III. Verify before declaring done

There is no test framework, no CI, and no staging environment. The only correctness signals are:
1. `npx tsc --noEmit` (must be clean)
2. `npm run lint` (must be clean)
3. `npm run build` (must succeed)
4. Visual smoke in `npm run dev` for any UI-affecting change

Any of these failing is a blocker. Declaring done without running them is a violation.

### IV. Surface dependencies before adding them

New npm packages, environment variables, configuration files, or external services require explicit acknowledgement before installation. The reviewer agent flags any unsurfaced dependency as a blocker.

This package currently has **no** runtime dependencies beyond Next.js, React, React-DOM, and Tailwind. Treat each addition as a load-bearing decision.

### V. Conventions are observed, not invented

When in doubt, mirror the nearest existing file. Inventing a new convention requires recording it in `.claude/memory/decisions.md` with context and trade-offs.

Established conventions (see `CLAUDE.md` for full list):
- Tailwind v4, CSS-driven config (no `tailwind.config.ts`).
- Path alias `@/*` → package root.
- App Router default exports for `page.tsx` / `layout.tsx` / `error.tsx` / `loading.tsx`; named exports elsewhere.
- Conventional Commit message style.

### VI. Reversible vs. irreversible

Local file edits, branch creation, local commits: freely.
Pushes, deletes, force-pushes, shared-state changes: require explicit per-action confirmation. Prior approval of a similar action does not transfer.

### VII. Memory discipline

`.claude/memory/decisions.md` (and its mirror `.agents/memory/decisions.md`) is append-only and newest-first. Write an entry when a non-obvious choice gets made, when the user corrects a default, or when a gotcha is discovered. Do not write entries for things visible from `git log` or from reading the code.

## Amendment process

This constitution is amended via `/speckit.constitution` or by direct edit followed by a decisions-log entry capturing what changed and why. Changes should be rare; if you're amending more than monthly, the articles are likely too narrow.

## Ratified

2026-05-17 — generated during `agentinit` initialization. The maintainer is the sole ratifier until the project has a formal team.
