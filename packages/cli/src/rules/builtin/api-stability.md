---
title: Never Introduce Breaking API Changes
impact: CRITICAL
tags: [api, stability, versioning, backwards-compatibility]
category: api
trigger:
  globs: ["src/api/**", "src/routes/**", "**/controllers/**"]
---

## Never Introduce Breaking API Changes

**Impact: CRITICAL**

Once an API endpoint is public, it must remain stable. Breaking changes destroy developer trust and create integration nightmares.

**Strategies for avoiding breaking changes:**
- Always add new fields as optional
- Use API versioning when you must change existing behavior
- Deprecate old endpoints gracefully with clear migration paths
- Maintain backward compatibility for at least two major versions

**When you must make breaking changes:**
- Create a new API version
- Run both versions simultaneously during transition
- Provide automated migration tools when possible
- Give users ample time to migrate
- Document exactly what changed and why
