---
title: Smallest Viable Change
impact: HIGH
tags: [code-quality, scope, focus]
category: coding-standards
trigger:
  description: "Apply when planning a change spanning more than one file or when scope is fanning out."
---

## Smallest Viable Change

**Impact: HIGH**

Every change should be the minimum necessary to achieve the goal. No drive-by refactors, no scope creep.

**Rules:**
- One concern per change — if the scope fans out, stop and confirm
- Don't refactor code you're not directly working on
- Don't fix unrelated linting issues in the same commit
- If you discover a pre-existing issue, log it separately — don't fix it in the current PR
- Prefer small, reviewable PRs over large ones

**When it's OK to expand scope:**
- The change is tightly coupled and can't be separated without breaking things
- You're fixing a bug that your change would otherwise mask
- The refactor is trivial (rename, import reorder) and in files you're already touching
