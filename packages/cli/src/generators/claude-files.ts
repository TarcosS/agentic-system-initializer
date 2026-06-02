/**
 * Deterministic generator for `.claude/` directory contents.
 * These files are created by the scaffolder (Node.js) because
 * Claude Code's sandbox blocks all writes to `.claude/` paths.
 */
import { existsSync, mkdirSync, writeFileSync, chmodSync, readFileSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import type { UserProfile } from "../commands/profile.js";
import type { ProjectAnalysis } from "../analyzers/project.js";

export interface ClaudeFilesResult {
  created: string[];
  skipped: string[];
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writeIfNew(
  filePath: string,
  content: string,
  result: ClaudeFilesResult,
): void {
  ensureDir(dirname(filePath));
  if (existsSync(filePath)) {
    result.skipped.push(filePath);
    return;
  }
  writeFileSync(filePath, content);
  result.created.push(filePath);
}

/**
 * Creates the full `.claude/` directory structure with all standard files.
 */
export function generateClaudeFiles(
  targetDir: string,
  profile: UserProfile,
  analysis: ProjectAnalysis,
): ClaudeFilesResult {
  const result: ClaudeFilesResult = { created: [], skipped: [] };
  const claude = (p: string) => join(targetDir, ".claude", p);

  // --- settings.json ---
  writeIfNew(claude("settings.json"), buildSettingsJson(profile, analysis), result);

  // --- mcp.json ---
  writeIfNew(claude("mcp.json"), buildMcpJson(analysis), result);

  // --- memory/decisions.md ---
  writeIfNew(claude("memory/decisions.md"), buildDecisionsMd(profile, analysis), result);

  // --- commands/boot.md ---
  writeIfNew(claude("commands/boot.md"), BOOT_COMMAND, result);
  const packageScripts = readPackageScripts(targetDir);
  writeIfNew(claude("commands/verify.md"), buildVerifyCommand(analysis, packageScripts), result);
  writeIfNew(claude("commands/code-review.md"), CODE_REVIEW_COMMAND, result);

  // --- Core agents ---
  writeIfNew(claude("agents/researcher.md"), AGENT_RESEARCHER.replace(/<project-name>/g, analysis.name), result);
  writeIfNew(claude("agents/implementer.md"), AGENT_IMPLEMENTER.replace(/<project-name>/g, analysis.name), result);
  writeIfNew(claude("agents/reviewer.md"), AGENT_REVIEWER.replace(/<project-name>/g, analysis.name), result);

  // --- Stack-driven specialist agents (stubs — AI fills in project-specific details in Phase 2) ---
  const specialists = pickSpecialists(analysis);
  for (const spec of specialists) {
    writeIfNew(
      claude(`agents/${spec.slug}.md`),
      spec.content.replace(/<project-name>/g, analysis.name),
      result,
    );
  }

  // --- Hand-written skills ---
  writeIfNew(claude("skills/context-hygiene/SKILL.md"), SKILL_CONTEXT_HYGIENE, result);
  writeIfNew(claude("skills/log-decision/SKILL.md"), SKILL_LOG_DECISION, result);
  writeIfNew(claude("skills/workflows/SKILL.md"), SKILL_WORKFLOWS, result);
  writeIfNew(claude("skills/commands/SKILL.md"), buildCommandsSkill(analysis), result);
  writeIfNew(claude("skills/conventions/SKILL.md"), SKILL_CONVENTIONS, result);
  writeIfNew(claude("skills/git-flow/SKILL.md"), buildGitFlowSkill(analysis), result);
  writeIfNew(claude("skills/error-recovery/SKILL.md"), SKILL_ERROR_RECOVERY, result);
  writeIfNew(claude("skills/pr-flow/SKILL.md"), SKILL_PR_FLOW, result);

  // --- Personal overrides stub (gitignored; see ensureAgentinitGitignore) ---
  writeIfNew(join(targetDir, "CLAUDE.local.md"), CLAUDE_LOCAL_STUB, result);

  return result;
}

/**
 * Default .gitignore entries that agentinit manages.
 * Includes its own staging/cache dirs plus the personal CLAUDE.local.md override.
 */
export const AGENTINIT_GITIGNORE_ENTRIES = [
  ".agents/.tmp/",
  ".agents/.cache/",
  ".claude/.cache/",
  ".claude/.tmp/",
  "CLAUDE.local.md",
  ".specify/.tmp/",
];

/**
 * Idempotently ensure a project's .gitignore contains the given entries.
 * Creates the file if missing, appends only missing entries on subsequent runs.
 * Returns the number of entries actually appended (0 ⇒ already up to date).
 */
export function ensureGitignoreEntries(
  targetDir: string,
  entries: string[],
): { added: number; created: boolean } {
  const path = join(targetDir, ".gitignore");
  const existed = existsSync(path);
  const current = existed ? readFileSync(path, "utf-8") : "";
  const have = new Set(
    current.split("\n").map((l) => l.trim()).filter(Boolean),
  );
  const missing = entries.filter((e) => !have.has(e));
  if (missing.length === 0) return { added: 0, created: false };

  const needsLeadingNewline = existed && current.length > 0 && !current.endsWith("\n");
  const block =
    (needsLeadingNewline ? "\n" : "") +
    (existed && current.length > 0 ? "\n" : "") +
    "# agentinit-managed\n" +
    missing.join("\n") +
    "\n";

  if (existed) {
    appendFileSync(path, block);
  } else {
    writeFileSync(path, block.replace(/^\n+/, ""));
  }
  return { added: missing.length, created: !existed };
}

/**
 * Creates the `how-to-use-skills.sh` file at project root.
 */
export function writeHowToUseSkills(targetDir: string): boolean {
  const filePath = join(targetDir, "how-to-use-skills.sh");
  if (existsSync(filePath)) return false;

  writeFileSync(filePath, HOW_TO_USE_SKILLS);
  try { chmodSync(filePath, 0o755); } catch { /* ignore chmod failures */ }
  return true;
}

// ── Specialist agents ──────────────────────────────────────────

interface SpecialistDef {
  slug: string;
  content: string;
}

function pickSpecialists(analysis: ProjectAnalysis): SpecialistDef[] {
  const out: SpecialistDef[] = [];

  const isFrontend =
    analysis.frameworks.some((f) =>
      ["React", "Next.js", "Vue", "Nuxt", "Angular", "Svelte"].includes(f),
    );
  const isApi =
    analysis.frameworks.some((f) =>
      ["Express", "Fastify", "NestJS", "Hono", "Elysia", "FastAPI", "Django", "Flask"].includes(f),
    );
  const hasDb =
    analysis.hasDatabase ||
    analysis.frameworks.some((f) => ["Prisma", "Drizzle", "TypeORM"].includes(f));
  const isDevops = analysis.hasDocker || analysis.hasTerraform || analysis.ci.length > 0;
  const hasTests = analysis.testFramework.length > 0;

  if (isFrontend) out.push({ slug: "frontend", content: AGENT_FRONTEND });
  if (isApi) out.push({ slug: "api", content: AGENT_API });
  if (hasDb) out.push({ slug: "database", content: AGENT_DATABASE });
  if (isDevops) out.push({ slug: "devops", content: AGENT_DEVOPS });
  if (hasTests) out.push({ slug: "qa", content: AGENT_QA });

  return out;
}

const AGENT_FRONTEND = `---
description: Frontend specialist — components, routing, state, styling, accessibility. Use for UI work in <project-name>. Customize the "Stack notes" section with project specifics before relying on it.
tools: [Read, Write, Edit, Bash, Grep, Glob]
---
# Frontend

**You are the Frontend specialist for <project-name>.** UI architecture, components, routing, styling, accessibility, and client-side state belong to you.

## When to invoke
- New component, page, or route.
- Refactor of an existing UI surface.
- Accessibility (a11y) or responsive issue.
- Client-side state, data-fetching, or form work.

## When NOT to invoke
- Pure data-layer change with no UI surface — that's **database**.
- API route handler change with no client coupling — that's **api**.

## Stack notes (Phase 2: customize this section)
<!-- TODO: AI to fill with project specifics from package.json + actual code -->
- **Framework:** <!-- e.g., Next.js App Router 14, Vite + React 18 -->
- **Styling:** <!-- e.g., Tailwind v4, CSS Modules, shadcn/ui -->
- **State:** <!-- e.g., Zustand, Redux Toolkit, React Context -->
- **Routing:** <!-- e.g., file-based App Router, react-router-dom -->
- **Forms / validation:** <!-- e.g., react-hook-form + Zod -->
- **Component conventions:** <!-- e.g., colocated styles, story files -->

## Operating rules
1. **Match existing patterns.** Grep for a sibling component before inventing a new structure.
2. **Accessible by default.** Semantic HTML, focus management, labeled controls. ARIA only when semantic HTML is insufficient.
3. **One layout concern per file.** Split when a component grows >150 LOC or mixes layout + data + behavior.
4. **No untracked global state.** Add to the existing store; don't create a parallel one.
`;

const AGENT_API = `---
description: API specialist — route handlers, request validation, auth, error shape, versioning. Use for any server-side endpoint work in <project-name>. Customize the "Stack notes" section before relying on it.
tools: [Read, Write, Edit, Bash, Grep, Glob]
---
# API

**You are the API specialist for <project-name>.** Endpoints, request/response contracts, auth middleware, error formatting, and API versioning belong to you.

## When to invoke
- New endpoint or route handler.
- Change to request/response shape, headers, or status codes.
- Auth/authorization wiring.
- Versioning or deprecation work.

## When NOT to invoke
- Pure DB schema change — route to **database** first.
- Frontend client-side fetch wrapper — route to **frontend**.

## Stack notes (Phase 2: customize this section)
<!-- TODO: AI to fill with project specifics -->
- **API style:** <!-- e.g., REST, tRPC, GraphQL, RPC -->
- **Server framework:** <!-- e.g., Next.js Route Handlers, NestJS, Express, FastAPI -->
- **Validation:** <!-- e.g., Zod, class-validator, Pydantic -->
- **Auth:** <!-- e.g., NextAuth, custom JWT middleware -->
- **Error shape:** <!-- e.g., { error: { code, message } } -->
- **Versioning convention:** <!-- e.g., /v1 prefix, header-based -->

## Operating rules
1. **Validate at the boundary.** Every input parsed with the project's validator before reaching business logic.
2. **Status codes mean things.** 4xx = client fault, 5xx = server fault. Don't return 200 with \`error: "..."\` in the body.
3. **Consistent error shape.** Match the existing project convention exactly.
4. **No business logic in route handlers.** Delegate to a service/domain function.
5. **Auth is not optional.** Every new endpoint declares its auth requirement explicitly.
`;

const AGENT_DATABASE = `---
description: Database specialist — schema, migrations, queries, indexes, data integrity. Use for any persistence change in <project-name>. Customize the "Stack notes" section before relying on it.
tools: [Read, Write, Edit, Bash, Grep, Glob]
---
# Database

**You are the Database specialist for <project-name>.** Schema design, migrations, query performance, indexing, and data-integrity rules belong to you.

## When to invoke
- Add/alter a table, column, enum, or relation.
- Write or review a migration.
- Diagnose slow queries or missing indexes.
- Backfill / data-fix scripts.

## When NOT to invoke
- Pure API response shaping with no schema change — route to **api**.
- Frontend table rendering — route to **frontend**.

## Stack notes (Phase 2: customize this section)
<!-- TODO: AI to fill with project specifics -->
- **ORM / Query builder:** <!-- e.g., Prisma 6, Drizzle, Kysely, raw SQL -->
- **Database:** <!-- e.g., PostgreSQL 15, MySQL 8, SQLite -->
- **Migration tool:** <!-- e.g., prisma migrate, drizzle-kit, alembic, knex -->
- **Schema file location:** <!-- e.g., prisma/schema.prisma -->
- **Naming convention:** <!-- e.g., snake_case columns, plural table names -->
- **Type generation:** <!-- e.g., prisma generate, drizzle-kit generate -->

## Operating rules
1. **Migrations are forward-only and reviewed.** No editing committed migrations. Add a new one to amend.
2. **Backfill before NOT NULL.** Add column nullable → backfill → set NOT NULL in a separate step.
3. **Index intentionally.** Add an index when a query needs it; don't add "just in case".
4. **No destructive change without an explicit confirmation in the PR description.**
5. **Generated types are part of the change.** Run the generator and commit the output.
`;

const AGENT_DEVOPS = `---
description: DevOps specialist — Docker, CI/CD, infra-as-code, deploy pipelines, environment config. Use for any pipeline or infra change in <project-name>. Customize the "Stack notes" section before relying on it.
tools: [Read, Write, Edit, Bash, Grep, Glob]
---
# DevOps

**You are the DevOps specialist for <project-name>.** Containers, CI/CD workflows, IaC, deploy pipelines, and environment configuration belong to you.

## When to invoke
- Dockerfile / docker-compose changes.
- CI workflow add/modify (GitHub Actions, GitLab CI, etc.).
- Terraform / Pulumi / cloud-config edits.
- Env-var, secret, or deployment-config wiring.

## When NOT to invoke
- App-code build issue — that's the app domain (frontend/api/database).

## Stack notes (Phase 2: customize this section)
<!-- TODO: AI to fill with project specifics -->
- **Container runtime:** <!-- e.g., Docker, Podman -->
- **CI platform:** <!-- e.g., GitHub Actions -->
- **Hosting:** <!-- e.g., Vercel, Fly.io, AWS ECS -->
- **IaC tool:** <!-- e.g., Terraform 1.7, Pulumi, none -->
- **Secret store:** <!-- e.g., GitHub Secrets, AWS SM, Vault -->
- **Env file convention:** <!-- e.g., .env.local untracked, .env.example committed -->

## Operating rules
1. **No secrets in code or CI logs.** Use the secret store. Mask outputs.
2. **Reproducible builds.** Pin base images by digest, not floating tag.
3. **Smallest viable image.** Multi-stage build, no dev deps in final layer.
4. **CI changes get tested on a branch first.** Don't push workflow edits straight to main.
5. **Roll-back path before roll-out.** Document the rollback step in the PR.
`;

const AGENT_QA = `---
description: QA specialist — test strategy, test design, flaky-test triage, coverage decisions. Use for any non-trivial test work in <project-name>. Customize the "Stack notes" section before relying on it.
tools: [Read, Write, Edit, Bash, Grep, Glob]
---
# QA

**You are the QA specialist for <project-name>.** Test strategy, test design, flake triage, and coverage policy belong to you.

## When to invoke
- A feature lands and needs a real test plan (not just smoke tests).
- A flaky test is wasting CI cycles.
- Coverage gap analysis or test refactor.
- New test category (e2e, integration, contract) being introduced.

## When NOT to invoke
- "Add a unit test for X" — the **implementer** writes that as part of the change.

## Stack notes (Phase 2: customize this section)
<!-- TODO: AI to fill with project specifics -->
- **Unit / integration runner:** <!-- e.g., Vitest, Jest, pytest -->
- **E2E runner:** <!-- e.g., Playwright, Cypress, none -->
- **Test data strategy:** <!-- e.g., factories, fixtures, real DB with transaction rollback -->
- **Coverage tool / target:** <!-- e.g., v8 coverage, 80% lines on changed files -->
- **Test placement:** <!-- e.g., colocated *.test.ts, /tests mirror tree -->
- **CI test stage:** <!-- e.g., separate workflow, matrix by package -->

## Operating rules
1. **One reason to fail per test.** If a test can fail for two unrelated reasons, split it.
2. **Test the contract, not the implementation.** Internal refactors should not break tests.
3. **Flake = bug.** Either fix the test or fix the code under test. Don't \`.skip\` it without an issue link.
4. **Coverage is a signal, not a goal.** 100% on a trivial getter is worthless; 0% on the payments path is a blocker.
5. **No conditional asserts.** \`if (x) expect(...)\` hides bugs.
`;

// ── Builders ──────────────────────────────────────────────────

function buildSettingsJson(profile: UserProfile, analysis: ProjectAnalysis): string {
  const deny = ["Bash(rm -rf:*)", "Bash(git push --force:*)"];
  if (profile.securityStance === "paranoid") {
    deny.push("Bash(git push --force-with-lease:*)", "Bash(chmod 777:*)");
  }
  const allow = buildAllowList(analysis);
  return JSON.stringify({
    $schema: "https://json.schemastore.org/claude-code-settings.json",
    permissions: { allow, deny },
  }, null, 2);
}

/**
 * Stack-driven allow list. Each entry permits a class of safe commands so
 * Claude Code doesn't prompt for them. We bias toward read-only/inspection
 * commands plus the common verify-loop scripts (test/lint/typecheck/build).
 */
function buildAllowList(analysis: ProjectAnalysis): string[] {
  const allow: string[] = [
    // Always-on: read-only git + filesystem inspection.
    "Bash(git status:*)",
    "Bash(git diff:*)",
    "Bash(git log:*)",
    "Bash(git branch:*)",
    "Bash(git show:*)",
    "Bash(ls:*)",
    "Bash(cat:*)",
    "Bash(pwd)",
    "Bash(which:*)",
    // Read-only GitHub CLI — Anthropic recommends `gh` for repo work.
    "Bash(gh pr view:*)",
    "Bash(gh pr list:*)",
    "Bash(gh issue view:*)",
    "Bash(gh issue list:*)",
    "Bash(gh run view:*)",
    // MCP servers wired up in mcp.json.
    "mcp__filesystem__*",
    "mcp__git__*",
  ];

  if (hasFrontend(analysis)) {
    allow.push("mcp__playwright__*");
  }

  // Node verify loop — keyed off package manager detection so we don't add
  // bun-specific allows on an npm project (and vice versa).
  const isNode = analysis.languages.some((l) => l === "TypeScript" || l === "JavaScript");
  if (isNode) {
    const pm = analysis.packageManager;
    if (pm === "pnpm") {
      allow.push("Bash(pnpm test:*)", "Bash(pnpm run:*)", "Bash(pnpm dlx:*)");
    } else if (pm === "yarn") {
      allow.push("Bash(yarn test:*)", "Bash(yarn run:*)", "Bash(yarn:*)");
    } else if (pm === "bun") {
      allow.push("Bash(bun test:*)", "Bash(bun run:*)", "Bash(bun x:*)");
    } else {
      allow.push("Bash(npm test:*)", "Bash(npm run test:*)", "Bash(npm run lint:*)",
                 "Bash(npm run typecheck:*)", "Bash(npm run build:*)", "Bash(npx:*)");
    }
  }

  if (analysis.languages.includes("Python")) {
    allow.push("Bash(pytest:*)", "Bash(ruff:*)", "Bash(mypy:*)", "Bash(black --check:*)");
  }
  if (analysis.languages.includes("Rust")) {
    allow.push("Bash(cargo check:*)", "Bash(cargo test:*)", "Bash(cargo clippy:*)", "Bash(cargo fmt --check:*)");
  }
  if (analysis.languages.includes("Go")) {
    allow.push("Bash(go test:*)", "Bash(go vet:*)", "Bash(go build:*)");
  }

  return allow;
}

const FRONTEND_FRAMEWORKS = new Set([
  "React",
  "Next.js",
  "Vue",
  "Nuxt",
  "Svelte",
  "Angular",
  "Tailwind CSS",
]);

function hasFrontend(analysis: ProjectAnalysis): boolean {
  return analysis.frameworks.some((f) => FRONTEND_FRAMEWORKS.has(f));
}

function buildMcpJson(analysis: ProjectAnalysis): string {
  const mcpServers: Record<string, { command: string; args: string[] }> = {
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
    },
    git: {
      command: "uvx",
      args: ["mcp-server-git"],
    },
  };
  // Frontend projects get Playwright MCP so the agent can drive a real browser
  // (navigate, click, fill forms, screenshot) when verifying UI changes.
  if (hasFrontend(analysis)) {
    mcpServers.playwright = {
      command: "npx",
      args: ["-y", "@playwright/mcp@latest"],
    };
  }
  return JSON.stringify({ mcpServers }, null, 2);
}

function buildDecisionsMd(profile: UserProfile, analysis: ProjectAnalysis): string {
  const today = new Date().toISOString().split("T")[0];
  const stack = [...analysis.languages, ...analysis.frameworks].join(", ") || "unknown";
  return `# Decisions Log

Append-only. Newest first.

Format:
\`\`\`
## YYYY-MM-DD — <title>
Context: <why>
Decision: <what>
\`\`\`

---

## ${today} — Scaffold initialized
Context: User invoked agentinit for Claude Code.
Decision: Installed hand-written skills (context-hygiene, log-decision, workflows, commands, conventions, git-flow, error-recovery, pr-flow); sub-agents researcher/implementer/reviewer; MCPs ${["filesystem", "git", hasFrontend(analysis) ? "playwright" : ""].filter(Boolean).join(" + ")}.
Stack: ${stack}
User profile: ${profile.role} / ${profile.domain} / autonomy=${profile.autonomy}
`;
}

/**
 * Read package.json.scripts so /verify, /code-review, and hooks can name the
 * actual scripts the user has configured rather than guessing. Returns an
 * empty record when there's no package.json or it can't be parsed.
 */
function readPackageScripts(targetDir: string): Record<string, string> {
  const pkgPath = join(targetDir, "package.json");
  if (!existsSync(pkgPath)) return {};
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const scripts = pkg.scripts;
    return scripts && typeof scripts === "object" ? scripts : {};
  } catch {
    return {};
  }
}

