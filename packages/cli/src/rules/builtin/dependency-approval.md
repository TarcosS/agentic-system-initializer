---
title: Dependency Approval Required
impact: MEDIUM
tags: [dependencies, security, supply-chain]
globs: ["package.json", "requirements.txt", "Gemfile", "go.mod", "Cargo.toml", "*.csproj"]
alwaysApply: false
category: dependencies
---

## Dependency Approval Required

**Impact: MEDIUM**

Don't install new dependencies without surfacing them first. Every dependency is a supply chain risk and a maintenance burden.

**Rules:**
- Before adding a dependency, state: what it does, why it's needed, and alternatives considered
- Prefer well-maintained packages with active communities
- Check the package size — avoid bloated dependencies for simple tasks
- Pin dependency versions in production (no `^` or `~` for critical deps)
- Run `npm audit` / `pip audit` / equivalent after adding dependencies
- Prefer stdlib or existing project utilities over new packages for simple tasks

**Questions to ask before adding a dependency:**
- Can this be done with existing code in < 50 lines?
- Is this package actively maintained (commits in last 6 months)?
- What's the download count / community size?
- Does it have known vulnerabilities?
- How much does it add to the bundle size?
