---
applyTo: "**/*.{ts,tsx}"
---

# Architecture — test-app

## Stack

- Next.js 16.2.6 (App Router) with React 19.2.4
- TypeScript 5 (strict mode)
- Tailwind CSS v4 (CSS-driven config, no `tailwind.config.*`)
- ESLint 9 (flat config)

## App Router conventions

- Server Components are the default in `app/`.
- Add `"use client"` directive explicitly when a component needs browser-only APIs (state, effects, event handlers).
- Async Server Components are first-class — use `async/await` directly in components.
- `page.tsx` = route, `layout.tsx` = wrapper, `loading.tsx` = suspense fallback, `error.tsx` = error boundary.
- Default export for App Router special files; named exports for everything else.

## Path alias

- `@/*` → package root (set in `tsconfig.json`). There is no `src/` directory.
- Prefer `@/app/...` and `@/lib/...` over deep relative paths.

## Import order

1. stdlib / built-ins
2. Third-party (`next`, `react`, etc.)
3. Local (`@/...`)

Separate groups with blank lines.

## Styling

- Tailwind v4: tokens live in `app/globals.css` under `@theme inline`.
- Do NOT create a `tailwind.config.ts` — v4 uses CSS-driven config.
- Prefer Tailwind utility classes; use CSS variables for design tokens.