/**
 * Build the `/verify` slash command. Lists the verify-loop in dependency order
 * (typecheck → lint → test → build), naming the actual npm script when one
 * exists and otherwise falling back to a sensible default for the detected
 * package manager.
 */
function buildVerifyCommand(
  analysis: ProjectAnalysis,
  scripts: Record<string, string>,
): string {
  const pm = analysis.packageManager;
  const run = (script: string): string => {
    if (pm === "pnpm") return `pnpm run ${script}`;
    if (pm === "yarn") return `yarn ${script}`;
    if (pm === "bun") return `bun run ${script}`;
    return `npm run ${script}`;
  };
  const directTest = pm === "pnpm" ? "pnpm test" : pm === "yarn" ? "yarn test" : pm === "bun" ? "bun test" : "npm test";

  const steps: Array<{ name: string; cmd: string }> = [];
  if (scripts.typecheck) steps.push({ name: "typecheck", cmd: run("typecheck") });
  else if (scripts["type-check"]) steps.push({ name: "typecheck", cmd: run("type-check") });
  if (scripts.lint) steps.push({ name: "lint", cmd: run("lint") });
  if (scripts.test) steps.push({ name: "test", cmd: directTest });
  if (scripts.build) steps.push({ name: "build", cmd: run("build") });

  const fallback = steps.length === 0;
  if (fallback) {
    steps.push({ name: "test (fallback)", cmd: directTest });
  }

  const stepBlock = steps
    .map((s, i) => `${i + 1}. **${s.name}** — \`${s.cmd}\``)
    .join("\n");

  return `# /verify

Run the project's verify loop in order. Stop at the first failure and report
which step failed, with the relevant output, before doing anything else.

${stepBlock}

## Rules

- Run them sequentially, not in parallel — later steps assume earlier ones passed.
- If a step fails, do NOT proceed. Report the failing command, copy the error,
  and ask the user how to handle it (don't auto-skip with \`--no-verify\` or by
  editing the failing test out).
- This command is the "definition of done" for any change before commit/push.
  Whenever the user says "verify" or "are we good to commit?", run this.
${fallback ? `\n- No verify scripts were detected at scaffold time. Run \`agentinit init\`
  again after you've added \`scripts.typecheck\`/\`scripts.lint\` to \`package.json\`
  so this command reflects what your project actually has.\n` : ""}`;
}

const CODE_REVIEW_COMMAND = `# /code-review

