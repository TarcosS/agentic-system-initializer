---
applyTo: "**/*.{ts,tsx}"
---

# Data layer — test-app

## Current state

N/A — no database or data layer is configured.

## When introducing a data layer

- Flag the decision before adding any ORM, database client, or data-fetching library.
- Prefer established patterns: Prisma for relational DBs, Drizzle as a lightweight alternative.
- Migrations should be versioned and reversible.
- Keep data-access logic in a dedicated `lib/` or `data/` directory, not in components.
