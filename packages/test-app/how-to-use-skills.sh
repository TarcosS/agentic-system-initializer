#!/usr/bin/env bash
# how-to-use-skills.sh — single source of truth for skill management in this package.
# Both humans and agents read this when they need to remember the syntax.
# Skills come from the open ecosystem (vercel-labs/skills and others); install via `npx skills`.

set -euo pipefail

cat <<'USAGE'
Skill management — `npx skills` cheatsheet for test-app

# Discovery
npx skills find <query>                       # search the skill leaderboard
npx skills list                               # list installed skills (project + global)
npx skills info <skill-name>                  # show details for one skill

# Install (project-scoped, this repo's .claude/skills/)
npx skills add <repo>                         # install all skills from a repo
npx skills add <repo> --skill <name> -y       # install one skill, non-interactive
npx skills add vercel-labs/skills --skill find-skills -y

# Install (global, ~/.claude/skills/)
npx skills add <repo> -g                      # add the -g flag for personal scope

# Update / remove
npx skills update                             # update all installed skills
npx skills remove <skill-name>                # uninstall a skill

# Agent targeting
# `npx skills` auto-detects installed agents and installs to the right folder.
# Explicit override:
npx skills add <repo> -a claude-code          # force install location for Claude Code
npx skills add <repo> -a github-copilot       # force install location for GitHub Copilot
npx skills add <repo> -a cursor               # ...or Cursor, etc.

# Where skills live in this repo
#   .claude/skills/      — project-scoped, committed
#   ~/.claude/skills/    — personal-scoped, not committed

# Always-on skills (loaded mentally each session, per CLAUDE.md):
#   - context-hygiene
#   - log-decision

# Discover what the project needs:
#   npx skills add vercel-labs/skills --skill find-skills -y
#   then ask `find-skills` to recommend installs for the current stack
USAGE