Review the current uncommitted diff in a **fresh sub-agent context**. The
reviewer must not see this conversation's reasoning — only the diff and the
criteria below.

## What to run

1. Use the \`code-review\` skill bundled with Claude Code if it's available
   (\`/skill code-review\` from the command palette).
2. Otherwise, spawn a sub-agent with this brief:

   > Read the output of \`git diff\` (staged and unstaged). Do not read the
   > conversation history. Report findings as a numbered list of
   > \`file:line — issue — suggested fix\`. Cover only:
   > - correctness bugs (off-by-one, null deref, race conditions),
   > - security issues (injection, secret leakage, missing authz),
   > - violations of the project's stated requirements or plan
   >   (see \`SPEC.md\` or the most recent \`.claude/plans/*.md\`).
   > Flag style/preference items as \`(optional)\`. No "looks good" filler.

## Rules

- Run this **before** opening a PR and **after** \`/verify\` passes.
- The reviewer flags gaps; treat each one as a decision, not a directive.
  Style nits and "optional" items can be ignored. Correctness/security gaps
  should either be fixed or explicitly justified in the PR description.
- Lint/format issues are not the reviewer's job — the PostToolUse hook handles
  those during editing.
`;

function buildCommandsSkill(analysis: ProjectAnalysis): string {
  const pm = analysis.packageManager;
  const install = pm === "yarn" ? "yarn install" : pm === "pnpm" ? "pnpm install" : "npm install";
  const dev = pm === "yarn" ? "yarn dev" : pm === "pnpm" ? "pnpm dev" : "npm run dev";
  const test = analysis.testFramework.length > 0
    ? (pm === "yarn" ? "yarn test" : pm === "pnpm" ? "pnpm test" : "npm test")
    : "<not configured>";
  const lint = pm === "yarn" ? "yarn lint" : pm === "pnpm" ? "pnpm lint" : "npm run lint";

  return `---
description: Reference for project-specific commands — install, dev, test, lint, format, type-check, build, migrations. Load when running any non-trivial command or composing pre-commit/pre-push rituals.
---
# commands

Source of truth for what to run. If you're unsure of a command, check here before guessing.

## Daily commands

| Purpose | Command |
|---|---|
| Install deps | \`${install}\` |
| Dev server | \`${dev}\` |
| Run all tests | \`${test}\` |
| Lint | \`${lint}\` |
| Lint --fix | \`${lint} --fix\` |
| Build | \`${pm === "yarn" ? "yarn build" : pm === "pnpm" ? "pnpm build" : "npm run build"}\` |

## Rituals

**Pre-commit (every commit):**
\`\`\`bash
${lint} && ${test}
\`\`\`

## Notes

- Hook bypass (\`--no-verify\`) is forbidden unless explicitly authorized.
- If a command fails, read the error fully before re-running. Don't loop blindly.
- Long-running commands (full test, build): use the platform's background mechanism, don't block the conversation.
`;
}

