---
title: Dispatch Discipline
impact: HIGH
tags: [workflow, sub-agents, context-hygiene]
category: workflow
trigger:
  always: true
---

## Dispatch Discipline

**Impact: HIGH**

Don't start a multi-file task without first either dispatching a researcher
sub-agent (when the agent platform supports them) or running a search-only
pass yourself. Editing first and reading later produces patches that fight
existing patterns, miss invariants, and have to be redone.

**Rules:**
- For any task touching more than three files, or any task that needs a
  repo-wide `Grep` to scope, do a **read-only pass first**: collect findings
  with `Read`/`Grep`/`Glob`, summarize in three bullets, *then* edit.
- For library, pattern, or migration trade-offs, the read-only pass must
  include the alternatives considered, not just the current code.
- When the platform supports sub-agents (e.g. Claude Code), dispatch the
  read-only pass to a researcher sub-agent instead of doing it inline — its
  findings come back as a summary, keeping the main context lean.
- After implementation, if the diff is large (>50 LOC) or touches auth,
  secrets, migrations, or new dependencies, run a reviewer pass (sub-agent
  where available; otherwise a self-review checklist).

**Skip dispatch for:**
- Single-file edits expected to take under two minutes.
- Pure typo, formatting, or import-order fixes.
- Trivial renames inside a file you're already editing.
