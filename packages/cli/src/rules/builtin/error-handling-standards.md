---
title: Error Handling Standards
impact: HIGH
tags: [error-handling, reliability, debugging]
globs: ["src/**"]
alwaysApply: false
category: coding-standards
---

## Error Handling Standards

**Impact: HIGH**

Errors should be handled intentionally, never swallowed silently. Good error handling makes debugging possible and systems reliable.

**Rules:**
- Never use empty catch blocks — at minimum, log the error
- Use typed/custom error classes for domain-specific failures
- Include context in error messages (what was being done, what input caused it)
- Don't expose internal error details to end users (stack traces, DB queries)
- Propagate errors to the appropriate level — handle them where you have enough context
- Use error boundaries / global handlers as safety nets, not as primary error handling

**Error message quality:**
- Bad: `"Error occurred"`
- Good: `"Failed to fetch user profile for userId=${id}: ${error.message}"`
- Include: what operation failed, what input was involved, what the caller should do

**Async error handling:**
- Always handle promise rejections (`.catch()` or try/catch with await)
- Unhandled promise rejections crash Node.js — treat them as bugs
