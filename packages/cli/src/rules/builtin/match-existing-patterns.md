---
title: Match Existing Patterns
impact: HIGH
tags: [consistency, code-quality, patterns]
alwaysApply: true
category: coding-standards
---

## Match Existing Patterns

**Impact: HIGH**

Read existing code before writing new code. The codebase already has established patterns — follow them.

**Rules:**
- Before creating a new file, find a similar existing file and follow its structure
- Use the same naming conventions (camelCase, PascalCase, kebab-case) as the rest of the codebase
- Follow the established project directory structure
- Match the error handling approach already in use
- Use the same logging patterns and levels
- Don't introduce a new utility library when one already exists for the same purpose

**Why this matters:**
- Consistency reduces cognitive load for all developers
- Code reviews go faster when patterns are familiar
- New team members onboard faster with consistent codebase
- Search and replace works reliably across consistent patterns
