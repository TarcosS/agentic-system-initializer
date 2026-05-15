# Skills Discovery Coverage — Design

**Status:** Apved 20pro26-05-15
**File touched:** `agentic-system-initializer.md` (universal Step 1 section, ~lines 180-251)

## Problem

When `agentic-system-initializer.md` is run against a real repo, the skills-discovery step (Step 1) reliably under-delivers. Agents finish having installed 1–2 random skills and miss obvious categories:

- Project has a frontend → no `frontend-design`, no `ui-ux-pro-max`, no `web-design-guidelines` installed.
- Project uses Azure → no `azure-enterprise-infra-planner` installed.
- Same pattern repeats for cloud, testing, observability, docs, etc.

Root causes in the current spec:

1. **Searches are too literal.** Step 1b says only: `find <framework>`, `<language>`, `<orm-or-db>`, `<practice>`. Misses adjacent terms (`ui`, `ux`, `design`, `cloud`, `infrastructure`, `accessibility`).
2. **"Don't overwhelm" cap is too aggressive.** Line 231 instructs "the strongest 2–3 per category" — agent truncates before user sees strong candidates.
3. **No coverage enforcement.** Agent can skip a detected category silently.

## Goals

- Force broad, systematic searches that match every signal Step 0 detected.
- Let the user — not the agent — decide which candidates to install.
- Make any skipped/empty category **visible** in a coverage report before scaffold work begins.

## Non-goals

- Replacing install-count as the popularity heuristic (still useful, kept).
- Touching Step 0 (analysis) or Step 2 (team assembly) content.
- Changing the per-agent sections beyond pointing them at the new universal flow.

## Design

### Change 1 — Replace Step 1b with a mandatory search matrix

Every Step 0 signal triggers a fixed set of `npx skills find` queries. The agent runs every applicable row before moving on.

| Step 0 signal | Mandatory search queries |
|---|---|
| **Universal — always run** | `code-review`, `testing`, `git`, `documentation`, `refactoring`, `debugging` |
| Frontend framework (React/Vue/Svelte/Angular/Next/Nuxt/Remix/Astro/etc.) | `<framework>`, `frontend`, `ui`, `ux`, `design`, `accessibility`, `components`, `tailwind` (if detected), `css` |
| Backend framework (Express/Fastify/Hono/Nest/FastAPI/Django/Flask/Rails/Gin/Echo/etc.) | `<framework>`, `<language>`, `api`, `backend`, `rest`, `graphql` (if schema detected) |
| Database / ORM (Prisma/Drizzle/SQLAlchemy/TypeORM/Alembic/etc.) | `<orm>`, `<db-engine>`, `database`, `migrations`, `sql` |
| Cloud — Azure (`@azure/*`, Bicep, App Service, CosmosDB, etc.) | `azure`, `cloud`, `infrastructure` + specific services found (e.g., `cosmosdb`, `cognitive-services`) |
| Cloud — AWS (`aws-sdk`, CDK, CloudFormation, S3, Lambda, etc.) | `aws`, `cloud`, `infrastructure` + specific services |
| Cloud — GCP (`@google-cloud/*`, Cloud Run, Firestore, etc.) | `gcp`, `google-cloud`, `cloud` + specific services |
| IaC (Terraform/Pulumi/Bicep/CloudFormation/CDK) | `<tool>`, `iac`, `infrastructure-as-code`, `infrastructure` |
| Containers / orchestration (Docker/Compose/Kubernetes/Helm) | `docker`, `kubernetes`, `containers`, `devops`, `helm` (if detected) |
| CI/CD (GH Actions/GitLab/Jenkins/CircleCI/Azure Pipelines) | `<platform>`, `ci`, `cd`, `pipelines`, `deployment` |
| Testing (Vitest/Jest/Mocha/Pytest/Playwright/Cypress/etc.) | `<framework>`, `testing`, `qa`, `e2e` (if detected), `coverage` |
| Auth / security (OAuth/JWT/NextAuth/Auth0/Clerk/secret managers) | `auth`, `security`, `oauth`, `jwt`, `secrets` |
| Mobile (React Native/Expo/Flutter/SwiftUI/Capacitor) | `<framework>`, `mobile`, `ios`, `android` |
| AI / ML (PyTorch/TensorFlow/transformers/LangChain/AI SDKs) | `<framework>`, `ai`, `ml`, `llm`, `prompt-engineering` |
| Documentation tools (Docusaurus/MkDocs/Storybook/TypeDoc) | `<tool>`, `documentation`, `docs`, `technical-writing` |
| Monorepo (Turborepo/Nx/Lerna/pnpm workspaces) | `<tool>`, `monorepo`, `workspaces` |
| Observability (Datadog/Sentry/Prometheus/OpenTelemetry/Grafana) | `<tool>`, `observability`, `monitoring`, `logging`, `tracing` |

