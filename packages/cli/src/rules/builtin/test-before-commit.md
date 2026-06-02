---
title: Test Before Commit
impact: HIGH
tags: [testing, quality, ci]
category: testing
trigger:
  globs: ["**/*.test.*", "**/*.spec.*", "src/**"]
---

## Test Before Commit

**Impact: HIGH**

Every change must be validated by running existing tests before claiming the work is done.

**Rules:**
- Run the full test suite (or at minimum, affected tests) before committing
- Never skip failing tests — fix them or explain why they fail
- New features require new tests; bug fixes require regression tests
- Test the actual behavior, not implementation details
- If tests are slow, run targeted tests first, full suite before push

**Test quality standards:**
- Tests should be deterministic (no flaky tests)
- Tests should be independent (no shared mutable state between tests)
- Test names should describe the expected behavior
- Prefer integration tests for critical paths, unit tests for logic