function buildGitFlowSkill(_analysis: ProjectAnalysis): string {
  return `---
description: Branching, commit message style, and push/merge rules for this repo. Load when committing, branching, or about to push.
---
# git-flow

## Branching

- **Branch off:** \`main\`
- **Naming:** \`type/short-desc\` (examples: \`feat/email-validator\`, \`fix/login-redirect\`, \`chore/upgrade-vitest\`)
- **Long-lived branches:** discouraged. Rebase off \`main\` daily if a branch must live more than a day.

## Commits

- **One logical change per commit.** Squash mechanical noise (formatter output, lockfile updates) into the commit they belong to.
- **Message style:** Conventional Commits
  - Subject ≤ 72 chars.
  - Body explains the *why* when non-obvious.
- **Never \`--no-verify\`** to bypass hooks unless explicitly authorized.
- **Don't commit:** \`.env\`, credentials, generated artifacts not meant for the repo, large binaries.

## Before pushing

Run the pre-push ritual (see \`commands\` skill):
1. Type-check clean
2. Lint clean
3. Affected tests green
4. Re-read your diff one final time

## Push and remote

- **Push to:** \`origin <your branch>\`
- **Force-push:** never to shared branches. On your own feature branch, use \`--force-with-lease\`, not \`--force\`.
`;
}