**Coverage rule.** If Step 0 detected a signal, the corresponding row's queries are non-optional. A row can be short-circuited only after running it and finding zero relevant candidates — that fact must be logged in the coverage report.

**Browse skills.sh.** When CLI results look thin for a detected signal, also browse <https://skills.sh/> — some skills aren't fully indexed in the CLI.

### Change 2 — Soften 1c "Present" cap

Replace "the strongest 2–3 per category" guidance with:

- **Present every candidate ≥100 installs.** Don't pre-filter. The user is the filter, not the agent.
- If 20+ candidates come back for one category, group them with sub-headings but still list them all.
- Surface <100-install candidates only when a detected category produced nothing else, and label them explicitly: *"Low install count, but this is the only skill that targets `<X>`. Want it anyway?"*

### Change 3 — Add 1d Coverage Report (mandatory before Step 2)

Before scaffold creation, the agent posts:

```
## Skills discovery coverage report

Step 0 signals detected: <one-line summary>
find-skills installed: yes

| Category | Detected? | Queries run | Candidates ≥100 installs | Installed | Skipped (reason) |
|---|---|---|---|---|---|
| Universal | always | code-review, testing, git, ... | <n> | <names> | <names + reason> |
| Frontend | yes (React+Tailwind) | react, frontend, ui, ux, design, accessibility, components | <n> | frontend-design, ui-ux-pro-max | web-design-guidelines (user declined) |
| Cloud — Azure | yes (App Service+CosmosDB) | azure, cloud, infrastructure, cosmosdb | <n> | azure-enterprise-infra-planner | none |
| ... |
```

**Gaps the report must call out:**
- Detected category with **zero candidates** → explicit line, recommend manual check at <https://skills.sh/>.
- Detected category whose candidates were **all skipped** → list candidates + one-line reason each, so future sessions can revisit.

**Autopilot mode.** Matrix still runs; agent auto-installs ≥1K-install matches as today; the coverage report is included in the final report instead of being posted mid-flow.

Only after the report is posted (and confirmed in interactive mode) can the agent proceed to Step 2 — Team assembly.

### Change 4 — Renumber and cross-reference

- Current 1d ("Log and proceed") becomes 1e.
- Per-agent sections (Claude Code §, Cursor §, etc.) keep their short "follow universal Step 1" pointer — no per-agent matrix duplication. The matrix lives once in the universal step.
- The Claude Code section's Step 1 prose (around line 439) is updated to reference the new sub-steps (1a–1e) without restating them.

## Edits to `agentic-system-initializer.md`

- Replace lines ~207-218 (current 1b) with Change 1 (matrix + coverage rule).
- Update lines ~220-231 (current 1c) per Change 2.
- Update the Autopilot fallback block (~lines 233-243) to reference the matrix and require the coverage report in the final report.
- Insert new Section 1d (Coverage Report) between current 1c-block and current 1d.
- Renumber current 1d → 1e.
- Update the Claude Code Step 1 prose (~lines 439-461) to point at 1a-1e without restating contents.

## Out of scope

- Other per-agent sections beyond Claude Code (Cursor, Codex CLI, etc.) — they already say *"follow the universal Step 1 above"*. No further changes needed.
- Spec-kit interaction.
- Any change to Step 0 or Step 2.
