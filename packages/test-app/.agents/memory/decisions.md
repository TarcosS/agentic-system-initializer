# Decisions log — test-app (agent-neutral mirror)

> This file mirrors `.claude/memory/decisions.md` so non-Claude agents (Cursor, Copilot, etc.) can read it from the agent-neutral `.agents/` surface.
> The Claude-Code-specific copy at `.claude/memory/decisions.md` is the source of truth. Keep them in sync when appending entries.
> Append-only, newest-first.

---

## 2026-05-26 — User profile updated to senior/high-autonomy/concise

Context: Re-initialization requested with updated user profile. Previous profile was "Cloud Native Engineer / medium autonomy / detailed communication / code-first". New profile is "senior / high autonomy / concise / mixed working style".

Decision: Updated `.github/copilot-instructions.md` user profile section. Agent now makes obvious decisions without asking, uses terse responses, and supports both spec-first (complex) and code-first (simple) workflows. Installed `nextjs-app-router-patterns` skill (19K installs) for App Router guidance.

---

## 2026-05-19 — GitHub Copilot instructions scaffolded

Context: Added GitHub Copilot as a second supported agent platform alongside Claude Code. Created `.github/copilot-instructions.md` (repo-wide, all canonical blocks A.0–A.13 inlined) and path-scoped rules under `.github/instructions/` (architecture, testing, security, data, workflows).

Decision: Keep Copilot instructions consistent with CLAUDE.md content but formatted for Copilot's file structure (`.github/copilot-instructions.md` + `applyTo`-scoped instruction files). Installed `find-skills` with `-a github-copilot` target to `.agents/skills/`.

Trade-offs: Copilot reads `copilot-instructions.md` from the base branch during PR review, not the feature branch — new instructions won't take effect in review until merged.

---

## 2026-05-17 — Agentic scaffolding initialized via `agentinit`

Context: This is a Next.js 16 + React 19 + Tailwind v4 + TypeScript scaffold inside the `agentic-system-initializer` monorepo. The `agentinit` CLI generated an init prompt at `.agents/.tmp/init-prompt.md`; this run executes it.

Decision: Adopt Claude Code as the primary agent platform. Wrote `CLAUDE.md` (runtime instructions, all canonical blocks inlined), `.claude/agents/{researcher,implementer,reviewer}.md` (sub-agents), `.claude/memory/decisions.md` (source of truth), `.claude/settings.json` (deny `rm -rf` + `git push --force`), `.specify/memory/constitution.md` (Spec-Kit principles), and `how-to-use-skills.sh` at the package root (skills CLI reference).

Trade-offs: We did NOT install a test framework, Prettier, Husky, or CI — the user's profile is "balanced" and "spec-first", so introducing infrastructure should be a deliberate decision tied to a feature need, not a scaffolding default. Flagged in CLAUDE.md gotchas: `npm run lint` + `npx tsc --noEmit` + visual smoke are the only correctness signals until that changes.

---

## 2026-05-17 — Tailwind v4 (no `tailwind.config.ts`) is the project convention

Context: `package.json` pins `tailwindcss: ^4` and uses `@tailwindcss/postcss`. Styling tokens live in `app/globals.css` under `@import "tailwindcss"` + `@theme inline`. There is no `tailwind.config.*` file and there should not be one.

Decision: Treat the CSS-driven config as canonical. Any agent suggesting `tailwind.config.ts` should be corrected. New theme tokens go in the `@theme inline` block in `app/globals.css`.

Trade-offs: Less familiar to anyone coming from Tailwind v3. Documented in CLAUDE.md gotchas + reviewer.md checklist so it's caught early.

---

## 2026-05-17 — Path alias `@/*` points to package root, not `src/`

Context: `tsconfig.json` defines `"paths": { "@/*": ["./*"] }`. There is no `src/` directory; `app/` sits at the package root.

Decision: Prefer `@/app/...`, `@/lib/...` (when `lib/` exists) over relative paths like `../../app/...`. This matches the `create-next-app` Tailwind template default.

---

## 2026-05-17 — User profile reconciliation: spec-first wins over profile.json

Context: `.agents/profile.json` records `workingStyle: "code-first"`, but the persisted user memory (set 2026-05-17) records `spec-first`. The memory was set explicitly by the user during the prior init conversation; `profile.json` appears to be a stale CLI default.

Decision: CLAUDE.md treats the user as spec-first (memory wins). Flag this divergence to the user so they can either (a) update `.agents/profile.json` to match, or (b) update memory if profile.json is correct. Until clarified, follow the memory.

Trade-offs: Risk of acting on outdated preference if the user changed their mind without updating memory. Worth one clarifying question early in the next non-trivial session.
