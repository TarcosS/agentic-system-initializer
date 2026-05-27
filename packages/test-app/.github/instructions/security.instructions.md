---
applyTo: "**/*.{ts,tsx}"
---

# Security — test-app

## Stance: standard

Apply OWASP basics. Flag auth, secrets, and input-handling code.

## Rules

- Never commit `.env*`, credentials, or tokens. The `.gitignore` already excludes `.env*`.
- If a `.env.example` is added, mirror keys but never values.
- Validate at system boundaries only (user input, external APIs). Trust internal code.
- Flag any new dependency additions for security review.
- When touching auth, middleware, or secrets-handling code, trigger a security review.

## Next.js specifics

- Server Actions and Route Handlers are trust boundaries — validate inputs there.
- Don't expose server-only secrets to client components.
- Use `"use server"` directive correctly to prevent accidental client exposure of server logic.