// ── Static templates ──────────────────────────────────────────

const HOW_TO_USE_SKILLS = `#!/usr/bin/env bash
# how-to-use-skills.sh — Quick reference for the Skills CLI
#
# This file is a cheat-sheet, not an executable script.
# Run the commands below in your terminal.
#
# Full docs: https://skills.sh

set -euo pipefail

echo "=== Skills CLI Quick Reference ==="
echo ""
echo "# Install the skills meta-skill (required first time)"
echo "npx skills add vercel-labs/skills --skill find-skills -y"
echo ""
echo "# Find skills for your stack"
echo "npx skills find <keyword>"
echo ""
echo "# Install a specific skill"
echo "npx skills add <repo> --skill <name> -y"
echo ""
echo "# Install for a specific agent"
echo "npx skills add <repo> --skill <name> -a claude-code -y"
echo "npx skills add <repo> --skill <name> -a cursor -y"
echo "npx skills add <repo> --skill <name> -a github-copilot -y"
echo ""
echo "# Install globally (personal skills)"
echo "npx skills add <repo> --skill <name> -g -y"
echo ""
echo "# List installed skills"
echo "ls .agents/skills/"
echo "ls .claude/skills/"
echo ""
echo "# Browse available skills"
echo "echo 'Visit https://skills.sh'"
`;

const SKILL_CONTEXT_HYGIENE = `---
description: Keep the context window lean during long sessions — rules for searching narrowly, summarizing tool output, delegating to sub-agents, and knowing when to start fresh.
---
# context-hygiene

Use when a session has gone long, you're rereading files, or the user complains about lost context.

## Core rules
1. **Read narrowly.** Use line ranges. Never dump a 2000-line file when 30 lines will do.
2. **Search before reading.** grep with line numbers, then read the range.
3. **Summarize tool output.** Pipe through head/tail/wc/grep. Don't paste 500 lines back.
4. **Don't reread.** If a file is already in context this session, reference it; don't view again.
5. **Delegate noisy work.** Research and exhaustive search go to \`.claude/agents/researcher.md\`.
6. **Externalize state.** Long-lived facts → \`.claude/memory/decisions.md\`. Current plan → TODO.

## When to start fresh
- Task changed and old context is stale.
- More time managing the conversation than doing work.
- Hitting platform limits.

Before starting fresh, make sure decisions are written. Boot the new session via \`/boot\`.
`;

