# Agentic System Initializer

> Bootstrap any AI coding agent — Claude Code, Cursor, Copilot, Codex, Cline, Windsurf, Roo Code, Kilo Code, Gemini CLI, Aider — with a project-tailored configuration in one command.

This repository contains two things:

1. **`agentic-system-initializer.md`** — a single document that any AI coding agent can read to scaffold itself into a repository. It analyzes the project, profiles the developer, discovers skills, assembles a specialist agent team, and writes the right files to disk for whichever platform is reading it.
2. **`agentinit`** — a CLI (in `packages/cli/`) that automates the deterministic parts of that workflow (analysis, profile, scaffold files, skill installation) and then dispatches the platform-specific prompt to your agent so it can finish the customization step.

**This is a private project.** The `@deopca/agentinit` package is **not published** to any registry and is not intended to be. The only supported way to use it is to clone this repo and link the CLI locally via `npm` (instructions below).

If you just cloned the repo, the section you want is **[Use `agentinit` on your own project](#use-agentinit-on-your-own-project)**.

---

## Why does this exist?

Most AI coding agents support some form of per-project instructions (`CLAUDE.md`, `.cursor/rules/`, `.github/copilot-instructions.md`, `AGENTS.md`, etc.), but the conventions diverge per platform and nobody wants to hand-write seven variants of the same content.

`agentic-system-initializer.md` solves this by being one source of truth that each agent reads only the section that applies to itself. `agentinit` adds determinism on top: instead of re-running a 4000-line prompt every time, the CLI does the file-writing in Node, picks the right rule set per agent, then asks the agent to fill in only the project-specific details.

The result is a repo with:

- A user-profile (role, autonomy, review strictness, communication preferences) so the agent adapts to **you**, not to a generic developer
- A token-lean instruction layout (progressive disclosure, topical skill files loaded on demand)
- A core agent team (researcher / implementer / reviewer) plus specialist sub-agents generated from your actual stack
- A shared `.agents/` layer so multiple agents on the same repo read the same source of truth
- An append-only `decisions.md` log so future sessions don't relitigate past choices

---

## Repository layout

```
.
├── agentic-system-initializer.md   # The spec — what any agent reads to set itself up
├── packages/
│   ├── cli/                        # The agentinit CLI (TypeScript, ESM)
│   └── test-app/                   # Sandbox Next.js app used to dogfood `agentinit init`
├── scripts/
│   ├── release.sh                  # Version-bump + tag helper
│   ├── split-sections.ts           # Splits the spec into per-agent CDN chunks
│   └── upload-cdn.sh               # Uploads chunks to the CDN
├── docs/                           # Design notes (skills discovery coverage, etc.)
├── dist/                           # CDN payloads built from the spec
├── skills-lock.json                # Locked skill versions (auto-managed)
├── CONTRIBUTING.md
└── CHANGELOG.md
```

---

## Use `agentinit` on your own project

### Requirements

- **Node.js ≥ 18** (the CLI is ESM and uses `node:` built-ins)
- **npm** (or compatible) for installing dependencies and running `npx`
- A git repository to scaffold into (recommended, not required)
- Optional: `uv` or `pipx` if you also want [GitHub Spec-Kit](https://github.com/github/spec-kit) installed alongside

The CLI shells out to `npx skills` to install community skills from <https://skills.sh>. That happens on demand during `init`, so the first run will be slower while npm caches them.

### Install (clone + npm link — private, never published)

The package is private. There is no `npm install -g @deopca/agentinit` — that will 404. Instead, get the source onto disk and link it with npm:

```bash
# 1. Get the repo onto your machine (clone over SSH/HTTPS, or just copy the folder)
git clone <this-repo-url> agentic-system-initializer
cd agentic-system-initializer/packages/cli

# 2. Install dependencies and build the CLI bundle
npm install
npm run build

# 3. Register the `agentinit` command on your PATH
npm link
```

`npm link` creates a global symlink that points at this checkout's `dist/index.js`. After it runs, `agentinit` is callable from anywhere on your machine, and it stays in sync with this folder — if you pull updates and run `npm run build` again, the linked command picks them up automatically.

To remove the global symlink later:

```bash
cd agentic-system-initializer/packages/cli
npm unlink -g           # removes the global `agentinit` binary
```

If you don't want to register a global command, run the built file directly:

```bash
node /absolute/path/to/agentic-system-initializer/packages/cli/dist/index.js init
```

**Troubleshooting:**
- `command not found: agentinit` after `npm link` → your global npm bin directory isn't on `PATH`. Run `npm prefix -g` to find it, then add `<that-path>/bin` to your shell rc.
- Permission errors on `npm link` → either fix npm's global prefix to a user-owned directory (`npm config set prefix ~/.npm-global`) or re-run with `sudo` (not recommended).
- `npm run build` fails → ensure Node ≥ 18 and that `npm install` finished cleanly inside `packages/cli/`.

### Initialize a project

From the root of the project you want to scaffold:

```bash
agentinit init
```

What this does, in order:

1. **Analyzes the project** — detects language, frameworks, package manager, test runner, CI, existing AI configs.
2. **Profiles you** — asks 5–7 short questions (role, domain, working style, autonomy, review strictness, communication). Saved to `.agents/profile.json` and reused on every subsequent run.
3. **Picks your agent(s)** — interactive multi-select unless `--agent <id>` is passed.
4. **Writes scaffold files deterministically** — `CLAUDE.md` / `AGENTS.md` / `.cursor/rules/00-core.mdc` / `.github/copilot-instructions.md` etc., plus `.agents/` shared instructions, `decisions.md`, rule files compiled per agent.
5. **Installs stack-driven skills** via `npx skills add …` (best-effort, per skill).
6. **Dispatches to your agent** with a slim prompt that customizes what couldn't be inferred deterministically.
7. **Validates the scaffold** — checks for missing files and unfilled placeholders.

### Common flags

```bash
agentinit init [directory]            # Defaults to current directory
  --agent <ids...>                    # Pre-select agents, skip prompt (e.g. claude-code cursor)
  --skip-profile                      # Use defaults (senior, high autonomy, balanced strictness)
  --no-dispatch                       # Write the prompt to .agents/.tmp/ instead of launching the agent
  --spec <path>                       # Use a local agentic-system-initializer.md (defaults to CDN)
  --offline                           # Skip the CDN fetch, use cached/local sections only
```

Supported agent IDs: `claude-code`, `cursor`, `copilot`, `codex`, `cline`, `windsurf`, `roo-code`, `kilo-code`, `gemini-cli`, `aider`.

### Other commands

```bash
agentinit profile          # Re-run the profile interview without re-scaffolding
agentinit generate         # Regenerate the dispatch prompt only (after profile / spec changes)
agentinit validate         # Re-run the post-init health check (placeholders, missing files, broken symlinks)
agentinit rules            # Manage the per-agent compiled rule set
agentinit clear            # Remove all agentinit-managed files (CLAUDE.md, .agents/, .claude/, .cursor/rules/00-core.mdc, etc.)
```

Each command takes `--help` for full options.

### Where things end up on disk

After `agentinit init` runs against a repo that selected, say, `claude-code` and `cursor`, you'll see:

```
your-project/
├── AGENTS.md                       # Cross-tool entry point
├── CLAUDE.md                       # Claude Code main instructions
├── how-to-use-skills.sh            # Skills CLI reference
├── skills-lock.json                # Pinned skill versions (commit this)
├── .agents/                        # Shared layer all agents read
│   ├── profile.json                # Your developer profile
│   ├── instructions/               # Canonical instruction blocks (project context, principles, etc.)
│   ├── rules/{builtin,custom}/     # Source rules; compiled per agent
│   ├── memory/decisions.md         # Append-only choice log
│   └── skills/                     # Skills installed via npx skills
├── .claude/                        # Claude Code-specific config (settings, mcp.json, sub-agents)
└── .cursor/rules/00-core.mdc       # Cursor-specific rule file compiled from .agents/rules/
```

The deny-list in `.claude/settings.json` blocks `rm -rf` and `git push --force` by default. Customize it for your repo.

---

## Run an agent against the spec directly (no CLI)

If you don't want to install the CLI, point any agent at `agentic-system-initializer.md` and say:

> *Read `agentic-system-initializer.md` and set up my agentic system.*

Each agent will read only its own section plus the universal files section, then write its own scaffold. This is exactly what the CLI orchestrates, just without the deterministic parts.

---

## Develop on the CLI

```bash
cd packages/cli
npm install
npm run dev          # tsup watch mode
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src/
npm run test         # vitest run
npm run build        # Production bundle (rerun after changes so `npm link` picks them up)
```

Run the in-development CLI without rebuilding:

```bash
node ./dist/index.js init /path/to/some/project
```

The `packages/test-app/` workspace is a Next.js scaffold included as a target for dogfooding. To test the full flow:

```bash
cd packages/test-app
agentinit init
```

---

## License

**Proprietary — internal company use only.** See [LICENSE](./LICENSE) for the full terms. In short:

- Usable **only** by current employees of DEOPCA and contractors with a written agreement, **for the Company's own internal purposes**.
- **No monetization of any kind.** You may not sell, rent, lease, sublicense, host as a paid service, charge for, or include this software in a commercial offering — directly or indirectly. This is a hard condition; violating it terminates the license immediately.
- **No external distribution.** Not to be published to npm, any other registry, any public mirror, or shared with anyone outside the Company.
- All rights reserved. The Software is Confidential Information of the Company.

The CLI's `package.json` is marked `"private": true` so `npm publish` will refuse to upload it; do not work around this.

For any use outside the scope above, contact the Company in writing before acting.
