---
title: No Force Push to Shared Branches
impact: CRITICAL
tags: [git, collaboration, safety]
category: git
trigger:
  always: true
---

## No Force Push to Shared Branches

**Impact: CRITICAL**

Never use `git push --force` on shared branches (main, develop, release/*). Force pushing rewrites history and can destroy other developers' work.

**Rules:**
- Never `--force` push to main, develop, or release branches
- Use `--force-with-lease` only on personal feature branches after rebase
- Prefer merge over rebase for shared branches
- If you must rewrite history, coordinate with the team first
- Set up branch protection rules to prevent force pushes

**Safe alternatives:**
- `git revert` to undo a bad commit (creates a new commit, preserves history)
- `git push --force-with-lease` on your own branch (fails if someone else pushed)
- Create a new branch from the last good state