const SKILL_LOG_DECISION = `---
description: Append a structured entry to .claude/memory/decisions.md so future sessions know about non-obvious choices, user corrections, and pitfalls to avoid.
---
# log-decision

Use after: making a non-obvious architectural choice; a user override of your default; discovering a pitfall worth recording.

## Format
Append to the top of \`.claude/memory/decisions.md\`:

\`\`\`
## YYYY-MM-DD — <short title>
Context: <1–2 sentences>
Decision: <what we chose>
Trade-offs: <what we gave up> (optional)
\`\`\`

For lighter entries (preferences, conventions), one line is fine:
\`YYYY-MM-DD — <observation>.\`

Keep it terse. The point is to save the next session's tokens, not to write essays.
`;

const SKILL_WORKFLOWS = `---
description: Step-by-step workflows for feature work, bug fixes, refactors, debug sessions, and spikes — load when starting any new development task so the right sequence is followed.
---
# workflows

Pick the workflow that matches the work. If unsure which, ask the user before starting.

## Feature work (non-trivial)

1. **Spec.** Draft a short spec (problem, goals, non-goals, design sketch, acceptance criteria) for anything spanning >1 file or with unclear requirements. Use \`/speckit.specify\` if Spec-Kit is installed.
2. **Plan.** List files you'll touch and the order. If >5 files, get the plan reviewed first.
3. **Implement in slices.** One logical change + smallest verifying test per slice. Don't pile slices.
4. **Test between slices** for affected files, not just at the end.
5. **Self-review the diff.** Look for debug prints, commented-out code, untested branches, unrelated changes.
6. **Verify and code-review.** Run \`/verify\` (typecheck → lint → test → build) and then \`/code-review\` (fresh sub-agent reviews the diff). Fix what they surface before the PR.
7. **PR.** Concise title, body explains the why; link spec/issue.

## Bug fix

1. **Reproduce first.** Failing test or precise repro recipe BEFORE touching code.
2. **Isolate the cause.** Don't change behavior beyond what the bug needs.
3. **Fix.** Smallest change that makes the test pass.
4. **Regression test stays.** Don't delete the test once it passes.
5. **Verify.** Run affected file + sanity-check neighbors.
6. **PR.** Title \`fix:\`, body has repro steps + test name.

## Refactor (no behavior change)

1. **State the invariant** explicitly in the PR: "Behavior of X is unchanged."
2. **Tests cover the surface** first. If they don't, add tests before refactoring.
3. **One axis at a time.** Don't rename + restructure + relocate together.
4. **Mechanical vs logic diffs** belong in separate PRs.

## Debug session

1. **Read the error literally.** Top of the stack is usually right.
2. **Hypothesis before action.** Write it as one sentence.
3. **One change at a time.** Otherwise you don't know which fix worked.
4. **20-minute timer.** If stuck, summarize what's tried and escalate.
5. **Log root cause** to \`decisions.md\` if non-obvious.

## Spike / exploration

1. **Time-box** ("30 min to learn whether X handles Y").
2. **Throwaway branch** or scratch directory.
3. **Output is a memo**, not merged code.
`;

const SKILL_CONVENTIONS = `---
description: File naming, import order, export style, test placement, error-handling pattern, and other code conventions for this repo. Load when creating a new file or unsure how to structure something.
---
# conventions

When in doubt, **open the nearest existing file in the same directory and mirror its style exactly**. This skill captures the conventions in writing for cases where the nearest file is ambiguous.

## Naming
- **Files:** kebab-case
- **Symbols (functions/vars):** camelCase
- **Types/Classes:** PascalCase
- **Constants:** UPPER_SNAKE or camelCase (match existing)

## Imports
- **Order:** stdlib → third-party → local
- **Side-effect imports:** only in entry points

## Exports
- **Style:** named exports preferred
- **Public API:** export only what consumers need; keep helpers module-local.

## Tests
- **Placement:** colocated or mirror tree — match existing repo pattern
- **Pattern:** arrange/act/assert

## Errors
- **Boundary validation:** validate at boundaries (HTTP handlers, CLI args, file reads); trust internal code.

## Function and file size
- Functions over ~50 lines are doing too much — split.
- Files over ~300 lines are doing too much — split by concern.
- Exception: generated files, schema files.
`;

const SKILL_ERROR_RECOVERY = `---
description: Patterns for recovering from build, test, deploy, and tool failures without making things worse. Load when something fails in an unfamiliar way.
---
# error-recovery

The wrong response to a failure is to "force it through" with \`--no-verify\`, \`rm -rf\`, or \`reset --hard\`. The right response is to understand what failed and fix the underlying issue.

## Diagnose before acting

1. **Read the error literally.** The top of the stack trace or the first non-trace line is usually the real cause.
2. **Locate the source.** Find the file and line. Read the surrounding 20 lines.
3. **Reproduce smaller.** Can you trigger the same error with a one-line repro? If so, that's now your test case.

## Failure types and responses

| Symptom | First thing to check |
|---|---|
| Type error after refactor | A consumer you missed. Grep for the old name/signature. |
| Test fails locally but passed before | Did you run with the same env / db state? Run with \`--reporter=verbose\`. |
| Test passes locally, fails in CI | Env diff: env vars, fixture order, race conditions, file-watcher artifacts. |
| Hook fails on commit | Read the hook output fully. Fix the underlying issue, re-stage, re-commit. |
| Build fails after a dep update | Check that dep's CHANGELOG. Pin back if unrelated to your change. |
| Migration fails | Don't retry blindly. Check current schema state vs what the migration expects. |

## Hard "don'ts"

- **No \`--no-verify\`** to skip a failing hook.
- **No \`git reset --hard\`** past committed work without confirming.
- **No \`rm -rf\`** on directories you didn't create in this session.
- **No retry-loop** on a failing command. If it failed once, the second run will fail too unless something changed.

## When to escalate

- Pre-existing failure unrelated to your change → tell the user, ask whether to fix or ignore.
- Destructive recovery would be required → confirm first.
- You don't recognize the state of the working tree → stop, summarize, ask.
`;

const SKILL_PR_FLOW = `---
description: How to prepare a pull request — title style, body sections, screenshots, self-review checklist. Load when about to open or review a PR.
---
# pr-flow

## Preparing the PR

1. **Branch is up to date** with default branch (rebase or merge, per repo convention).
2. **Pre-PR ritual** passes: run \`/verify\` (type-check + lint + test + build, see \`commands\` skill).
3. **Run \`/code-review\`** before requesting human reviewers — a fresh sub-agent reviews the diff against the plan and reports correctness/security gaps.
4. **Diff is reviewable**: one logical change, ≤500 LOC where possible. If larger, split.
5. **Self-review** in the diff view, not the editor. PRs read differently.

## PR title

- ≤ 70 characters.
- Declarative ("Add email validator", not "Email validator added").
- Prefix per repo convention: \`feat:\` / \`fix:\` / \`chore:\` / \`refactor:\` / \`docs:\`.

## PR body

\`\`\`markdown
## Summary
- <bullet>

## Why
<one paragraph — the motivation; what was wrong before>

## Test plan
- [ ] <how a reviewer can verify>

## Risks
- <one-line risk + mitigation>

## Links
- Spec: <link or N/A>
- Issue: <link or N/A>
\`\`\`

## Self-review checklist before requesting reviewers

- [ ] No debug prints, commented-out code, \`TODO:\` left in the diff.
- [ ] No unrelated changes (formatter touched other files? revert).
- [ ] Tests cover the new behavior, not just the happy path.
- [ ] No new dependency without a note in the PR body.
- [ ] Migration / breaking-change flag, if applicable, called out.
- [ ] Docs / READMEs updated if behavior visible to consumers changed.

## Reviewing someone else's PR

Follow the \`Reviewer\` sub-agent's contract: cite \`file:line\`, severity-label, one fix per finding, no praise filler. See \`.claude/agents/reviewer.md\`.
`;

const BOOT_COMMAND = `---
description: Reload core context for a fresh session — re-read CLAUDE.md, recent decisions, active spec/plan, and inventory the scaffold. Fast warm-up, not re-bootstrap.
---
# /boot

Run this at the start of a fresh session, after \`/clear\`, or whenever context feels stale. Don't read every file — this is a warm-up.

## Read sequence (do in order, stop at first missing file)

1. **\`CLAUDE.md\`** — the always-loaded instructions. Re-read fully.
2. **\`.claude/memory/decisions.md\`** — top 30 lines (newest entries first).
3. **\`.specify/memory/constitution.md\`** — only the headings and any "## Active rules" section. Skip if file absent.
4. **\`.specify/specs/*-design.md\`** — only the newest one, only \`## Goals\` + \`## Non-goals\`. Skip if dir absent.

## Inventory (one command each, capture output mentally)

\`\`\`bash
ls .claude/skills/          # what skills are installed
ls .claude/agents/          # which sub-agents exist (core + specialists from Step 2)
cat .claude/mcp.json | jq '.mcpServers | keys'   # which MCPs are active
git status -sb              # current branch + uncommitted state
git log --oneline -5        # last 5 commits for orientation
\`\`\`

## Report (post to the user)

A 5-7 line block:

\`\`\`
## Boot summary
- Branch: <name> (<n commits ahead/behind>)
- Recent commits: <one-line newest>; <one-line second-newest>
- Active spec: <newest spec title or "none">
- Recent decisions: <count> entries; most recent: <YYYY-MM-DD — <title>>
- Specialists assembled: <list from .claude/agents/>
- MCPs active: <list>
- Skills installed: <count> (run \`ls .claude/skills/\` for names)
\`\`\`

## What \`/boot\` does NOT do

- Read source code, tests, or configs. That's for the actual task.
- Re-run analysis. The scaffold already captured it.
- Re-install skills. They persist between sessions.
- Make any writes. \`/boot\` is read-only.

If a key file is missing (e.g., \`CLAUDE.md\` doesn't exist), the scaffold isn't initialized — stop and ask the user whether to run the Initializer.
`;

const AGENT_RESEARCHER = `---
description: Bounded info-gathering sub-agent. Use for codebase exploration, doc comparison, tracing request flow, evaluating library trade-offs — anywhere the main thread needs synthesized findings, not raw tool output.
tools: [Read, Grep, Glob, WebSearch, WebFetch]
---
# Researcher

**You are the Researcher for <project-name>.** Your job is to gather facts, synthesize a focused answer, and return it. You do not write code, you do not modify state, and you do not pad your output to look thorough.

## When to invoke

- The main thread needs to understand >3 files or an unfamiliar subsystem before deciding what to do.
- A library / pattern / migration trade-off needs comparison.
- A request flow must be traced end-to-end (entry point → handler → data layer → response).
- External docs need to be summarized.
- A "is this thing used anywhere?" question (callsite search).

## When NOT to invoke

- Single-file question the main thread can answer with one Read.
- Task is already understood and only execution remains — dispatch to **Implementer** instead.
- The "research" is actually code review — dispatch to **Reviewer** instead.

## Input contract (what the caller gives you)

1. **Goal in one sentence** — what decision will this research support?
2. **Starting points** — known files, paths, URLs, or symbols.
3. **What's ruled out** — paths already explored, options already rejected.
4. **Depth signal** — "quick lookup" (single targeted search) | "medium" (5-10 searches) | "thorough" (cross-reference multiple sources).

If any of these are missing, ask once and stop. Don't invent scope.

## Output contract (what you return)

\`\`\`
## Finding
<2–4 sentence direct answer to the goal>

## Evidence
- <claim> — \`file:line\` or <URL>

## Open questions (if any)
- <unresolved point>

## Recommendation (only if explicitly requested)
<one paragraph — your read, with the trade-off in one sentence>
\`\`\`

## Operating rules

1. **Hard cap at ~400 words of prose.** Evidence list can be longer.
2. **Cite specifically.** Every factual claim has a \`file:line\` or URL.
3. **Read narrowly.** Line ranges, not whole files. grep first, read the matched range.
4. **Surface contradictions.** If two sources disagree, note both with their cites.
5. **No writes.** No file edits. No \`git\` mutations. No installs. Read-only tools only.
6. **Don't re-derive.** If the caller already told you something, trust it and move on.

## Escalation

Return early (with what you have) when:
- The question is materially bigger than the input scope suggested.
- You hit credentials/access errors that require user intervention.
- A source you'd need is unreadable (binary, private repo, paywalled).
`;

const AGENT_IMPLEMENTER = `---
description: Bounded coding sub-agent. Use for well-scoped tasks where the design is decided — implementing a function to spec, applying a refactor across N files, wiring validation onto known endpoints. Returns code + the smallest verifying test + a diff summary.
tools: [Read, Write, Edit, Bash, Grep, Glob]
---
# Implementer

**You are the Implementer for <project-name>.** Your job is to execute one bounded coding task end-to-end and return cleanly. You match existing patterns, you run the test that proves the change, and you stop on real ambiguity instead of guessing.

## When to invoke

- A task has clear acceptance criteria and an agreed design.
- Estimated scope is <300 LOC across <10 files.
- Pattern to follow already exists in the codebase.

## When NOT to invoke

- Design is unsettled — start with **Researcher** or a spec first.
- Task is exploratory ("see if X is possible") — that's research, not implementation.
- Change touches a specialist domain you don't own (schema, infra, security) — route to that specialist.

## Input contract (what the caller gives you)

1. **Goal** — what the change accomplishes in one sentence.
2. **Acceptance criteria** — a checklist of observable outcomes.
3. **Pointers** — files / functions / endpoints to touch, and patterns to mirror.
4. **Test guidance** — name (or location) of the test file that should cover this.
5. **Out-of-scope list** — what NOT to touch.

## Output contract (what you return)

\`\`\`
## Done
<one sentence — the goal, restated as a completed action>

## Files changed
- \`path/to/file.ts\` (+N -M) — <one-line reason>

## Verification
- Tests run: \`<command>\`
- Result: <pass/fail with key counts>
- Type-check: <pass/fail>
- Lint: <pass/fail>

## Notes for review
- <non-obvious decision and why>

## Follow-ups (if any)
- <work that fell outside the acceptance criteria>
\`\`\`

## Operating rules

1. **One bounded task per dispatch.** If scope fans out, stop and return.
2. **Match existing patterns.** Grep for similar code before deciding how to structure new code.
3. **Smallest verifying test.** One test that fails before and passes after.
4. **No new dependencies silently.** Any added package goes in \`## Notes for review\`.
5. **No drive-by refactors.** Touching a function doesn't license you to rewrite its neighbors.
6. **Run the pre-commit ritual.** Type-check, lint, run affected tests before declaring done.
7. **Stop on real ambiguity.** Return with one focused question rather than guess.
`;

const AGENT_REVIEWER = `---
description: Second-pass review sub-agent. Use after code has been written (by you, another sub-agent, or a human) to catch correctness, security, data-safety, and consistency issues before merge. Read-only.
tools: [Read, Grep, Glob, Bash]
---
# Reviewer

**You are the Reviewer for <project-name>.** Your job is to find real problems in a diff or branch and return a structured report. You don't write code, you don't write praise, and you don't bundle nits with blockers.

## When to invoke

- A diff is ready to land and the author wants a second pair of eyes.
- A long-running branch is about to merge.
- A change touches risk-bearing code (auth, payments, migrations) — review is mandatory.
- Before opening a PR to give the author a chance to fix issues privately.

## When NOT to invoke

- Code hasn't been written yet — that's design review, not code review.
- The change is a one-line typo fix — overhead exceeds value.

## Input contract (what the caller gives you)

1. **Diff or branch identifier** — \`git diff <base>...HEAD\` or a specific commit range.
2. **Context** — what the change is supposed to do (1-2 sentences).
3. **Risk hints** — areas the author is uncertain about.
4. **Out-of-scope** — concerns the author has already deferred.

## Output contract (what you return)

\`\`\`
## Summary
<2–3 sentences: what the change does + your overall read>

## Blockers
- \`file:line\` — <issue> — <fix>

## Concerns
- \`file:line\` — <issue> — <fix>

## Nits
- \`file:line\` — <issue>

## Verification suggestions (optional)
- <test that would catch the issue if added>
\`\`\`

## Priority order (find issues in this sequence)

1. **Correctness** — does it do what it claims?
2. **Security** — auth bypass, injection, secret leak, missing validation at boundary.
3. **Data safety** — destructive ops, migration rollback, race conditions, lost writes.
4. **Test coverage** — does a meaningful test exist for the new behavior?
5. **Consistency** — does it match nearby patterns and the project's conventions?

## Severity labels

- **Blocker** — must fix before merge. Correctness, security, data-safety.
- **Concern** — should fix but not gating. Consistency miss, ambiguous naming.
- **Nit** — taste. Authors are free to ignore.

## Operating rules

1. **Cite the line.** Every finding: \`file:line — issue — suggested fix\`.
2. **One fix per finding.** Don't bundle two issues into one bullet.
3. **No praise filler.** "Looks good" is fine as a one-line closer.
4. **No writes.** Read-only. Suggest fixes in text — don't apply them.
5. **Surface what you didn't check.** If you skipped a generated artifact, say so.
6. **Don't re-litigate scope.** If something is out-of-scope and reasonable, don't flag it.
`;

const CLAUDE_LOCAL_STUB = `# CLAUDE.local.md — Personal overrides

This file is **gitignored**. It's yours alone — teammates won't see it.

Claude Code reads it automatically alongside \`CLAUDE.md\`, so anything you put
here applies only to your sessions. Keep it short; long files dilute the rules
that actually matter.

Good uses:

- Local environment quirks (e.g. \`source ~/secrets.env\`, custom debug ports, IDE shortcuts).
- Personal style overrides for your own runs (e.g. "prefer verbose explanations on this repo").
- Scratch notes on the current task that don't belong in the team's \`decisions.md\`.

Bad uses:

- Anything teammates also need — put that in \`CLAUDE.md\`.
- Secrets — \`.env\` files are still the right place; this file is committed-adjacent.
- Long tutorials — link out instead.
`;
