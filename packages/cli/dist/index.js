#!/usr/bin/env node
import {
  BUILTIN_RULE_SLUGS,
  getBuiltinRuleContent,
  loadBuiltinRules,
  parseRule
} from "./chunk-AUWUU2ZX.js";

// src/index.ts
import { Command as Command7 } from "commander";

// src/commands/init.ts
import { Command as Command3 } from "commander";
import * as p5 from "@clack/prompts";
import chalk4 from "chalk";
import { existsSync as existsSync10 } from "fs";
import { join as join9 } from "path";

// src/analyzers/project.ts
import { existsSync, readFileSync } from "fs";
import { join, basename } from "path";
import fg from "fast-glob";
async function analyzeProject(targetDir) {
  const analysis = {
    name: basename(targetDir),
    languages: [],
    frameworks: [],
    packageManager: "unknown",
    testFramework: [],
    ci: [],
    deployTarget: [],
    hasDocker: false,
    hasTerraform: false,
    hasDatabase: false,
    monorepo: false,
    signals: []
  };
  const langIndicators = {
    TypeScript: ["tsconfig.json", "**/*.ts", "**/*.tsx"],
    JavaScript: ["**/*.js", "**/*.jsx"],
    Python: ["pyproject.toml", "requirements.txt", "setup.py", "**/*.py"],
    Rust: ["Cargo.toml"],
    Go: ["go.mod"],
    Java: ["pom.xml", "build.gradle"],
    "C#": ["**/*.csproj", "**/*.sln"],
    Ruby: ["Gemfile"],
    PHP: ["composer.json"],
    Swift: ["Package.swift"],
    Kotlin: ["build.gradle.kts"]
  };
  for (const [lang, patterns] of Object.entries(langIndicators)) {
    for (const pattern of patterns) {
      if (pattern.includes("*")) {
        const matches = await fg([pattern], { cwd: targetDir, ignore: ["node_modules/**", ".git/**"], onlyFiles: true });
        if (matches.length > 0) {
          if (!analysis.languages.includes(lang)) analysis.languages.push(lang);
          break;
        }
      } else {
        if (existsSync(join(targetDir, pattern))) {
          if (!analysis.languages.includes(lang)) analysis.languages.push(lang);
          break;
        }
      }
    }
  }
  if (existsSync(join(targetDir, "bun.lockb")) || existsSync(join(targetDir, "bun.lock")))
    analysis.packageManager = "bun";
  else if (existsSync(join(targetDir, "pnpm-lock.yaml")))
    analysis.packageManager = "pnpm";
  else if (existsSync(join(targetDir, "yarn.lock")))
    analysis.packageManager = "yarn";
  else if (existsSync(join(targetDir, "package-lock.json")))
    analysis.packageManager = "npm";
  else if (existsSync(join(targetDir, "poetry.lock")))
    analysis.packageManager = "poetry";
  else if (existsSync(join(targetDir, "requirements.txt")))
    analysis.packageManager = "pip";
  else if (existsSync(join(targetDir, "Cargo.lock")))
    analysis.packageManager = "cargo";
  else if (existsSync(join(targetDir, "go.sum")))
    analysis.packageManager = "go";
  const pkgPath = join(targetDir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const fwMap = {
        next: "Next.js",
        react: "React",
        vue: "Vue",
        nuxt: "Nuxt",
        angular: "Angular",
        svelte: "Svelte",
        express: "Express",
        fastify: "Fastify",
        nestjs: "NestJS",
        "@nestjs/core": "NestJS",
        hono: "Hono",
        elysia: "Elysia",
        "tailwindcss": "Tailwind CSS",
        prisma: "Prisma",
        "@prisma/client": "Prisma",
        drizzle: "Drizzle",
        "drizzle-orm": "Drizzle",
        typeorm: "TypeORM"
      };
      for (const [dep, fw] of Object.entries(fwMap)) {
        if (dep in allDeps && !analysis.frameworks.includes(fw)) {
          analysis.frameworks.push(fw);
        }
      }
      const testMap = {
        jest: "Jest",
        vitest: "Vitest",
        mocha: "Mocha",
        "@testing-library/react": "Testing Library",
        cypress: "Cypress",
        playwright: "Playwright",
        "@playwright/test": "Playwright"
      };
      for (const [dep, tf] of Object.entries(testMap)) {
        if (dep in allDeps && !analysis.testFramework.includes(tf)) {
          analysis.testFramework.push(tf);
        }
      }
    } catch {
    }
  }
  if (existsSync(join(targetDir, "pyproject.toml"))) {
    const content = readFileSync(join(targetDir, "pyproject.toml"), "utf-8");
    if (content.includes("django")) analysis.frameworks.push("Django");
    if (content.includes("fastapi")) analysis.frameworks.push("FastAPI");
    if (content.includes("flask")) analysis.frameworks.push("Flask");
    if (content.includes("pytest")) analysis.testFramework.push("pytest");
  }
  analysis.hasDocker = existsSync(join(targetDir, "Dockerfile")) || existsSync(join(targetDir, "docker-compose.yml")) || existsSync(join(targetDir, "docker-compose.yaml"));
  const tfFiles = await fg(["**/*.tf"], { cwd: targetDir, ignore: ["node_modules/**", ".git/**"] });
  analysis.hasTerraform = tfFiles.length > 0;
  const dbSignals = ["prisma", "drizzle", "migrations", "schema.sql", "alembic"];
  const dbFiles = await fg(
    dbSignals.map((s) => `**/*${s}*`),
    { cwd: targetDir, ignore: ["node_modules/**", ".git/**"] }
  );
  analysis.hasDatabase = dbFiles.length > 0;
  if (existsSync(join(targetDir, ".github", "workflows"))) analysis.ci.push("GitHub Actions");
  if (existsSync(join(targetDir, ".gitlab-ci.yml"))) analysis.ci.push("GitLab CI");
  if (existsSync(join(targetDir, "Jenkinsfile"))) analysis.ci.push("Jenkins");
  if (existsSync(join(targetDir, ".circleci"))) analysis.ci.push("CircleCI");
  if (existsSync(join(targetDir, "vercel.json")) || existsSync(join(targetDir, ".vercel")))
    analysis.deployTarget.push("Vercel");
  if (existsSync(join(targetDir, "netlify.toml"))) analysis.deployTarget.push("Netlify");
  if (existsSync(join(targetDir, "fly.toml"))) analysis.deployTarget.push("Fly.io");
  if (existsSync(join(targetDir, "railway.toml"))) analysis.deployTarget.push("Railway");
  if (existsSync(join(targetDir, "render.yaml"))) analysis.deployTarget.push("Render");
  if (analysis.hasTerraform) analysis.deployTarget.push("AWS/GCP/Azure (Terraform)");
  analysis.monorepo = existsSync(join(targetDir, "pnpm-workspace.yaml")) || existsSync(join(targetDir, "lerna.json")) || existsSync(join(targetDir, "nx.json")) || existsSync(join(targetDir, "turbo.json"));
  if (analysis.languages.length > 0) analysis.signals.push(...analysis.languages.map((l) => `lang:${l}`));
  if (analysis.frameworks.length > 0) analysis.signals.push(...analysis.frameworks.map((f) => `fw:${f}`));
  if (analysis.hasDocker) analysis.signals.push("docker");
  if (analysis.hasTerraform) analysis.signals.push("terraform");
  if (analysis.hasDatabase) analysis.signals.push("database");
  if (analysis.monorepo) analysis.signals.push("monorepo");
  if (analysis.ci.length > 0) analysis.signals.push("ci");
  return analysis;
}

// src/commands/profile.ts
import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { readFileSync as readFileSync2, writeFileSync, existsSync as existsSync2 } from "fs";
import { join as join2 } from "path";
async function collectProfile() {
  const roleChoice = await p.select({
    message: "What's your role and experience level?",
    options: [
      { value: "junior", label: "Junior Developer" },
      { value: "mid", label: "Mid-Level Developer" },
      { value: "senior", label: "Senior Developer" },
      { value: "lead", label: "Tech Lead / Architect" },
      { value: "solo", label: "Solo Founder / Indie" },
      { value: "_custom", label: "Other \u2014 let me type it" }
    ]
  });
  if (p.isCancel(roleChoice)) process.exit(0);
  let role = roleChoice;
  if (roleChoice === "_custom") {
    const customRole = await p.text({
      message: "Describe your role:",
      placeholder: "e.g., CTO, DevRel, Security Engineer, ML Researcher"
    });
    if (p.isCancel(customRole)) process.exit(0);
    role = customRole || "developer";
  }
  const domain = await p.select({
    message: "What's your primary domain?",
    options: [
      { value: "fullstack", label: "Full-Stack" },
      { value: "frontend", label: "Frontend" },
      { value: "backend", label: "Backend" },
      { value: "devops", label: "DevOps / Platform" },
      { value: "data", label: "Data Engineering" },
      { value: "mobile", label: "Mobile" },
      { value: "ml", label: "ML / AI" },
      { value: "infra", label: "Infrastructure / Cloud" }
    ]
  });
  if (p.isCancel(domain)) process.exit(0);
  const expertiseRaw = await p.text({
    message: "What frameworks/tools are you most experienced with?",
    placeholder: "e.g., React, Next.js, PostgreSQL, AWS",
    defaultValue: ""
  });
  if (p.isCancel(expertiseRaw)) process.exit(0);
  const expertise = (expertiseRaw || "").split(",").map((s) => s.trim()).filter(Boolean);
  const workingStyle = await p.select({
    message: "When building something non-trivial, what's your style?",
    options: [
      { value: "spec-first", label: "Spec first \u2014 plan before coding" },
      { value: "code-first", label: "Code first \u2014 iterate and refine" },
      { value: "mixed", label: "Mixed \u2014 depends on complexity" }
    ]
  });
  if (p.isCancel(workingStyle)) process.exit(0);
  const autonomy = await p.select({
    message: "How much should the AI confirm before acting?",
    options: [
      { value: "high", label: "High autonomy \u2014 just do obvious things, only ask on real ambiguity" },
      { value: "medium", label: "Medium \u2014 confirm non-trivial decisions" },
      { value: "low", label: "Low \u2014 confirm everything before acting" }
    ]
  });
  if (p.isCancel(autonomy)) process.exit(0);
  const reviewStrictness = await p.select({
    message: "When reviewing code, what should the AI flag?",
    options: [
      { value: "strict", label: "Strict \u2014 everything including style and naming" },
      { value: "balanced", label: "Balanced \u2014 bugs, security, logic, plus notable concerns" },
      { value: "relaxed", label: "Relaxed \u2014 only real problems (bugs, security, data safety)" }
    ]
  });
  if (p.isCancel(reviewStrictness)) process.exit(0);
  const communication = await p.select({
    message: "What communication style do you prefer?",
    options: [
      { value: "concise", label: "Concise \u2014 just the answer" },
      { value: "detailed", label: "Detailed \u2014 explain reasoning" },
      { value: "match-my-style", label: "Match my style \u2014 adapt to how I write" }
    ]
  });
  if (p.isCancel(communication)) process.exit(0);
  const prefsRaw = await p.text({
    message: "Any other preferences? (coding conventions, patterns you like/avoid, pet peeves)",
    placeholder: "e.g., conventional commits, prefer composition over inheritance, no barrel files",
    defaultValue: ""
  });
  if (p.isCancel(prefsRaw)) process.exit(0);
  const preferences = (prefsRaw || "").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    role,
    domain,
    expertise,
    workingStyle,
    autonomy,
    reviewStrictness,
    securityStance: "standard",
    communication,
    preferences
  };
}
function profileToMarkdown(profile) {
  const lines = [
    "## User profile",
    "",
    `- **Role:** ${profile.role}`,
    `- **Domain expertise:** ${profile.domain}`,
    `- **Strongest with:** ${profile.expertise.join(", ") || "not specified"}`,
    `- **Working style:** ${profile.workingStyle}`,
    `- **Autonomy preference:** ${profile.autonomy}`,
    `- **Review strictness:** ${profile.reviewStrictness}`,
    `- **Security stance:** ${profile.securityStance}`,
    `- **Communication:** ${profile.communication}`,
    "",
    "**Known preferences:**"
  ];
  if (profile.preferences.length > 0) {
    for (const pref of profile.preferences) {
      lines.push(`- ${pref}`);
    }
  } else {
    lines.push("- (none yet \u2014 will be filled as the agent learns your style)");
  }
  lines.push("");
  lines.push("**Learned over time** (agent appends here as it discovers patterns):");
  lines.push("- (empty \u2014 the agent will add entries as it works with you)");
  return lines.join("\n");
}
function saveProfile(targetDir, profile) {
  const profilePath = join2(targetDir, ".agents", "profile.json");
  writeFileSync(profilePath, JSON.stringify(profile, null, 2));
}
function loadProfile(targetDir) {
  const profilePath = join2(targetDir, ".agents", "profile.json");
  if (!existsSync2(profilePath)) return null;
  return JSON.parse(readFileSync2(profilePath, "utf-8"));
}
var profileCommand = new Command("profile").description("View or update your developer profile").option("--show", "Show current profile").option("--reset", "Re-run the profile questionnaire").action(async (options) => {
  const targetDir = process.cwd();
  if (options.show) {
    const profile2 = loadProfile(targetDir);
    if (!profile2) {
      p.log.warn("No profile found. Run `agentinit init` first.");
      return;
    }
    console.log(profileToMarkdown(profile2));
    return;
  }
  p.intro(chalk.bgCyan(" agentinit profile "));
  const profile = await collectProfile();
  saveProfile(targetDir, profile);
  p.log.success("Profile saved to .agents/profile.json");
  p.outro("Your AI agents will now adapt to your preferences.");
});

// src/utils/agent-selector.ts
import * as p2 from "@clack/prompts";
var AGENT_LABELS = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  codex: "Codex CLI (OpenAI)",
  copilot: "GitHub Copilot",
  "gemini-cli": "Gemini CLI",
  cline: "Cline",
  windsurf: "Windsurf",
  "roo-code": "Roo Code",
  "kilo-code": "Kilo Code",
  aider: "Aider",
  generic: "Generic / Other"
};
async function selectAgents() {
  const selected = await p2.multiselect({
    message: "Which AI coding agents do you use? (press space to select, enter to confirm)",
    options: Object.entries(AGENT_LABELS).map(([value, label]) => ({
      value,
      label
    })),
    required: true
  });
  if (p2.isCancel(selected)) process.exit(0);
  return selected;
}

// src/generators/prompt.ts
import { readFileSync as readFileSync4, existsSync as existsSync4 } from "fs";

// src/config.ts
var CDN_DEFAULTS = {
  baseUrl: "https://deopagentinit.blob.core.windows.net/agentinit",
  cacheDir: ".agentinit/cache",
  timeout: 1e4,
  retries: 2
};
function loadCdnConfig(overrides) {
  return {
    baseUrl: process.env["AGENTINIT_CDN_URL"] ?? overrides?.baseUrl ?? CDN_DEFAULTS.baseUrl,
    cacheDir: overrides?.cacheDir ?? CDN_DEFAULTS.cacheDir,
    timeout: overrides?.timeout ?? CDN_DEFAULTS.timeout,
    retries: overrides?.retries ?? CDN_DEFAULTS.retries,
    offline: overrides?.offline ?? process.env["AGENTINIT_OFFLINE"] === "1"
  };
}
function getCdnVersionUrl(config, version) {
  return `${config.baseUrl}/v${version}`;
}

// src/utils/cdn-fetcher.ts
import { existsSync as existsSync3, mkdirSync, readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from "fs";
import { join as join3 } from "path";
import { homedir } from "os";
import { createHash } from "crypto";
function getCacheDir(config, version) {
  return join3(homedir(), config.cacheDir, `v${version}`);
}
async function fetchWithRetry(url, config) {
  let lastError;
  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeout);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < config.retries) {
        await new Promise((r) => setTimeout(r, 1e3 * (attempt + 1)));
      }
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}
function verifySha256(content, expected) {
  const actual = createHash("sha256").update(content).digest("hex");
  return actual === expected;
}
async function fetchManifest(version, config) {
  const cacheDir = getCacheDir(config, version);
  const cachedManifest = join3(cacheDir, "manifest.json");
  if (config.offline) {
    if (existsSync3(cachedManifest)) {
      return JSON.parse(readFileSync3(cachedManifest, "utf-8"));
    }
    throw new Error(`Offline mode: no cached manifest for v${version}`);
  }
  const baseUrl = getCdnVersionUrl(config, version);
  const url = `${baseUrl}/manifest.json`;
  try {
    const text2 = await fetchWithRetry(url, config);
    const manifest = JSON.parse(text2);
    if (!existsSync3(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync2(cachedManifest, text2, "utf-8");
    return manifest;
  } catch (error) {
    if (existsSync3(cachedManifest)) {
      return JSON.parse(readFileSync3(cachedManifest, "utf-8"));
    }
    throw error;
  }
}
async function fetchSection(sectionId, version, config, manifest) {
  const resolved = manifest ?? await fetchManifest(version, config);
  const meta = resolved.sections.find((s) => s.id === sectionId);
  if (!meta) {
    throw new Error(`Section "${sectionId}" not found in manifest v${version}`);
  }
  const cacheDir = getCacheDir(config, version);
  const cachedFile = join3(cacheDir, meta.path);
  if (existsSync3(cachedFile)) {
    const cached = readFileSync3(cachedFile, "utf-8");
    if (verifySha256(cached, meta.sha256)) {
      return cached;
    }
  }
  if (config.offline) {
    if (existsSync3(cachedFile)) {
      return readFileSync3(cachedFile, "utf-8");
    }
    throw new Error(`Offline mode: section "${sectionId}" not cached for v${version}`);
  }
  const baseUrl = getCdnVersionUrl(config, version);
  const url = `${baseUrl}/${meta.path}`;
  const content = await fetchWithRetry(url, config);
  if (!verifySha256(content, meta.sha256)) {
    throw new Error(`Integrity check failed for section "${sectionId}" \u2014 hash mismatch`);
  }
  const cacheSubDir = join3(cacheDir, ...meta.path.split("/").slice(0, -1));
  if (!existsSync3(cacheSubDir)) mkdirSync(cacheSubDir, { recursive: true });
  writeFileSync2(cachedFile, content, "utf-8");
  return content;
}
async function fetchAgentAndUniversal(agentId, version, config) {
  const manifest = await fetchManifest(version, config);
  const agentSectionMap = {
    "claude-code": "claude-code",
    cursor: "cursor",
    codex: "codex-cli",
    copilot: "github-copilot",
    "gemini-cli": "gemini-cli",
    cline: "cline",
    windsurf: "windsurf",
    "roo-code": "roo-code",
    "kilo-code": "kilo-code",
    aider: "aider",
    generic: "generic"
  };
  const sectionId = agentSectionMap[agentId] ?? agentId;
  const [agentSection, universalSection] = await Promise.all([
    fetchSection(sectionId, version, config, manifest),
    fetchSection("universal-files", version, config, manifest)
  ]);
  return { agentSection, universalSection, manifest };
}

// src/generators/prompt.ts
async function generatePrompt(options) {
  const { agent, profile, analysis } = options;
  const sections = [];
  sections.push(buildHeader(agent, analysis));
  sections.push(profileToMarkdown(profile));
  const { agentSection, universalBlocks } = await resolveContent(options);
  if (agentSection) {
    sections.push(agentSection);
  }
  sections.push(universalBlocks);
  sections.push(buildAnalysisSummary(analysis));
  return sections.join("\n\n---\n\n");
}
async function resolveContent(options) {
  const { specPath, agent } = options;
  if (specPath && existsSync4(specPath)) {
    const spec = readFileSync4(specPath, "utf-8");
    const lines = spec.split("\n");
    return {
      agentSection: extractAgentSection(lines, agent),
      universalBlocks: extractUniversalBlocks(lines)
    };
  }
  const cdnConfig = loadCdnConfig({
    ...options.cdnConfig,
    offline: options.offline ?? options.cdnConfig?.offline
  });
  const version = getCliVersion();
  try {
    const result = await fetchAgentAndUniversal(agent, version, cdnConfig);
    return {
      agentSection: result.agentSection,
      universalBlocks: result.universalSection
    };
  } catch (error) {
    const fallbackPaths = [
      "agentic-system-initializer.md",
      "../agentic-system-initializer.md"
    ];
    for (const p9 of fallbackPaths) {
      if (existsSync4(p9)) {
        const spec = readFileSync4(p9, "utf-8");
        const lines = spec.split("\n");
        return {
          agentSection: extractAgentSection(lines, agent),
          universalBlocks: extractUniversalBlocks(lines)
        };
      }
    }
    throw new Error(
      `Could not fetch sections from CDN and no local spec file found. Use --spec to provide a local file, or check your network. (${error instanceof Error ? error.message : error})`
    );
  }
}
function getCliVersion() {
  try {
    const pkg = JSON.parse(readFileSync4(new URL("../../package.json", import.meta.url), "utf-8"));
    return pkg.version;
  } catch {
    return "0.1.0";
  }
}
function buildHeader(agent, analysis) {
  return [
    "# Agentic System Initialization \u2014 CUSTOMIZE EXISTING FILES",
    "",
    `> Generated by \`agentinit\` for **${agent}**`,
    `> Project: ${analysis.name}`,
    `> Stack: ${[...analysis.languages, ...analysis.frameworks].join(", ") || "unknown"}`,
    "",
    "## YOUR JOB",
    "",
    "The scaffolder has already created files, installed skills, and dropped specialist sub-agent stubs based on the detected stack. **Your job is to fill them in with project-specific content \u2014 NOT to recreate them.**",
    "",
    "## HARD REQUIREMENTS (every item must be done)",
    "",
    "1. **Customize `CLAUDE.md`** end-to-end:",
    "   - Replace every `{{placeholder}}` with project-specific content discovered from the codebase.",
    "   - Replace every `<placeholder>` (e.g., `<name>`, `<cmd>`, `<pkg>`, `<your-...>`) \u2014 these are TEMPLATE SLOTS, not HTML.",
    "   - Add a **Gotchas** section with at least 3 project-specific quirks found in the code (build steps, environment requirements, non-obvious conventions).",
    "   - Add a **Key paths** section listing the 5-10 most important directories/files.",
    "",
    "2. **Customize specialist sub-agent stubs.** Phase 1 created stubs in `.claude/agents/` for the relevant specialists (frontend, api, database, devops, qa \u2014 whichever applied to this stack).",
    "   - Open each one. Find the `## Stack notes (Phase 2: customize this section)` block.",
    "   - Replace EVERY `<!-- ... -->` line with concrete project specifics (real framework versions, real file paths, real conventions from the code).",
    "   - **Do NOT create new specialist files unless a domain exists in the code that Phase 1 missed** (e.g., `mobile.md` if there's a React Native target).",
    "",
    "3. **Seed `decisions.md`** (in `.agents/memory/decisions.md` and, for claude-code, also `.claude/memory/decisions.md`) with **at least 5 entries** for non-obvious decisions you observed in the codebase. One-line entries are fine. Format: `## YYYY-MM-DD \u2014 <title>` then `Context:` and `Decision:` lines.",
    "",
    "4. **No leftover placeholders.** When you finish, no file you touched contains `{{...}}`, `<your-...>`, `<TODO>`, or unfilled angle-bracket slots.",
    "",
    "5. **Discover and install ADDITIONAL skills** (only if relevant ones aren't already installed). Phase 1 installed a curated set; you may add more via `npx skills find <topic>` then `npx skills add <repo> --skill <name>" + (agent === "copilot" ? " -a github-copilot" : agent === "claude-code" ? " -a claude-code" : "") + " -y`. Don't duplicate what's already installed.",
    "",
    "### \u2705 Already done by Phase 1 \u2014 DO NOT recreate, only EDIT",
    "- `CLAUDE.md` (template with placeholders \u2014 fill them in)",
    "- `AGENTS.md`",
    "- `how-to-use-skills.sh`",
    "- `.agents/memory/decisions.md` (seeded \u2014 append to it)",
    "- `.agents/profile.json`",
    "- `.agents/rules/builtin/` (compiled rules for all agents)",
    "- Stack-driven skills installed via `npx skills add` (typescript / react / nextjs / prisma / etc. depending on stack)",
    agent === "claude-code" ? [
      "- `.claude/settings.json`, `.claude/mcp.json`",
      "- `.claude/agents/researcher.md`, `implementer.md`, `reviewer.md` (core 3 \u2014 do not edit)",
      "- `.claude/agents/<specialist>.md` for stack-relevant specialists (frontend/api/database/devops/qa) \u2014 **EDIT these to fill in Stack notes**",
      "- `.claude/skills/` (8 hand-written skills \u2014 do not modify)",
      "- `.claude/commands/boot.md`",
      "- `.claude/memory/decisions.md` (seeded \u2014 append to it)"
    ].join("\n") : "",
    "",
    agent === "claude-code" ? [
      "### \u26A0\uFE0F CRITICAL: `.claude/` write restriction",
      "",
      "Claude Code's sandbox **blocks all writes** to `.claude/` paths. To MODIFY any file in `.claude/`, write the updated version to the staging directory instead:",
      "",
      "**`.claude/X` \u2192 `.agents/staging/claude-config/X`**",
      "",
      "Example: to edit `.claude/agents/frontend.md`, write the new content to `.agents/staging/claude-config/agents/frontend.md`.",
      "",
      "The scaffolder copies all staged files to `.claude/` after you finish. **Direct writes to `.claude/` will fail.**",
      "",
      "**To READ from `.claude/` is fine** \u2014 only writes are blocked."
    ].join("\n") : "",
    "",
    "## EXECUTION RULES",
    "",
    "- Do NOT ask what to do. Do NOT present options. Execute every Hard Requirement in order.",
    "- Do NOT create files Phase 1 already created.",
    "- Do NOT leave `<your-...>`, `{{...}}`, or `<!-- TODO -->` markers behind.",
    "- When in doubt about a fact, read the actual code/config and verify.",
    "- When you finish, summarize: which files you edited, how many placeholders you filled, and which decisions you logged.",
    "",
    "---",
    "",
    "Below is your context: user profile, agent-specific instructions, canonical content blocks, and project analysis."
  ].join("\n");
}
function extractAgentSection(lines, agent) {
  const headerMap = {
    "claude-code": "Claude Code",
    cursor: "Cursor",
    codex: "Codex CLI",
    copilot: "GitHub Copilot",
    "gemini-cli": "Gemini CLI",
    cline: "Cline",
    windsurf: "Windsurf",
    "roo-code": "Roo Code",
    "kilo-code": "Kilo Code",
    aider: "Aider",
    generic: "Generic / Agent-Agnostic"
  };
  const targetHeader = headerMap[agent];
  if (!targetHeader) return null;
  let startIdx = -1;
  let endIdx = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ") && line.toLowerCase().includes(targetHeader.toLowerCase())) {
      startIdx = i;
      continue;
    }
    if (startIdx >= 0 && i > startIdx && line.startsWith("## ")) {
      endIdx = i;
      break;
    }
  }
  if (startIdx < 0) return null;
  return lines.slice(startIdx, endIdx).join("\n");
}
function extractUniversalBlocks(lines) {
  let startIdx = -1;
  let endIdx = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^#+\s+Universal/i) || line.match(/^#+.*Canonical.*Content.*Blocks/i) || line.match(/^#+.*Block\s+A\.0/i)) {
      if (startIdx < 0) startIdx = i;
    }
    if (startIdx >= 0 && i > startIdx + 10) {
      if (line.match(/^#\s+/) && !line.match(/block|canonical|universal/i)) {
        endIdx = i;
        break;
      }
    }
  }
  if (startIdx < 0) {
    const blockLines = [];
    let inBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^#+\s+Block\s+A\.\d+/i)) {
        inBlock = true;
      } else if (inBlock && line.match(/^#(?!#)/) && !line.match(/block/i)) {
        inBlock = false;
      }
      if (inBlock) blockLines.push(line);
    }
    return blockLines.join("\n");
  }
  return lines.slice(startIdx, endIdx).join("\n");
}
function buildAnalysisSummary(analysis) {
  const lines = [
    "## Project Analysis (auto-detected)",
    "",
    `- **Languages:** ${analysis.languages.join(", ") || "not detected"}`,
    `- **Frameworks:** ${analysis.frameworks.join(", ") || "none detected"}`,
    `- **Package manager:** ${analysis.packageManager}`,
    `- **Test framework:** ${analysis.testFramework.join(", ") || "none detected"}`,
    `- **CI/CD:** ${analysis.ci.join(", ") || "none detected"}`,
    `- **Deploy target:** ${analysis.deployTarget.join(", ") || "not detected"}`,
    `- **Docker:** ${analysis.hasDocker ? "yes" : "no"}`,
    `- **Database:** ${analysis.hasDatabase ? "yes" : "no"}`,
    `- **Monorepo:** ${analysis.monorepo ? "yes" : "no"}`,
    "",
    "Use this analysis to inform your initialization decisions."
  ];
  return lines.join("\n");
}

// src/utils/dispatch.ts
import { execSync, spawn } from "child_process";
import { writeFileSync as writeFileSync3, mkdirSync as mkdirSync2, existsSync as existsSync5, readFileSync as readFileSync5 } from "fs";
import { join as join4 } from "path";
import * as p3 from "@clack/prompts";
import chalk2 from "chalk";
var DISPATCH_MAP = {
  "claude-code": {
    command: "claude",
    args: (_promptFile, _cwd) => ["-p", "--verbose", "--permission-mode", "acceptEdits"],
    useStdinPipe: true,
    // pipe prompt via stdin for streaming
    needsFile: true,
    checkBinary: "claude"
  },
  codex: {
    command: "codex",
    args: (promptFile, _cwd) => ["--prompt-file", promptFile, "--full-auto"],
    useStdinPipe: false,
    needsFile: true,
    checkBinary: "codex"
  },
  "gemini-cli": {
    command: "gemini",
    args: (_promptFile, _cwd) => [],
    useStdinPipe: true,
    needsFile: true,
    checkBinary: "gemini"
  },
  aider: {
    command: "aider",
    args: (promptFile, _cwd) => ["--message-file", promptFile, "--yes-always"],
    useStdinPipe: false,
    needsFile: true,
    checkBinary: "aider"
  },
  copilot: {
    command: "copilot",
    args: (promptFile, _cwd) => ["-p", readFileSync5(promptFile, "utf-8"), "--allow-all"],
    useStdinPipe: false,
    needsFile: true,
    checkBinary: "copilot"
  }
};
var IDE_AGENTS = ["cursor", "windsurf", "roo-code", "kilo-code", "cline"];
function canDispatch(agent) {
  return agent in DISPATCH_MAP;
}
function isIdeAgent(agent) {
  return IDE_AGENTS.includes(agent);
}
function isBinaryAvailable(binary) {
  try {
    execSync(`which ${binary}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
async function dispatchToAgent(agent, prompt, cwd) {
  const config = DISPATCH_MAP[agent];
  if (!config) {
    return writePromptFile(agent, prompt, cwd);
  }
  if (!isBinaryAvailable(config.checkBinary)) {
    p3.log.warn(
      `${config.checkBinary} not found in PATH. Falling back to file output.`
    );
    return writePromptFile(agent, prompt, cwd);
  }
  const confirm3 = await p3.confirm({
    message: `Ready to send prompt to ${chalk2.bold(agent)} via \`${config.command}\`. Proceed?`
  });
  if (p3.isCancel(confirm3) || !confirm3) {
    return writePromptFile(agent, prompt, cwd);
  }
  const promptFile = writePromptToTempFile(prompt, cwd);
  const args = config.args(promptFile, cwd);
  if (config.useStdinPipe) {
    p3.log.info(`Running: ${config.command} ${args.join(" ")} < ${promptFile}`);
  } else {
    p3.log.info(`Running: ${config.command} ${args.join(" ").length > 200 ? args[0] + " ..." : args.join(" ")}`);
  }
  p3.log.info(chalk2.dim("Agent output will appear below. This may take a while...\n"));
  return new Promise((resolve3) => {
    const child = spawn(config.command, args, {
      cwd,
      stdio: config.useStdinPipe ? ["pipe", "inherit", "inherit"] : ["inherit", "inherit", "inherit"],
      env: { ...process.env }
    });
    if (config.useStdinPipe && child.stdin) {
      const promptContent = readFileSync5(promptFile, "utf-8");
      child.stdin.write(promptContent);
      child.stdin.end();
    }
    child.on("close", (code) => {
      if (code === 0) {
        resolve3({
          success: true,
          method: "cli",
          message: `${agent} completed successfully`
        });
      } else {
        resolve3({
          success: false,
          method: "cli",
          message: `${agent} exited with code ${code}`
        });
      }
    });
    child.on("error", (err) => {
      resolve3({
        success: false,
        method: "cli",
        message: `Failed to launch ${config.command}: ${err.message}`
      });
    });
  });
}
function writePromptToTempFile(prompt, cwd) {
  const dir = join4(cwd, ".agents", ".tmp");
  if (!existsSync5(dir)) mkdirSync2(dir, { recursive: true });
  const filePath = join4(dir, "init-prompt.md");
  writeFileSync3(filePath, prompt);
  return filePath;
}
function writePromptFile(agent, prompt, cwd) {
  const dir = join4(cwd, ".agents", ".tmp");
  if (!existsSync5(dir)) mkdirSync2(dir, { recursive: true });
  const filePath = join4(dir, `${agent}-init-prompt.md`);
  writeFileSync3(filePath, prompt);
  return {
    success: true,
    method: "file",
    message: `Prompt written to ${filePath}. Feed this file to your agent manually.`
  };
}
function getDispatchInstructions(agent, promptFile) {
  const config = DISPATCH_MAP[agent];
  if (config) {
    const args = config.args(promptFile, ".");
    return `${config.command} ${args.join(" ")}`;
  }
  switch (agent) {
    case "cursor":
      return `Open Cursor \u2192 Cmd+I \u2192 paste or reference ${promptFile}`;
    case "windsurf":
      return `Open Windsurf \u2192 Cascade \u2192 reference ${promptFile}`;
    case "cline":
      return `Open VS Code \u2192 Cline sidebar \u2192 paste from ${promptFile}`;
    case "roo-code":
      return `Open VS Code \u2192 Roo Code \u2192 paste from ${promptFile}`;
    case "kilo-code":
      return `Open VS Code \u2192 Kilo Code \u2192 paste from ${promptFile}`;
    default:
      return `Feed ${promptFile} to your agent`;
  }
}

// src/generators/scaffold.ts
import { existsSync as existsSync7, mkdirSync as mkdirSync3, writeFileSync as writeFileSync4, readdirSync, statSync, copyFileSync, rmSync, rmdirSync } from "fs";
import { join as join6, dirname as dirname2 } from "path";

// src/utils/template-engine.ts
import { readFileSync as readFileSync6, existsSync as existsSync6 } from "fs";
import { join as join5, dirname } from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
function getTemplatesDir() {
  const srcTemplates = join5(__dirname, "..", "templates");
  if (existsSync6(srcTemplates)) return srcTemplates;
  const pkgTemplates = join5(__dirname, "..", "src", "templates");
  if (existsSync6(pkgTemplates)) return pkgTemplates;
  return join5(process.cwd(), "node_modules", "@deopca", "agentinit", "templates");
}
function loadTemplate(category, name) {
  const dir = getTemplatesDir();
  const filePath = join5(dir, category, name);
  if (existsSync6(filePath)) {
    return readFileSync6(filePath, "utf-8");
  }
  for (const ext of [".md", ".mdc"]) {
    const withExt = join5(dir, category, name + ext);
    if (existsSync6(withExt)) return readFileSync6(withExt, "utf-8");
  }
  return null;
}
function fillTemplate(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}
function buildTemplateVars(profile, analysis) {
  return {
    profile: profileToMarkdown(profile),
    role: profile.role,
    domain: profile.domain,
    expertise: profile.expertise.join(", ") || "not specified",
    workingStyle: profile.workingStyle,
    autonomy: profile.autonomy,
    reviewStrictness: profile.reviewStrictness,
    securityStance: profile.securityStance,
    communication: profile.communication,
    preferences: profile.preferences.length > 0 ? profile.preferences.map((p9) => `- ${p9}`).join("\n") : "- (none yet)",
    projectName: analysis.name,
    languages: analysis.languages.join(", ") || "unknown",
    frameworks: analysis.frameworks.join(", ") || "standard tooling",
    packageManager: analysis.packageManager,
    monorepo: analysis.monorepo ? "yes" : "no",
    testFramework: analysis.testFramework.join(", ") || "TBD",
    testCommand: guessTestCommand(analysis),
    lintCommand: guessLintCommand(analysis),
    ciPlatform: analysis.ci.join(", ") || "none",
    deployTarget: analysis.deployTarget.join(", ") || "TBD",
    lockFile: guessLockFile(analysis),
    // Placeholders for user-filled content
    description: "{{description}}",
    architectureNotes: "{{architectureNotes}}",
    languageVersions: "{{languageVersions}}",
    keyDependencies: "{{keyDependencies}}",
    formatter: "{{formatter}}",
    linter: "{{linter}}",
    namingConventions: "{{namingConventions}}",
    architecturePattern: "{{architecturePattern}}",
    directoryStructure: "{{directoryStructure}}",
    boundaries: "{{boundaries}}",
    codingStandard1: "{{codingStandard1}}",
    codingStandard2: "{{codingStandard2}}",
    codingStandard3: "{{codingStandard3}}",
    errorHandlingPattern: "{{errorHandlingPattern}}",
    loggingPattern: "{{loggingPattern}}",
    testStructure: "{{testStructure}}",
    coverageTarget: "{{coverageTarget}}",
    dispatchSignals: analysis.signals.map((s) => `- ${s}`).join("\n") || "- (auto-detected)",
    branchStrategy: "{{branchStrategy}}",
    commitStyle: "{{commitStyle}}",
    prProcess: "{{prProcess}}",
    commitFormat: "type(scope): description",
    deployCommand: "{{deployCommand}}",
    pipelineStages: "{{pipelineStages}}",
    envVarsNote: "{{envVarsNote}}",
    additionalSecurityRules: "{{additionalSecurityRules}}",
    documentationStyle: "{{documentationStyle}}",
    performanceAreas: "{{performanceAreas}}",
    domainContext: "{{domainContext}}",
    knownIssues: "{{knownIssues}}",
    upcomingWork: "{{upcomingWork}}"
  };
}
function guessTestCommand(analysis) {
  if (analysis.testFramework.includes("Vitest")) return `${analysis.packageManager} run test`;
  if (analysis.testFramework.includes("Jest")) return `${analysis.packageManager} run test`;
  if (analysis.testFramework.includes("pytest")) return "pytest";
  if (analysis.packageManager === "cargo") return "cargo test";
  if (analysis.packageManager === "go") return "go test ./...";
  return `${analysis.packageManager !== "unknown" ? analysis.packageManager : "npm"} run test`;
}
function guessLintCommand(analysis) {
  if (["npm", "yarn", "pnpm", "bun"].includes(analysis.packageManager)) {
    return `${analysis.packageManager} run lint`;
  }
  if (analysis.packageManager === "cargo") return "cargo clippy";
  if (analysis.packageManager === "go") return "golangci-lint run";
  return "npm run lint";
}
function guessLockFile(analysis) {
  const map = {
    npm: "package-lock.json",
    yarn: "yarn.lock",
    pnpm: "pnpm-lock.yaml",
    bun: "bun.lockb",
    pip: "requirements.txt",
    poetry: "poetry.lock",
    cargo: "Cargo.lock",
    go: "go.sum"
  };
  return map[analysis.packageManager] || "unknown";
}

// src/generators/scaffold.ts
function writeScaffold(options) {
  const { targetDir, agents, profile, analysis, overwrite = false } = options;
  const result = { created: [], skipped: [], errors: [] };
  const vars = buildTemplateVars(profile, analysis);
  ensureDir(join6(targetDir, ".agents", "memory"));
  ensureDir(join6(targetDir, ".agents", "instructions"));
  writeIfMissing(
    join6(targetDir, ".agents", "profile.json"),
    JSON.stringify(profile, null, 2),
    result,
    overwrite
  );
  const decisionsContent = buildDecisionsMd(analysis);
  writeIfMissing(
    join6(targetDir, ".agents", "memory", "decisions.md"),
    decisionsContent,
    result,
    overwrite
  );
  const sharedInstructions = buildSharedInstructions(profile, analysis);
  writeIfMissing(
    join6(targetDir, ".agents", "instructions", "shared.md"),
    sharedInstructions,
    result,
    overwrite
  );
  writeIfMissing(
    join6(targetDir, "AGENTS.md"),
    buildAgentsMd(agents, analysis),
    result,
    overwrite
  );
  for (const agent of agents) {
    try {
      scaffoldAgent(targetDir, agent, vars, result, overwrite);
    } catch (err) {
      result.errors.push(`Failed to scaffold ${agent}: ${err}`);
    }
  }
  return result;
}
var AGENT_FILE_MAP = {
  "claude-code": { path: "CLAUDE.md", templateName: "claude-code.md" },
  cursor: { path: ".cursor/rules/00-core.mdc", templateName: "cursor.mdc" },
  codex: { path: "AGENTS.md", templateName: "codex.md" },
  copilot: { path: ".github/copilot-instructions.md", templateName: "copilot.md" },
  "gemini-cli": { path: "GEMINI.md", templateName: "gemini-cli.md" },
  cline: { path: ".clinerules/00-core.md", templateName: "cline.md" },
  windsurf: { path: ".windsurf/rules/general.md", templateName: "windsurf.md" },
  "roo-code": { path: ".roo/rules/00-core.md", templateName: "roo-code.md" },
  "kilo-code": { path: ".kilocode/rules/00-core.md", templateName: "kilo-code.md" },
  aider: { path: ".aider/instructions.md", templateName: "generic.md" },
  generic: { path: ".agents/instructions/agent.md", templateName: "generic.md" }
};
function scaffoldAgent(targetDir, agent, vars, result, overwrite) {
  const mapping = AGENT_FILE_MAP[agent];
  if (!mapping) return;
  const template = loadTemplate("agents", mapping.templateName);
  if (!template) {
    const fallbackContent = [
      vars.profile,
      "",
      "## Project context",
      "",
      `This is a ${vars.languages} project using ${vars.frameworks}.`,
      "",
      "## Rules",
      "",
      "- Read .agents/memory/decisions.md before making architectural choices",
      "- Follow existing patterns in the codebase",
      "- Run tests before committing"
    ].join("\n");
    const filePath2 = join6(targetDir, mapping.path);
    writeIfMissing(filePath2, fallbackContent, result, overwrite);
    return;
  }
  const content = fillTemplate(template, vars);
  const filePath = join6(targetDir, mapping.path);
  writeIfMissing(filePath, content, result, overwrite);
}
function buildDecisionsMd(analysis) {
  return [
    "# Project Decisions",
    "",
    `> Initialized by agentinit | Stack: ${[...analysis.languages, ...analysis.frameworks].join(", ")}`,
    "",
    "## Architecture Decisions",
    "",
    "Record significant technical decisions here. All AI agents read this file.",
    "",
    "| Date | Decision | Rationale |",
    "|------|----------|-----------|",
    "| (auto) | Initial scaffold created | Project initialized with agentinit |",
    "",
    "## Conventions",
    "",
    "- (Add project-specific conventions here)",
    "",
    "## Boundaries",
    "",
    "- (Define what agents should NOT do)"
  ].join("\n");
}
function buildAgentsMd(agents, analysis) {
  const stack = [...analysis.languages, ...analysis.frameworks].join(", ") || "unknown";
  const agentLines = [];
  if (agents.includes("claude-code")) agentLines.push("- **Claude Code:** see `CLAUDE.md` and `.claude/`");
  if (agents.includes("copilot")) agentLines.push("- **GitHub Copilot:** see `.github/copilot-instructions.md` and `.github/instructions/`");
  if (agents.includes("cursor")) agentLines.push("- **Cursor:** see `.cursor/rules/`");
  if (agents.includes("gemini-cli")) agentLines.push("- **Gemini CLI:** see `GEMINI.md`");
  if (agents.includes("cline")) agentLines.push("- **Cline:** see `.clinerules/`");
  if (agents.includes("windsurf")) agentLines.push("- **Windsurf:** see `.windsurf/rules/`");
  if (agents.includes("roo-code")) agentLines.push("- **Roo Code:** see `.roo/rules/`");
  if (agents.includes("kilo-code")) agentLines.push("- **Kilo Code:** see `.kilocode/rules/`");
  return [
    "# AGENTS.md",
    "",
    `> Pointer file for AI coding agents working on **${analysis.name}**.`,
    `> Stack: ${stack}`,
    "",
    "## How agents should use this repo",
    "",
    "1. Read `.agents/instructions/shared.md` for user-profile + project-stack context.",
    "2. Read `.agents/memory/decisions.md` before architectural choices.",
    "3. Follow the rules in `.agents/rules/builtin/` (compiled per-agent variants live under each agent's directory).",
    "4. Match existing code patterns before introducing new ones.",
    "",
    "## Agent-specific entry points",
    "",
    ...agentLines.length > 0 ? agentLines : ["- (none configured)"],
    "",
    "## Shared resources",
    "",
    "- `how-to-use-skills.sh` \u2014 Skills CLI cheat-sheet",
    "- `.agents/profile.json` \u2014 user developer profile",
    "- `.agents/rules/builtin/` \u2014 source-of-truth for compiled rules",
    ""
  ].join("\n");
}
function buildSharedInstructions(profile, analysis) {
  return [
    "# Shared Agent Instructions",
    "",
    "This file is read by all AI agents working on this project.",
    "",
    profileToMarkdown(profile),
    "",
    "## Project Stack",
    "",
    `- Languages: ${analysis.languages.join(", ") || "TBD"}`,
    `- Frameworks: ${analysis.frameworks.join(", ") || "TBD"}`,
    `- Package manager: ${analysis.packageManager}`,
    `- Tests: ${analysis.testFramework.join(", ") || "TBD"}`,
    `- CI: ${analysis.ci.join(", ") || "none"}`,
    "",
    "## Shared Rules",
    "",
    "1. Read .agents/memory/decisions.md before architectural changes",
    "2. Follow existing code patterns",
    "3. Run tests before completing tasks",
    "4. Update decisions.md when making significant choices"
  ].join("\n");
}
function ensureDir(dir) {
  if (!existsSync7(dir)) {
    mkdirSync3(dir, { recursive: true });
  }
}
function writeIfMissing(filePath, content, result, overwrite) {
  ensureDir(dirname2(filePath));
  if (existsSync7(filePath) && !overwrite) {
    result.skipped.push(filePath);
    return;
  }
  try {
    writeFileSync4(filePath, content);
    result.created.push(filePath);
  } catch (err) {
    result.errors.push(`${filePath}: ${err}`);
  }
}
var CLAUDE_STAGING_DIR = ".agents/staging/claude-config";
function copyClaudeStagingToTarget(targetDir) {
  const result = { copied: [], errors: [] };
  const stagingDir = join6(targetDir, CLAUDE_STAGING_DIR);
  if (!existsSync7(stagingDir)) {
    return result;
  }
  const claudeDir = join6(targetDir, ".claude");
  ensureDir(claudeDir);
  copyDirRecursive(stagingDir, claudeDir, result);
  return result;
}
function copyDirRecursive(src, dest, result) {
  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join6(src, entry);
    const destPath = join6(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      ensureDir(destPath);
      copyDirRecursive(srcPath, destPath, result);
    } else {
      try {
        ensureDir(dirname2(destPath));
        copyFileSync(srcPath, destPath);
        result.copied.push(destPath);
      } catch (err) {
        result.errors.push(`${destPath}: ${err}`);
      }
    }
  }
}
function cleanupStaging(targetDir) {
  const stagingDir = join6(targetDir, CLAUDE_STAGING_DIR);
  if (existsSync7(stagingDir)) {
    rmSync(stagingDir, { recursive: true, force: true });
  }
  const parentStaging = join6(targetDir, ".agents", "staging");
  if (existsSync7(parentStaging)) {
    try {
      if (readdirSync(parentStaging).length === 0) {
        rmdirSync(parentStaging);
      }
    } catch {
    }
  }
}

// src/generators/claude-files.ts
import { existsSync as existsSync8, mkdirSync as mkdirSync4, writeFileSync as writeFileSync5, chmodSync, readFileSync as readFileSync7, appendFileSync } from "fs";
import { join as join7, dirname as dirname3 } from "path";
function ensureDir2(dir) {
  if (!existsSync8(dir)) mkdirSync4(dir, { recursive: true });
}
function writeIfNew(filePath, content, result) {
  ensureDir2(dirname3(filePath));
  if (existsSync8(filePath)) {
    result.skipped.push(filePath);
    return;
  }
  writeFileSync5(filePath, content);
  result.created.push(filePath);
}
function generateClaudeFiles(targetDir, profile, analysis) {
  const result = { created: [], skipped: [] };
  const claude = (p9) => join7(targetDir, ".claude", p9);
  const packageScripts = readPackageScripts(targetDir);
  writeIfNew(claude("settings.json"), buildSettingsJson(profile, analysis, packageScripts), result);
  writeIfNew(claude("mcp.json"), buildMcpJson(analysis), result);
  writeIfNew(claude("memory/decisions.md"), buildDecisionsMd2(profile, analysis), result);
  writeIfNew(claude("commands/boot.md"), BOOT_COMMAND, result);
  writeIfNew(claude("commands/verify.md"), buildVerifyCommand(analysis, packageScripts), result);
  writeIfNew(claude("commands/code-review.md"), CODE_REVIEW_COMMAND, result);
  writeIfNew(claude("commands/spec.md"), SPEC_COMMAND, result);
  writeIfNew(claude("plans/.gitkeep"), "", result);
  writeIfNew(claude("commands/ci.md"), CI_COMMAND, result);
  writeIfNew(claude("agents/researcher.md"), AGENT_RESEARCHER.replace(/<project-name>/g, analysis.name), result);
  writeIfNew(claude("agents/implementer.md"), AGENT_IMPLEMENTER.replace(/<project-name>/g, analysis.name), result);
  writeIfNew(claude("agents/reviewer.md"), AGENT_REVIEWER.replace(/<project-name>/g, analysis.name), result);
  writeIfNew(claude("agents/adversarial-reviewer.md"), AGENT_ADVERSARIAL_REVIEWER, result);
  const specialists = pickSpecialists(analysis);
  for (const spec of specialists) {
    writeIfNew(
      claude(`agents/${spec.slug}.md`),
      spec.content.replace(/<project-name>/g, analysis.name),
      result
    );
  }
  writeIfNew(claude("skills/context-hygiene/SKILL.md"), SKILL_CONTEXT_HYGIENE, result);
  writeIfNew(claude("skills/log-decision/SKILL.md"), SKILL_LOG_DECISION, result);
  writeIfNew(claude("skills/workflows/SKILL.md"), SKILL_WORKFLOWS, result);
  writeIfNew(claude("skills/commands/SKILL.md"), buildCommandsSkill(analysis), result);
  writeIfNew(claude("skills/conventions/SKILL.md"), SKILL_CONVENTIONS, result);
  writeIfNew(claude("skills/git-flow/SKILL.md"), buildGitFlowSkill(analysis), result);
  writeIfNew(claude("skills/error-recovery/SKILL.md"), SKILL_ERROR_RECOVERY, result);
  writeIfNew(claude("skills/pr-flow/SKILL.md"), SKILL_PR_FLOW, result);
  writeIfNew(join7(targetDir, "CLAUDE.local.md"), CLAUDE_LOCAL_STUB, result);
  return result;
}
var AGENTINIT_GITIGNORE_ENTRIES = [
  ".agents/.tmp/",
  ".agents/.cache/",
  ".claude/.cache/",
  ".claude/.tmp/",
  "CLAUDE.local.md",
  ".specify/.tmp/"
];
function ensureGitignoreEntries(targetDir, entries) {
  const path = join7(targetDir, ".gitignore");
  const existed = existsSync8(path);
  const current = existed ? readFileSync7(path, "utf-8") : "";
  const have = new Set(
    current.split("\n").map((l) => l.trim()).filter(Boolean)
  );
  const missing = entries.filter((e) => !have.has(e));
  if (missing.length === 0) return { added: 0, created: false };
  const needsLeadingNewline = existed && current.length > 0 && !current.endsWith("\n");
  const block = (needsLeadingNewline ? "\n" : "") + (existed && current.length > 0 ? "\n" : "") + "# agentinit-managed\n" + missing.join("\n") + "\n";
  if (existed) {
    appendFileSync(path, block);
  } else {
    writeFileSync5(path, block.replace(/^\n+/, ""));
  }
  return { added: missing.length, created: !existed };
}
function writeHowToUseSkills(targetDir) {
  const filePath = join7(targetDir, "how-to-use-skills.sh");
  if (existsSync8(filePath)) return false;
  writeFileSync5(filePath, HOW_TO_USE_SKILLS);
  try {
    chmodSync(filePath, 493);
  } catch {
  }
  return true;
}
function pickSpecialists(analysis) {
  const out = [];
  const isFrontend = analysis.frameworks.some(
    (f) => ["React", "Next.js", "Vue", "Nuxt", "Angular", "Svelte"].includes(f)
  );
  const isApi = analysis.frameworks.some(
    (f) => ["Express", "Fastify", "NestJS", "Hono", "Elysia", "FastAPI", "Django", "Flask"].includes(f)
  );
  const hasDb = analysis.hasDatabase || analysis.frameworks.some((f) => ["Prisma", "Drizzle", "TypeORM"].includes(f));
  const isDevops = analysis.hasDocker || analysis.hasTerraform || analysis.ci.length > 0;
  const hasTests = analysis.testFramework.length > 0;
  if (isFrontend) out.push({ slug: "frontend", content: AGENT_FRONTEND });
  if (isApi) out.push({ slug: "api", content: AGENT_API });
  if (hasDb) out.push({ slug: "database", content: AGENT_DATABASE });
  if (isDevops) out.push({ slug: "devops", content: AGENT_DEVOPS });
  if (hasTests) out.push({ slug: "qa", content: AGENT_QA });
  return out;
}
var AGENT_FRONTEND = `---
description: Frontend specialist \u2014 components, routing, state, styling, accessibility. Use for UI work in <project-name>. Customize the "Stack notes" section with project specifics before relying on it.
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
- Pure data-layer change with no UI surface \u2014 that's **database**.
- API route handler change with no client coupling \u2014 that's **api**.

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
var AGENT_API = `---
description: API specialist \u2014 route handlers, request validation, auth, error shape, versioning. Use for any server-side endpoint work in <project-name>. Customize the "Stack notes" section before relying on it.
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
- Pure DB schema change \u2014 route to **database** first.
- Frontend client-side fetch wrapper \u2014 route to **frontend**.

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
var AGENT_DATABASE = `---
description: Database specialist \u2014 schema, migrations, queries, indexes, data integrity. Use for any persistence change in <project-name>. Customize the "Stack notes" section before relying on it.
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
- Pure API response shaping with no schema change \u2014 route to **api**.
- Frontend table rendering \u2014 route to **frontend**.

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
2. **Backfill before NOT NULL.** Add column nullable \u2192 backfill \u2192 set NOT NULL in a separate step.
3. **Index intentionally.** Add an index when a query needs it; don't add "just in case".
4. **No destructive change without an explicit confirmation in the PR description.**
5. **Generated types are part of the change.** Run the generator and commit the output.
`;
var AGENT_DEVOPS = `---
description: DevOps specialist \u2014 Docker, CI/CD, infra-as-code, deploy pipelines, environment config. Use for any pipeline or infra change in <project-name>. Customize the "Stack notes" section before relying on it.
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
- App-code build issue \u2014 that's the app domain (frontend/api/database).

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
var AGENT_QA = `---
description: QA specialist \u2014 test strategy, test design, flaky-test triage, coverage decisions. Use for any non-trivial test work in <project-name>. Customize the "Stack notes" section before relying on it.
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
- "Add a unit test for X" \u2014 the **implementer** writes that as part of the change.

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
function buildSettingsJson(profile, analysis, scripts) {
  const deny = ["Bash(rm -rf:*)", "Bash(git push --force:*)"];
  if (profile.securityStance === "paranoid") {
    deny.push("Bash(git push --force-with-lease:*)", "Bash(chmod 777:*)");
  }
  const allow = buildAllowList(analysis);
  const hooks = buildHooks(analysis, scripts);
  return JSON.stringify({
    $schema: "https://json.schemastore.org/claude-code-settings.json",
    permissions: { allow, deny },
    ...hooks ? { hooks } : {}
  }, null, 2);
}
function buildHooks(analysis, scripts) {
  const stopCmds = [];
  const editCmds = [];
  const isNode = analysis.languages.some((l) => l === "TypeScript" || l === "JavaScript");
  if (isNode) {
    const pm = analysis.packageManager;
    const runner = pm === "pnpm" ? "pnpm run" : pm === "yarn" ? "yarn" : pm === "bun" ? "bun run" : "npm run";
    if (scripts.typecheck) stopCmds.push(`${runner} typecheck`);
    else if (scripts["type-check"]) stopCmds.push(`${runner} type-check`);
    if (scripts["lint:fix"]) editCmds.push(`${runner} lint:fix`);
    else if (scripts.lint) editCmds.push(`${runner} lint -- --fix`);
  }
  if (stopCmds.length === 0 && editCmds.length === 0) return void 0;
  const hooks = {};
  if (stopCmds.length > 0) {
    hooks.Stop = [
      { matcher: "", hooks: stopCmds.map((command) => ({ type: "command", command })) }
    ];
  }
  if (editCmds.length > 0) {
    hooks.PostToolUse = [
      { matcher: "Edit|Write|MultiEdit", hooks: editCmds.map((command) => ({ type: "command", command })) }
    ];
  }
  return hooks;
}
function buildAllowList(analysis) {
  const allow = [
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
    "mcp__git__*"
  ];
  if (hasFrontend(analysis)) {
    allow.push("mcp__playwright__*");
  }
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
      allow.push(
        "Bash(npm test:*)",
        "Bash(npm run test:*)",
        "Bash(npm run lint:*)",
        "Bash(npm run typecheck:*)",
        "Bash(npm run build:*)",
        "Bash(npx:*)"
      );
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
var FRONTEND_FRAMEWORKS = /* @__PURE__ */ new Set([
  "React",
  "Next.js",
  "Vue",
  "Nuxt",
  "Svelte",
  "Angular",
  "Tailwind CSS"
]);
function hasFrontend(analysis) {
  return analysis.frameworks.some((f) => FRONTEND_FRAMEWORKS.has(f));
}
function buildMcpJson(analysis) {
  const mcpServers = {
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    git: {
      command: "uvx",
      args: ["mcp-server-git"]
    }
  };
  if (hasFrontend(analysis)) {
    mcpServers.playwright = {
      command: "npx",
      args: ["-y", "@playwright/mcp@latest"]
    };
  }
  return JSON.stringify({ mcpServers }, null, 2);
}
function buildDecisionsMd2(profile, analysis) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const stack = [...analysis.languages, ...analysis.frameworks].join(", ") || "unknown";
  return `# Decisions Log

Append-only. Newest first.

Format:
\`\`\`
## YYYY-MM-DD \u2014 <title>
Context: <why>
Decision: <what>
\`\`\`

---

## ${today} \u2014 Scaffold initialized
Context: User invoked agentinit for Claude Code.
Decision: Installed hand-written skills (context-hygiene, log-decision, workflows, commands, conventions, git-flow, error-recovery, pr-flow); sub-agents researcher/implementer/reviewer; MCPs ${["filesystem", "git", hasFrontend(analysis) ? "playwright" : ""].filter(Boolean).join(" + ")}.
Stack: ${stack}
User profile: ${profile.role} / ${profile.domain} / autonomy=${profile.autonomy}
`;
}
function readPackageScripts(targetDir) {
  const pkgPath = join7(targetDir, "package.json");
  if (!existsSync8(pkgPath)) return {};
  try {
    const pkg = JSON.parse(readFileSync7(pkgPath, "utf-8"));
    const scripts = pkg.scripts;
    return scripts && typeof scripts === "object" ? scripts : {};
  } catch {
    return {};
  }
}
function buildVerifyCommand(analysis, scripts) {
  const pm = analysis.packageManager;
  const run = (script) => {
    if (pm === "pnpm") return `pnpm run ${script}`;
    if (pm === "yarn") return `yarn ${script}`;
    if (pm === "bun") return `bun run ${script}`;
    return `npm run ${script}`;
  };
  const directTest = pm === "pnpm" ? "pnpm test" : pm === "yarn" ? "yarn test" : pm === "bun" ? "bun test" : "npm test";
  const steps = [];
  if (scripts.typecheck) steps.push({ name: "typecheck", cmd: run("typecheck") });
  else if (scripts["type-check"]) steps.push({ name: "typecheck", cmd: run("type-check") });
  if (scripts.lint) steps.push({ name: "lint", cmd: run("lint") });
  if (scripts.test) steps.push({ name: "test", cmd: directTest });
  if (scripts.build) steps.push({ name: "build", cmd: run("build") });
  const fallback = steps.length === 0;
  if (fallback) {
    steps.push({ name: "test (fallback)", cmd: directTest });
  }
  const stepBlock = steps.map((s, i) => `${i + 1}. **${s.name}** \u2014 \`${s.cmd}\``).join("\n");
  return `# /verify

Run the project's verify loop in order. Stop at the first failure and report
which step failed, with the relevant output, before doing anything else.

${stepBlock}

## Rules

- Run them sequentially, not in parallel \u2014 later steps assume earlier ones passed.
- If a step fails, do NOT proceed. Report the failing command, copy the error,
  and ask the user how to handle it (don't auto-skip with \`--no-verify\` or by
  editing the failing test out).
- This command is the "definition of done" for any change before commit/push.
  Whenever the user says "verify" or "are we good to commit?", run this.
${fallback ? `
- No verify scripts were detected at scaffold time. Run \`agentinit init\`
  again after you've added \`scripts.typecheck\`/\`scripts.lint\` to \`package.json\`
  so this command reflects what your project actually has.
` : ""}`;
}
var CODE_REVIEW_COMMAND = `# /code-review

Review the current uncommitted diff in a **fresh sub-agent context**. The
reviewer must not see this conversation's reasoning \u2014 only the diff and the
criteria below.

## What to run

1. Use the \`code-review\` skill bundled with Claude Code if it's available
   (\`/skill code-review\` from the command palette).
2. Otherwise, spawn a sub-agent with this brief:

   > Read the output of \`git diff\` (staged and unstaged). Do not read the
   > conversation history. Report findings as a numbered list of
   > \`file:line \u2014 issue \u2014 suggested fix\`. Cover only:
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
- Lint/format issues are not the reviewer's job \u2014 the PostToolUse hook handles
  those during editing.
`;
function buildCommandsSkill(analysis) {
  const pm = analysis.packageManager;
  const install = pm === "yarn" ? "yarn install" : pm === "pnpm" ? "pnpm install" : "npm install";
  const dev = pm === "yarn" ? "yarn dev" : pm === "pnpm" ? "pnpm dev" : "npm run dev";
  const test = analysis.testFramework.length > 0 ? pm === "yarn" ? "yarn test" : pm === "pnpm" ? "pnpm test" : "npm test" : "<not configured>";
  const lint = pm === "yarn" ? "yarn lint" : pm === "pnpm" ? "pnpm lint" : "npm run lint";
  return `---
description: Reference for project-specific commands \u2014 install, dev, test, lint, format, type-check, build, migrations. Load when running any non-trivial command or composing pre-commit/pre-push rituals.
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

## External CLIs

\`gh\`, \`aws\`, \`gcloud\`, and \`sentry-cli\` are the most context-efficient way to talk to external services and their read-only forms (\`gh pr view\`, \`gh issue list\`, etc.) are allow-listed in \`.claude/settings.json\` so they don't trigger approval prompts. Prefer them over scripting the underlying HTTP APIs.
`;
}
function buildGitFlowSkill(_analysis) {
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
  - Subject \u2264 72 chars.
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

## Parallel work

For features you want to develop alongside another in-progress branch, use a git worktree so each Claude Code session has its own checkout and the edits don't collide:

\`\`\`bash
git worktree add ../<project>-<branch> <branch>
\`\`\`

Each worktree is a full checkout sharing the same \`.git\` dir \u2014 open Claude Code in either directory and they can run in parallel.
`;
}
var HOW_TO_USE_SKILLS = `#!/usr/bin/env bash
# how-to-use-skills.sh \u2014 Quick reference for the Skills CLI
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
var SKILL_CONTEXT_HYGIENE = `---
description: Keep the context window lean during long sessions \u2014 rules for searching narrowly, summarizing tool output, delegating to sub-agents, and knowing when to start fresh.
---
# context-hygiene

Use when a session has gone long, you're rereading files, or the user complains about lost context.

## Core rules
1. **Read narrowly.** Use line ranges. Never dump a 2000-line file when 30 lines will do.
2. **Search before reading.** grep with line numbers, then read the range.
3. **Summarize tool output.** Pipe through head/tail/wc/grep. Don't paste 500 lines back.
4. **Don't reread.** If a file is already in context this session, reference it; don't view again.
5. **Delegate noisy work.** Research and exhaustive search go to \`.claude/agents/researcher.md\`.
6. **Externalize state.** Long-lived facts \u2192 \`.claude/memory/decisions.md\`. Current plan \u2192 TODO.

## When to start fresh
- Task changed and old context is stale.
- More time managing the conversation than doing work.
- Hitting platform limits.

Before starting fresh, make sure decisions are written. Boot the new session via \`/boot\`.
`;
var SKILL_LOG_DECISION = `---
description: Append a structured entry to .claude/memory/decisions.md so future sessions know about non-obvious choices, user corrections, and pitfalls to avoid.
---
# log-decision

Use after: making a non-obvious architectural choice; a user override of your default; discovering a pitfall worth recording.

## Format
Append to the top of \`.claude/memory/decisions.md\`:

\`\`\`
## YYYY-MM-DD \u2014 <short title>
Context: <1\u20132 sentences>
Decision: <what we chose>
Trade-offs: <what we gave up> (optional)
\`\`\`

For lighter entries (preferences, conventions), one line is fine:
\`YYYY-MM-DD \u2014 <observation>.\`

Keep it terse. The point is to save the next session's tokens, not to write essays.
`;
var SKILL_WORKFLOWS = `---
description: Step-by-step workflows for feature work, bug fixes, refactors, debug sessions, and spikes \u2014 load when starting any new development task so the right sequence is followed.
---
# workflows

Pick the workflow that matches the work. If unsure which, ask the user before starting.

## Feature work (non-trivial)

1. **Spec.** Draft a short spec (problem, goals, non-goals, design sketch, acceptance criteria) for anything spanning >1 file or with unclear requirements. Use \`/speckit.specify\` if Spec-Kit is installed.
2. **Plan.** List files you'll touch and the order. If >5 files, get the plan reviewed first. Plans live in \`.claude/plans/<slug>.md\` so \`adversarial-reviewer\` can read them when grading the final diff.
3. **Implement in slices.** One logical change + smallest verifying test per slice. Don't pile slices.
4. **Test between slices** for affected files, not just at the end.
5. **Self-review the diff.** Look for debug prints, commented-out code, untested branches, unrelated changes.
6. **Verify and code-review.** Run \`/verify\` (typecheck \u2192 lint \u2192 test \u2192 build) and then \`/code-review\` (fresh sub-agent reviews the diff). Fix what they surface before the PR.
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

## Extending your toolkit mid-task

If a task hits a gap (no skill for X, no agent for Y), run \`/plugin\` and search the marketplace before writing one from scratch. Many common gaps already have community skills, hooks, or sub-agents you can install in one click.
`;
var SKILL_CONVENTIONS = `---
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
- **Order:** stdlib \u2192 third-party \u2192 local
- **Side-effect imports:** only in entry points

## Exports
- **Style:** named exports preferred
- **Public API:** export only what consumers need; keep helpers module-local.

## Tests
- **Placement:** colocated or mirror tree \u2014 match existing repo pattern
- **Pattern:** arrange/act/assert

## Errors
- **Boundary validation:** validate at boundaries (HTTP handlers, CLI args, file reads); trust internal code.

## Function and file size
- Functions over ~50 lines are doing too much \u2014 split.
- Files over ~300 lines are doing too much \u2014 split by concern.
- Exception: generated files, schema files.
`;
var SKILL_ERROR_RECOVERY = `---
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

- Pre-existing failure unrelated to your change \u2192 tell the user, ask whether to fix or ignore.
- Destructive recovery would be required \u2192 confirm first.
- You don't recognize the state of the working tree \u2192 stop, summarize, ask.
`;
var SKILL_PR_FLOW = `---
description: How to prepare a pull request \u2014 title style, body sections, screenshots, self-review checklist. Load when about to open or review a PR.
---
# pr-flow

## Preparing the PR

1. **Branch is up to date** with default branch (rebase or merge, per repo convention).
2. **Pre-PR ritual** passes: run \`/verify\` (type-check + lint + test + build, see \`commands\` skill).
3. **Run \`/code-review\`** before requesting human reviewers \u2014 a fresh sub-agent reviews the diff against the plan and reports correctness/security gaps.
4. **Diff is reviewable**: one logical change, \u2264500 LOC where possible. If larger, split.
5. **Self-review** in the diff view, not the editor. PRs read differently.

## PR title

- \u2264 70 characters.
- Declarative ("Add email validator", not "Email validator added").
- Prefix per repo convention: \`feat:\` / \`fix:\` / \`chore:\` / \`refactor:\` / \`docs:\`.

## PR body

\`\`\`markdown
## Summary
- <bullet>

## Why
<one paragraph \u2014 the motivation; what was wrong before>

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
var BOOT_COMMAND = `---
description: Reload core context for a fresh session \u2014 re-read CLAUDE.md, recent decisions, active spec/plan, and inventory the scaffold. Fast warm-up, not re-bootstrap.
---
# /boot

Run this at the start of a fresh session, after \`/clear\`, or whenever context feels stale. Don't read every file \u2014 this is a warm-up.

## Read sequence (do in order, stop at first missing file)

1. **\`CLAUDE.md\`** \u2014 the always-loaded instructions. Re-read fully.
2. **\`.claude/memory/decisions.md\`** \u2014 top 30 lines (newest entries first).
3. **\`.specify/memory/constitution.md\`** \u2014 only the headings and any "## Active rules" section. Skip if file absent.
4. **\`.specify/specs/*-design.md\`** \u2014 only the newest one, only \`## Goals\` + \`## Non-goals\`. Skip if dir absent.

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
- Recent decisions: <count> entries; most recent: <YYYY-MM-DD \u2014 <title>>
- Specialists assembled: <list from .claude/agents/>
- MCPs active: <list>
- Skills installed: <count> (run \`ls .claude/skills/\` for names)
\`\`\`

## What \`/boot\` does NOT do

- Read source code, tests, or configs. That's for the actual task.
- Re-run analysis. The scaffold already captured it.
- Re-install skills. They persist between sessions.
- Make any writes. \`/boot\` is read-only.

If a key file is missing (e.g., \`CLAUDE.md\` doesn't exist), the scaffold isn't initialized \u2014 stop and ask the user whether to run the Initializer.

## Tips for this session

- For unattended runs, launch Claude Code with \`claude --permission-mode auto\` \u2014 a classifier model handles routine approvals and only escalates risky actions.
- Run \`/statusline\` once to set up a status line showing context usage; it makes "context filling up" a visible signal instead of a guess.
- Run \`/plugin\` to browse skills, hooks, and sub-agents from the community marketplace.
`;
var AGENT_RESEARCHER = `---
description: Bounded info-gathering sub-agent. Use for codebase exploration, doc comparison, tracing request flow, evaluating library trade-offs \u2014 anywhere the main thread needs synthesized findings, not raw tool output.
tools: [Read, Grep, Glob, WebSearch, WebFetch]
---
# Researcher

**You are the Researcher for <project-name>.** Your job is to gather facts, synthesize a focused answer, and return it. You do not write code, you do not modify state, and you do not pad your output to look thorough.

## When to invoke

- The main thread needs to understand >3 files or an unfamiliar subsystem before deciding what to do.
- A library / pattern / migration trade-off needs comparison.
- A request flow must be traced end-to-end (entry point \u2192 handler \u2192 data layer \u2192 response).
- External docs need to be summarized.
- A "is this thing used anywhere?" question (callsite search).

## When NOT to invoke

- Single-file question the main thread can answer with one Read.
- Task is already understood and only execution remains \u2014 dispatch to **Implementer** instead.
- The "research" is actually code review \u2014 dispatch to **Reviewer** instead.

## Input contract (what the caller gives you)

1. **Goal in one sentence** \u2014 what decision will this research support?
2. **Starting points** \u2014 known files, paths, URLs, or symbols.
3. **What's ruled out** \u2014 paths already explored, options already rejected.
4. **Depth signal** \u2014 "quick lookup" (single targeted search) | "medium" (5-10 searches) | "thorough" (cross-reference multiple sources).

If any of these are missing, ask once and stop. Don't invent scope.

## Output contract (what you return)

\`\`\`
## Finding
<2\u20134 sentence direct answer to the goal>

## Evidence
- <claim> \u2014 \`file:line\` or <URL>

## Open questions (if any)
- <unresolved point>

## Recommendation (only if explicitly requested)
<one paragraph \u2014 your read, with the trade-off in one sentence>
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
var AGENT_IMPLEMENTER = `---
description: Bounded coding sub-agent. Use for well-scoped tasks where the design is decided \u2014 implementing a function to spec, applying a refactor across N files, wiring validation onto known endpoints. Returns code + the smallest verifying test + a diff summary.
tools: [Read, Write, Edit, Bash, Grep, Glob]
---
# Implementer

**You are the Implementer for <project-name>.** Your job is to execute one bounded coding task end-to-end and return cleanly. You match existing patterns, you run the test that proves the change, and you stop on real ambiguity instead of guessing.

## When to invoke

- A task has clear acceptance criteria and an agreed design.
- Estimated scope is <300 LOC across <10 files.
- Pattern to follow already exists in the codebase.

## When NOT to invoke

- Design is unsettled \u2014 start with **Researcher** or a spec first.
- Task is exploratory ("see if X is possible") \u2014 that's research, not implementation.
- Change touches a specialist domain you don't own (schema, infra, security) \u2014 route to that specialist.

## Input contract (what the caller gives you)

1. **Goal** \u2014 what the change accomplishes in one sentence.
2. **Acceptance criteria** \u2014 a checklist of observable outcomes.
3. **Pointers** \u2014 files / functions / endpoints to touch, and patterns to mirror.
4. **Test guidance** \u2014 name (or location) of the test file that should cover this.
5. **Out-of-scope list** \u2014 what NOT to touch.

## Output contract (what you return)

\`\`\`
## Done
<one sentence \u2014 the goal, restated as a completed action>

## Files changed
- \`path/to/file.ts\` (+N -M) \u2014 <one-line reason>

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
var AGENT_REVIEWER = `---
description: Second-pass review sub-agent. Use after code has been written (by you, another sub-agent, or a human) to catch correctness, security, data-safety, and consistency issues before merge. Read-only.
tools: [Read, Grep, Glob, Bash]
---
# Reviewer

**You are the Reviewer for <project-name>.** Your job is to find real problems in a diff or branch and return a structured report. You don't write code, you don't write praise, and you don't bundle nits with blockers.

## When to invoke

- A diff is ready to land and the author wants a second pair of eyes.
- A long-running branch is about to merge.
- A change touches risk-bearing code (auth, payments, migrations) \u2014 review is mandatory.
- Before opening a PR to give the author a chance to fix issues privately.

## When NOT to invoke

- Code hasn't been written yet \u2014 that's design review, not code review.
- The change is a one-line typo fix \u2014 overhead exceeds value.

## Input contract (what the caller gives you)

1. **Diff or branch identifier** \u2014 \`git diff <base>...HEAD\` or a specific commit range.
2. **Context** \u2014 what the change is supposed to do (1-2 sentences).
3. **Risk hints** \u2014 areas the author is uncertain about.
4. **Out-of-scope** \u2014 concerns the author has already deferred.

## Output contract (what you return)

\`\`\`
## Summary
<2\u20133 sentences: what the change does + your overall read>

## Blockers
- \`file:line\` \u2014 <issue> \u2014 <fix>

## Concerns
- \`file:line\` \u2014 <issue> \u2014 <fix>

## Nits
- \`file:line\` \u2014 <issue>

## Verification suggestions (optional)
- <test that would catch the issue if added>
\`\`\`

## Priority order (find issues in this sequence)

1. **Correctness** \u2014 does it do what it claims?
2. **Security** \u2014 auth bypass, injection, secret leak, missing validation at boundary.
3. **Data safety** \u2014 destructive ops, migration rollback, race conditions, lost writes.
4. **Test coverage** \u2014 does a meaningful test exist for the new behavior?
5. **Consistency** \u2014 does it match nearby patterns and the project's conventions?

## Severity labels

- **Blocker** \u2014 must fix before merge. Correctness, security, data-safety.
- **Concern** \u2014 should fix but not gating. Consistency miss, ambiguous naming.
- **Nit** \u2014 taste. Authors are free to ignore.

## Operating rules

1. **Cite the line.** Every finding: \`file:line \u2014 issue \u2014 suggested fix\`.
2. **One fix per finding.** Don't bundle two issues into one bullet.
3. **No praise filler.** "Looks good" is fine as a one-line closer.
4. **No writes.** Read-only. Suggest fixes in text \u2014 don't apply them.
5. **Surface what you didn't check.** If you skipped a generated artifact, say so.
6. **Don't re-litigate scope.** If something is out-of-scope and reasonable, don't flag it.
`;
var CI_COMMAND = `# /ci

Recipes for running Claude Code non-interactively in CI, pre-commit hooks, or
any unattended script. Use \`claude -p\` (non-interactive / "headless" mode).

## Quick reference

\`\`\`bash
# One-off question, plain text output (default).
claude -p "Explain what this project does"

# Structured output for downstream scripts.
claude -p "List all API endpoints" --output-format json

# Streaming for real-time UIs (one JSON event per line).
claude -p "Analyze this log file" --output-format stream-json --verbose

# Restrict what the unattended run is allowed to do.
claude -p "fix all lint errors" --allowedTools "Edit,Bash(npm run lint:*)"

# Auto-mode: a classifier handles approvals; the run aborts if it can't
# get past a risky action without a human.
claude -p "implement the rate limiter from PLAN.md" --permission-mode auto
\`\`\`

## Patterns from the best practices doc

- **Fan out across files** \u2014 generate a task list, then loop \`claude -p\` once
  per file. Use \`--allowedTools\` to keep the per-invocation surface tight.
  Test on 2-3 entries before running on the full set.
- **Pipe into existing pipelines** \u2014 \`claude -p "<prompt>" --output-format json | jq ...\`
  works as a step inside any shell pipeline.
- **CI gate** \u2014 run \`claude -p\` against the diff and exit non-zero on
  findings to fail the build (see https://code.claude.com/docs/en/headless
  for output schemas).

## Rules

- \`--allowedTools\` is required for any unattended run that can write. Don't
  ship a CI job that has full write access without bounds.
- \`--verbose\` is useful during development; turn it off in production so logs
  don't fill with debug output.
- Auto-mode aborts when the classifier repeatedly blocks an action \u2014 design
  prompts so a clean run doesn't hit that path.
`;
var SPEC_COMMAND = `# /spec

Interview the user about a feature, then write a complete spec to \`SPEC.md\`.

## What to do

You will use the \`AskUserQuestion\` tool to interview the user. Cover, in this order:

1. **Goal** \u2014 what problem this feature solves, who benefits, why now.
2. **Scope** \u2014 what's in, what's deliberately out. Name files/modules that will
   change. Name the boundaries that won't.
3. **Edge cases** \u2014 auth states, empty/loading/error UI, concurrency, partial
   failures, migration of existing data.
4. **Constraints** \u2014 performance, accessibility, security, compliance, browser
   support.
5. **Acceptance criteria** \u2014 what passing tests, screens, or commands prove it
   works end-to-end.
6. **Risks and tradeoffs** \u2014 the second-best alternative the user considered and
   why this one wins.

## Rules

- **Use \`AskUserQuestion\` for every clarification.** Don't ask conversational
  open-ended questions; force a structured choice so the user can answer in one
  click. Free-text is the option of last resort.
- **Don't ask obvious questions** ("Should it work?"). Dig into the hard parts
  the user might not have considered yet \u2014 race conditions, irreversible
  actions, what happens when an upstream service is down.
- **Keep interviewing until you've covered every section above.** A spec with
  three unanswered questions is worse than no spec.
- **Then write \`SPEC.md\`** at the repo root with these sections:
  Goal \xB7 Scope (In / Out) \xB7 User flows \xB7 Data model changes \xB7 Edge cases \xB7
  Acceptance criteria \xB7 Open questions \xB7 Out of scope.
- **End the command** by telling the user: "Spec written to SPEC.md. Start a
  fresh session and run \`/plan\` (or \`/speckit.plan\` if Spec-Kit is installed)
  to design the implementation."

## Why this matters

A precise spec costs less than the rework it prevents. The whole point of
running this command in a separate session is so the implementation session
starts with a clean context and a written contract.
`;
var AGENT_ADVERSARIAL_REVIEWER = `---
name: adversarial-reviewer
description: Fresh-context review of the current diff against a plan or spec. Reports only gaps that affect correctness, security, or stated requirements \u2014 not style.
tools: [Read, Grep, Glob, Bash]
model: sonnet
---
# adversarial-reviewer

You are an adversarial reviewer. Your job is to read **only the diff** and the
**plan or spec** the change was supposed to implement, and report gaps the
implementing agent (or human) may have missed.

You do **not** see the conversation history that produced the change. That is
the point: a fresh model evaluates the work on its own terms, without inheriting
the reasoning that justified each choice.

## Inputs you must read

1. The current diff: \`git diff\` (uncommitted) and \`git diff <base>...HEAD\`
   (committed changes on this branch since the merge base).
2. The plan/spec the change was supposed to implement. Look in this order:
   - \`SPEC.md\` at the repo root,
   - The newest file in \`.claude/plans/*.md\`,
   - The newest file in \`.specify/specs/*\` if Spec-Kit is in use,
   - If none of those exist, ask the user to name the requirements.

## Inputs you must NOT read

- The conversation history of the session that produced the diff.
- The implementer's commit messages alone (they describe the *what*, not the
  *requirements*). Use them only as pointers, not as the source of truth.

## What counts as a finding

- **Correctness gap** \u2014 an input the diff doesn't handle correctly, an
  invariant it breaks, a race condition, a regression in another path.
- **Security gap** \u2014 secrets in code, missing authz check, injection vector,
  unsafe deserialization, weakened crypto.
- **Requirements gap** \u2014 the spec says X, the diff does Y, or doesn't do X.
- **Scope leak** \u2014 the diff changes files clearly outside the plan with no
  justification.

## What is NOT a finding

- Style, formatting, naming (the PostToolUse lint hook owns those).
- "Could be more elegant" (over-engineering is a worse failure mode than
  ugly code).
- Tests you would have written differently if the existing tests cover the
  requirement adequately.

## Output format

A numbered list. Each item:

\`\`\`
N. <file>:<line> \u2014 <one-line problem statement>
   Why it matters: <one sentence linking to spec/plan/correctness criterion>
   Suggested fix: <concrete change, or "needs decision from user">
\`\`\`

End with one of:
- "**No blocking gaps found.**" \u2014 diff matches the spec, no correctness/security issues.
- "**N blocking gap(s) found.**" \u2014 fix before merging.
- "**Cannot review: <reason>**" \u2014 e.g., no spec available and the user did not
  name requirements.

## Hard rules

- Never apply fixes yourself. You are read-only.
- Never say "looks good" without listing what you actually checked.
- If asked to flag style nits anyway, prefix them \`(optional)\` so they are not
  confused with blockers.
- If you would flag more than 10 items, stop at 10 and report
  "additional findings truncated; address the top items first."
`;
var CLAUDE_LOCAL_STUB = `# CLAUDE.local.md \u2014 Personal overrides

This file is **gitignored**. It's yours alone \u2014 teammates won't see it.

Claude Code reads it automatically alongside \`CLAUDE.md\`, so anything you put
here applies only to your sessions. Keep it short; long files dilute the rules
that actually matter.

Good uses:

- Local environment quirks (e.g. \`source ~/secrets.env\`, custom debug ports, IDE shortcuts).
- Personal style overrides for your own runs (e.g. "prefer verbose explanations on this repo").
- Scratch notes on the current task that don't belong in the team's \`decisions.md\`.

Bad uses:

- Anything teammates also need \u2014 put that in \`CLAUDE.md\`.
- Secrets \u2014 \`.env\` files are still the right place; this file is committed-adjacent.
- Long tutorials \u2014 link out instead.
`;

// src/rules/adapters/cursor-adapter.ts
var cursorAdapter = {
  agentId: "cursor",
  compile(rule, index) {
    const slug = rule.slug;
    const path = `.cursor/rules/${String(index).padStart(2, "0")}-${slug}.mdc`;
    const fmLines = ["---"];
    fmLines.push(`description: "${rule.meta.title}"`);
    if (rule.meta.alwaysApply) {
      fmLines.push("alwaysApply: true");
    } else if (rule.meta.globs?.length) {
      const globStr = rule.meta.globs.map((g) => `"${g}"`).join(", ");
      fmLines.push(`globs: [${globStr}]`);
    }
    fmLines.push("---");
    const content = [fmLines.join("\n"), "", rule.body].join("\n");
    return { path, content };
  }
};

// src/rules/adapters/claude-adapter.ts
var claudeAdapter = {
  agentId: "claude-code",
  compile(rule, index) {
    const slug = rule.slug;
    const path = `.claude/rules/${String(index).padStart(2, "0")}-${slug}.md`;
    const lines = [];
    lines.push(`# ${rule.meta.title}`);
    if (rule.meta.impact) {
      lines.push(`
**Impact: ${rule.meta.impact}**`);
    }
    if (rule.meta.globs?.length) {
      lines.push(`
**Applies to:** ${rule.meta.globs.join(", ")}`);
    }
    lines.push("");
    lines.push(rule.body);
    return { path, content: lines.join("\n") };
  }
};

// src/rules/adapters/copilot-adapter.ts
var copilotAdapter = {
  agentId: "copilot",
  compile(rule, _index) {
    const slug = rule.slug;
    const path = `.github/instructions/${slug}.instructions.md`;
    const lines = ["---"];
    if (rule.meta.globs?.length) {
      lines.push(`applyTo: "${rule.meta.globs.join(",")}"`);
    } else {
      lines.push('applyTo: "**"');
    }
    lines.push("---");
    lines.push("");
    lines.push(`# ${rule.meta.title}`);
    if (rule.meta.impact) {
      lines.push(`
**Impact: ${rule.meta.impact}**`);
    }
    lines.push("");
    lines.push(rule.body);
    return { path, content: lines.join("\n") };
  }
};

// src/rules/adapters/cline-adapter.ts
var clineAdapter = {
  agentId: "cline",
  compile(rule, index) {
    const slug = rule.slug;
    const path = `.clinerules/${String(index).padStart(2, "0")}-${slug}.md`;
    const lines = [];
    lines.push(`# ${rule.meta.title}`);
    if (rule.meta.impact) {
      lines.push(`
**Impact: ${rule.meta.impact}**`);
    }
    if (rule.meta.globs?.length) {
      lines.push(`
**Applies to:** ${rule.meta.globs.join(", ")}`);
    }
    lines.push("");
    lines.push(rule.body);
    return { path, content: lines.join("\n") };
  }
};

// src/rules/adapters/windsurf-adapter.ts
var windsurfAdapter = {
  agentId: "windsurf",
  compile(rule, index) {
    const slug = rule.slug;
    const path = `.windsurf/rules/${String(index).padStart(2, "0")}-${slug}.md`;
    const lines = [];
    lines.push(`# ${rule.meta.title}`);
    if (rule.meta.impact) {
      lines.push(`
**Impact: ${rule.meta.impact}**`);
    }
    if (rule.meta.globs?.length) {
      lines.push(`
**Applies to:** ${rule.meta.globs.join(", ")}`);
    }
    lines.push("");
    lines.push(rule.body);
    return { path, content: lines.join("\n") };
  }
};

// src/rules/adapters/roo-adapter.ts
var rooAdapter = {
  agentId: "roo-code",
  compile(rule, index) {
    const slug = rule.slug;
    const path = `.roo/rules/${String(index).padStart(2, "0")}-${slug}.md`;
    const lines = [];
    lines.push(`# ${rule.meta.title}`);
    if (rule.meta.impact) {
      lines.push(`
**Impact: ${rule.meta.impact}**`);
    }
    if (rule.meta.globs?.length) {
      lines.push(`
**Applies to:** ${rule.meta.globs.join(", ")}`);
    }
    lines.push("");
    lines.push(rule.body);
    return { path, content: lines.join("\n") };
  }
};

// src/rules/adapters/kilo-adapter.ts
var kiloAdapter = {
  agentId: "kilo-code",
  compile(rule, index) {
    const slug = rule.slug;
    const path = `.kilocode/rules/${String(index).padStart(2, "0")}-${slug}.md`;
    const lines = [];
    lines.push(`# ${rule.meta.title}`);
    if (rule.meta.impact) {
      lines.push(`
**Impact: ${rule.meta.impact}**`);
    }
    if (rule.meta.globs?.length) {
      lines.push(`
**Applies to:** ${rule.meta.globs.join(", ")}`);
    }
    lines.push("");
    lines.push(rule.body);
    return { path, content: lines.join("\n") };
  }
};

// src/rules/adapters/gemini-adapter.ts
var geminiAdapter = {
  agentId: "gemini-cli",
  compile(rule, index) {
    const slug = rule.slug;
    const path = `.gemini/rules/${String(index).padStart(2, "0")}-${slug}.md`;
    const lines = [];
    lines.push(`# ${rule.meta.title}`);
    if (rule.meta.impact) {
      lines.push(`
**Impact: ${rule.meta.impact}**`);
    }
    if (rule.meta.globs?.length) {
      lines.push(`
**Applies to:** ${rule.meta.globs.join(", ")}`);
    }
    lines.push("");
    lines.push(rule.body);
    return { path, content: lines.join("\n") };
  }
};

// src/rules/adapters/generic-adapter.ts
var genericAdapter = {
  agentId: "generic",
  compile(rule, index) {
    const slug = rule.slug;
    const path = `.agents/rules/compiled/${String(index).padStart(2, "0")}-${slug}.md`;
    const lines = [];
    lines.push(`# ${rule.meta.title}`);
    if (rule.meta.impact) {
      lines.push(`
**Impact: ${rule.meta.impact}**`);
    }
    if (rule.meta.globs?.length) {
      lines.push(`
**Applies to:** ${rule.meta.globs.join(", ")}`);
    }
    lines.push("");
    lines.push(rule.body);
    return { path, content: lines.join("\n") };
  }
};

// src/rules/compiler.ts
var adapters = {
  "claude-code": claudeAdapter,
  cursor: cursorAdapter,
  copilot: copilotAdapter,
  cline: clineAdapter,
  windsurf: windsurfAdapter,
  "roo-code": rooAdapter,
  "kilo-code": kiloAdapter,
  "gemini-cli": geminiAdapter,
  codex: genericAdapter,
  aider: genericAdapter,
  generic: genericAdapter
};
function compileRule(rule, agent, index = 0) {
  const adapter = adapters[agent];
  if (!adapter) {
    throw new Error(`No adapter registered for agent: ${agent}`);
  }
  return adapter.compile(rule, index);
}
function compileRules(rules, agent, startIndex = 60) {
  return rules.map((rule, i) => compileRule(rule, agent, startIndex + i * 10));
}
function compileRulesForAgents(rules, agents, startIndex = 60) {
  const result = /* @__PURE__ */ new Map();
  for (const agent of agents) {
    result.set(agent, compileRules(rules, agent, startIndex));
  }
  return result;
}

// src/utils/stack-skills.ts
var ALWAYS = [
  {
    repo: "vercel-labs/skills",
    skill: "find-skills",
    reason: "Meta-skill: discover other skills via `npx skills find`"
  },
  {
    repo: "obra/superpowers",
    reason: "Mandatory universal skill pack \u2014 install whole repo on every project"
  },
  {
    repo: "mattpocock/skills",
    reason: "Mandatory universal skill pack \u2014 install whole repo on every project"
  }
];
var STACK_MAP = [
  {
    match: (a) => a.languages.includes("TypeScript"),
    skills: [
      {
        repo: "wshobson/agents",
        skill: "typescript-advanced-types",
        reason: "TypeScript detected \u2014 advanced type patterns"
      }
    ]
  },
  {
    match: (a) => a.frameworks.includes("Next.js"),
    skills: [
      {
        repo: "wshobson/agents",
        skill: "nextjs-app-router-patterns",
        reason: "Next.js detected \u2014 App Router conventions"
      }
    ]
  },
  {
    match: (a) => a.frameworks.includes("React") || a.frameworks.includes("Next.js"),
    skills: [
      {
        repo: "vercel-labs/agent-skills",
        skill: "vercel-react-best-practices",
        reason: "React detected \u2014 performance + composition patterns"
      }
    ]
  },
  {
    match: (a) => a.frameworks.includes("Prisma"),
    skills: [
      {
        repo: "prisma/skills",
        skill: "prisma-client-api",
        reason: "Prisma detected \u2014 client query API"
      },
      {
        repo: "prisma/skills",
        skill: "prisma-cli",
        reason: "Prisma detected \u2014 migrations and CLI"
      }
    ]
  },
  {
    match: (a) => a.frameworks.includes("Tailwind CSS"),
    skills: [
      {
        repo: "wshobson/agents",
        skill: "tailwind-design-systems",
        reason: "Tailwind detected \u2014 design-system patterns"
      }
    ]
  },
  {
    match: (a) => a.frameworks.includes("Vue") || a.frameworks.includes("Nuxt"),
    skills: [
      {
        repo: "wshobson/agents",
        skill: "vue-composition-patterns",
        reason: "Vue detected \u2014 composition patterns"
      }
    ]
  }
];
function getSkillsForStack(analysis) {
  const keyOf = (s) => `${s.repo}/${s.skill ?? "*"}`;
  const out = [...ALWAYS];
  const seen = new Set(out.map(keyOf));
  for (const entry of STACK_MAP) {
    if (!entry.match(analysis)) continue;
    for (const skill of entry.skills) {
      const key = keyOf(skill);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(skill);
      }
    }
  }
  return out;
}

// src/commands/validate.ts
import { Command as Command2 } from "commander";
import * as p4 from "@clack/prompts";
import chalk3 from "chalk";
import { existsSync as existsSync9, readFileSync as readFileSync8, readdirSync as readdirSync2, statSync as statSync2 } from "fs";
import { join as join8 } from "path";
import fg2 from "fast-glob";
var AGENTINIT_MANAGED_GLOBS = [
  "CLAUDE.md",
  "AGENTS.md",
  "GEMINI.md",
  ".github/copilot-instructions.md",
  ".github/instructions/**/*.md",
  ".agents/**/*.md",
  ".claude/**/*.md",
  ".cursor/**/*.{md,mdc}",
  ".codex/**/*.md",
  ".clinerules/**/*.md",
  ".windsurf/**/*.md",
  ".roo/**/*.md",
  ".kilocode/**/*.md"
];
var HTML_AND_GENERIC_TAGS = /* @__PURE__ */ new Set([
  "p",
  "div",
  "span",
  "body",
  "html",
  "head",
  "title",
  "meta",
  "link",
  "script",
  "style",
  "table",
  "tr",
  "td",
  "th",
  "thead",
  "tbody",
  "tfoot",
  "caption",
  "colgroup",
  "col",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "img",
  "br",
  "hr",
  "em",
  "strong",
  "b",
  "i",
  "u",
  "s",
  "ins",
  "del",
  "mark",
  "small",
  "sub",
  "sup",
  "q",
  "cite",
  "code",
  "pre",
  "kbd",
  "samp",
  "var",
  "blockquote",
  "abbr",
  "address",
  "time",
  "nav",
  "header",
  "footer",
  "main",
  "section",
  "article",
  "aside",
  "figure",
  "figcaption",
  "video",
  "audio",
  "source",
  "track",
  "embed",
  "object",
  "param",
  "iframe",
  "canvas",
  "svg",
  "form",
  "input",
  "button",
  "select",
  "option",
  "optgroup",
  "textarea",
  "label",
  "fieldset",
  "legend",
  "datalist",
  "output",
  "progress",
  "meter",
  "details",
  "summary",
  "dialog",
  "template",
  "slot",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "g",
  "defs",
  "use",
  "text",
  "tspan",
  "void",
  "any",
  "never",
  "unknown",
  "string",
  "number",
  "boolean",
  "object"
]);
function findPlaceholders(content) {
  const stripped = content.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]+`/g, "");
  const out = [];
  const angleRe = /<([a-z][a-z0-9_-]*)>/g;
  let m;
  while ((m = angleRe.exec(stripped)) !== null) {
    if (!HTML_AND_GENERIC_TAGS.has(m[1].toLowerCase())) {
      out.push(m[0]);
    }
  }
  const mustache = stripped.match(/\{\{[^}\n]+\}\}/g);
  if (mustache) out.push(...mustache);
  return out;
}
var AGENT_PATHS = {
  "claude-code": ["CLAUDE.md", ".claude/settings.json", ".claude/mcp.json", ".claude/agents", ".claude/memory/decisions.md"],
  cursor: [".cursor/rules/00-core.mdc", ".cursor/mcp.json"],
  codex: ["AGENTS.md", ".codex/skills/context-hygiene/SKILL.md"],
  copilot: [".github/copilot-instructions.md"],
  "gemini-cli": ["GEMINI.md"],
  cline: [".clinerules/00-core.md"],
  windsurf: [".windsurf/rules/general.md"],
  "roo-code": [".roomodes", ".roo/rules/00-core.md"],
  "kilo-code": [".kilocode/rules/00-core.md"]
};
async function validate(targetDir, agents) {
  const issues = [];
  let passed = 0;
  let total = 0;
  const sharedFiles = ["AGENTS.md", "how-to-use-skills.sh"];
  for (const file of sharedFiles) {
    total++;
    if (existsSync9(join8(targetDir, file))) {
      passed++;
    } else {
      issues.push(`Missing shared file: ${file}`);
    }
  }
  const detectedAgents = agents ?? detectAgents(targetDir);
  for (const agent of detectedAgents) {
    const paths = AGENT_PATHS[agent];
    if (!paths) continue;
    for (const filePath of paths) {
      total++;
      if (existsSync9(join8(targetDir, filePath))) {
        passed++;
      } else {
        issues.push(`Missing ${agent} file: ${filePath}`);
      }
    }
  }
  const mdFiles = await fg2(AGENTINIT_MANAGED_GLOBS, {
    cwd: targetDir,
    ignore: [
      "node_modules/**",
      ".git/**",
      ".agents/skills/**",
      ".claude/skills/**",
      ".codex/skills/**",
      ".cursor/skills/**",
      ".github/skills/**"
    ],
    absolute: true
  });
  for (const file of mdFiles) {
    const content = readFileSync8(file, "utf-8");
    const placeholders = findPlaceholders(content);
    if (placeholders.length > 0) {
      const relativePath = file.replace(targetDir + "/", "");
      const unique = [...new Set(placeholders)].slice(0, 3);
      issues.push(
        `Unfilled placeholder(s) in ${relativePath}: ${unique.join(", ")}${placeholders.length > 3 ? ` (+${placeholders.length - 3} more)` : ""}`
      );
    }
  }
  total++;
  if (existsSync9(join8(targetDir, "skills-lock.json"))) {
    passed++;
  } else {
    issues.push("skills-lock.json not found (run npx skills to generate)");
  }
  const memoryPaths = [
    ".agents/memory/decisions.md",
    ".claude/memory/decisions.md",
    ".codex/memory/decisions.md",
    ".clinerules/memory/decisions.md",
    ".windsurf/memory/decisions.md",
    ".roo/memory/decisions.md",
    ".gemini/memory/decisions.md"
  ];
  total++;
  const seededDecisionsFile = memoryPaths.map((mp) => join8(targetDir, mp)).find((p9) => existsSync9(p9) && countDecisionEntries(p9) >= 2);
  if (seededDecisionsFile) {
    passed++;
  } else if (memoryPaths.some((mp) => existsSync9(join8(targetDir, mp)))) {
    issues.push("decisions.md exists but has fewer than 2 entries (AI should seed project-specific decisions)");
  } else {
    issues.push("No decisions.md found in any memory path");
  }
  total++;
  const skillCount = countInstalledSkills(targetDir);
  if (skillCount >= 5) {
    passed++;
  } else {
    issues.push(`Only ${skillCount} skill(s) installed \u2014 expected \u22655 for a customized stack`);
  }
  if (detectedAgents.includes("claude-code")) {
    total++;
    const specialistCount = countSpecialistAgents(targetDir);
    if (specialistCount >= 1) {
      passed++;
    } else {
      issues.push(
        ".claude/agents/ has no specialist sub-agents \u2014 expected at least one (frontend/api/database/devops/qa) based on stack"
      );
    }
  }
  total++;
  const ruleFileCount = countCompiledRules(targetDir, detectedAgents);
  if (ruleFileCount > 0) {
    passed++;
  } else {
    issues.push("0 compiled rules found \u2014 built-in rules pipeline failed to write outputs");
  }
  return { issues, passed, total };
}
function countDecisionEntries(filePath) {
  try {
    const content = readFileSync8(filePath, "utf-8");
    const headingMatches = content.match(/^##\s+\S/gm);
    return headingMatches?.length ?? 0;
  } catch {
    return 0;
  }
}
function countInstalledSkills(targetDir) {
  const skillDirs = [
    ".claude/skills",
    ".agents/skills",
    ".codex/skills",
    ".github/skills",
    ".cursor/skills"
  ];
  const seen = /* @__PURE__ */ new Set();
  for (const dir of skillDirs) {
    const fullDir = join8(targetDir, dir);
    if (!existsSync9(fullDir)) continue;
    try {
      for (const entry of readdirSync2(fullDir)) {
        if (entry.startsWith(".")) continue;
        const entryPath = join8(fullDir, entry);
        try {
          if (statSync2(entryPath).isDirectory()) seen.add(entry);
        } catch {
        }
      }
    } catch {
    }
  }
  return seen.size;
}
function countSpecialistAgents(targetDir) {
  const agentsDir = join8(targetDir, ".claude", "agents");
  if (!existsSync9(agentsDir)) return 0;
  const core = /* @__PURE__ */ new Set(["researcher.md", "implementer.md", "reviewer.md"]);
  try {
    return readdirSync2(agentsDir).filter(
      (f) => f.endsWith(".md") && !core.has(f)
    ).length;
  } catch {
    return 0;
  }
}
function countCompiledRules(targetDir, agents) {
  let count = 0;
  const rulePaths = [
    ".agents/rules/builtin"
  ];
  if (agents.includes("claude-code")) rulePaths.push(".claude/rules");
  if (agents.includes("cursor")) rulePaths.push(".cursor/rules");
  if (agents.includes("copilot")) rulePaths.push(".github/instructions");
  if (agents.includes("codex")) rulePaths.push(".codex/rules");
  if (agents.includes("cline")) rulePaths.push(".clinerules");
  if (agents.includes("windsurf")) rulePaths.push(".windsurf/rules");
  if (agents.includes("roo-code")) rulePaths.push(".roo/rules");
  if (agents.includes("kilo-code")) rulePaths.push(".kilocode/rules");
  for (const rp of rulePaths) {
    const fullDir = join8(targetDir, rp);
    if (!existsSync9(fullDir)) continue;
    try {
      count += readdirSync2(fullDir).filter(
        (f) => f.endsWith(".md") || f.endsWith(".mdc")
      ).length;
    } catch {
    }
  }
  return count;
}
function detectAgents(targetDir) {
  const detected = [];
  if (existsSync9(join8(targetDir, ".claude"))) detected.push("claude-code");
  if (existsSync9(join8(targetDir, ".cursor"))) detected.push("cursor");
  if (existsSync9(join8(targetDir, ".codex"))) detected.push("codex");
  if (existsSync9(join8(targetDir, ".github", "copilot-instructions.md")))
    detected.push("copilot");
  if (existsSync9(join8(targetDir, "GEMINI.md"))) detected.push("gemini-cli");
  if (existsSync9(join8(targetDir, ".clinerules"))) detected.push("cline");
  if (existsSync9(join8(targetDir, ".windsurf"))) detected.push("windsurf");
  if (existsSync9(join8(targetDir, ".roo"))) detected.push("roo-code");
  if (existsSync9(join8(targetDir, ".kilocode"))) detected.push("kilo-code");
  return detected;
}
var validateCommand = new Command2("validate").description("Health-check: verify scaffold integrity, find unfilled placeholders").argument("[directory]", "Target directory", ".").action(async (directory) => {
  p4.intro(chalk3.bgCyan(" agentinit validate "));
  const targetDir = directory === "." ? process.cwd() : directory;
  const agents = detectAgents(targetDir);
  if (agents.length === 0) {
    p4.log.warn("No agent scaffold detected. Run `agentinit init` first.");
    p4.outro("");
    return;
  }
  p4.log.info(`Detected agents: ${agents.join(", ")}`);
  const result = await validate(targetDir, agents);
  if (result.issues.length === 0) {
    p4.log.success(`All checks passed (${result.passed}/${result.total}) \u2713`);
  } else {
    p4.log.warn(`${result.issues.length} issue(s) found:`);
    for (const issue of result.issues) {
      p4.log.message(`  ${chalk3.yellow("!")} ${issue}`);
    }
    p4.log.info(`Passed: ${result.passed}/${result.total}`);
  }
  p4.outro("");
});

// src/commands/init.ts
var COPILOT_AGENT_FLAG = {
  "claude-code": "claude-code",
  copilot: "github-copilot",
  cursor: "cursor",
  codex: "codex",
  cline: "cline",
  windsurf: "windsurf"
};
var initCommand = new Command3("init").description("Analyze project, build profile, scaffold files, and dispatch to agent").argument("[directory]", "Target directory", ".").option("--agent <agents...>", "Pre-select agent(s) to skip interactive selection").option("--skip-profile", "Use default profile (senior, high autonomy)").option("--no-dispatch", "Generate prompt file only, don't launch agent").option("--spec <path>", "Path to agentic-system-initializer.md (uses CDN by default)").option("--offline", "Use cached/local sections only, skip CDN fetch").action(async (directory, options) => {
  p5.intro(chalk4.bgCyan(" agentinit "));
  const targetDir = directory === "." ? process.cwd() : directory;
  p5.log.step("Step 0: Analyzing project...");
  const analysis = await analyzeProject(targetDir);
  p5.log.success(
    `Detected: ${analysis.languages.join(", ") || "unknown"} / ${analysis.frameworks.join(", ") || "no framework"} / ${analysis.packageManager}`
  );
  let profile;
  if (options.skipProfile) {
    profile = getDefaultProfile();
    p5.log.info("Using default profile (senior, high autonomy, balanced strictness)");
  } else {
    p5.log.step("Step 0b: Building your developer profile...");
    profile = await collectProfile();
  }
  const agentsDir = join9(targetDir, ".agents");
  if (!existsSync10(agentsDir)) {
    const { mkdirSync: mkdirSync6 } = await import("fs");
    mkdirSync6(agentsDir, { recursive: true });
  }
  saveProfile(targetDir, profile);
  let agents;
  if (options.agent) {
    agents = options.agent;
  } else {
    agents = await selectAgents();
  }
  p5.log.success(`Selected agent(s): ${agents.join(", ")}`);
  const isClaudeCode = agents.includes("claude-code");
  p5.log.step("Phase 1: Writing scaffold files...");
  const gitignoreResult = ensureGitignoreEntries(targetDir, AGENTINIT_GITIGNORE_ENTRIES);
  if (gitignoreResult.created) {
    p5.log.success(`Created .gitignore with ${gitignoreResult.added} agentinit entries`);
  } else if (gitignoreResult.added > 0) {
    p5.log.success(`Updated .gitignore (+${gitignoreResult.added} agentinit entries)`);
  }
  const scaffoldResult = writeScaffold({
    targetDir,
    agents,
    profile,
    analysis
  });
  if (scaffoldResult.created.length > 0) {
    p5.log.success(`Created ${scaffoldResult.created.length} scaffold file(s)`);
  }
  if (scaffoldResult.errors.length > 0) {
    for (const err of scaffoldResult.errors) {
      p5.log.warn(`Scaffold error: ${err}`);
    }
  }
  if (writeHowToUseSkills(targetDir)) {
    p5.log.success("Created how-to-use-skills.sh");
  }
  if (isClaudeCode) {
    const claudeResult = generateClaudeFiles(targetDir, profile, analysis);
    if (claudeResult.created.length > 0) {
      p5.log.success(
        `Created ${claudeResult.created.length} file(s) in .claude/`
      );
    }
  }
  const builtinRules = loadBuiltinRules();
  if (builtinRules.length > 0) {
    const { writeFileSync: writeFileSync8, mkdirSync: mkdirSync6 } = await import("fs");
    const builtinDir = join9(targetDir, ".agents", "rules", "builtin");
    if (!existsSync10(builtinDir)) mkdirSync6(builtinDir, { recursive: true });
    let rulesAdded = 0;
    for (const rule of builtinRules) {
      const dest = join9(builtinDir, `${rule.slug}.md`);
      if (!existsSync10(dest)) {
        const { getBuiltinRuleContent: getBuiltinRuleContent2 } = await import("./loader-EIL52SHS.js");
        const content = getBuiltinRuleContent2(rule.slug);
        if (content) {
          writeFileSync8(dest, content);
          rulesAdded++;
        }
      }
    }
    if (rulesAdded > 0) {
      p5.log.success(`Added ${rulesAdded} built-in rule(s)`);
    }
    const compiled = compileRulesForAgents(builtinRules, agents);
    let totalCompiled = 0;
    for (const [, files] of compiled) {
      for (const file of files) {
        const fullPath = join9(targetDir, file.path);
        const dir = join9(fullPath, "..");
        if (!existsSync10(dir)) mkdirSync6(dir, { recursive: true });
        writeFileSync8(fullPath, file.content);
        totalCompiled++;
      }
    }
    if (totalCompiled > 0) {
      p5.log.success(`Compiled ${totalCompiled} rule file(s) for ${agents.join(", ")}`);
    }
  }
  const skillSet = getSkillsForStack(analysis);
  const agentFlags = Array.from(
    new Set(
      agents.map((a) => COPILOT_AGENT_FLAG[a]).filter((f) => Boolean(f))
    )
  );
  p5.log.step(`Installing ${skillSet.length} stack-driven skill(s)...`);
  const { execSync: execSync2 } = await import("child_process");
  let skillsInstalled = 0;
  const skillsFailed = [];
  for (const s of skillSet) {
    const isWholeRepo = !s.skill;
    try {
      if (isWholeRepo) {
        execSync2(`npx skills add ${s.repo} -y`, {
          cwd: targetDir,
          stdio: "pipe",
          timeout: 12e4
        });
      } else if (agentFlags.length === 0) {
        execSync2(`npx skills add ${s.repo} --skill ${s.skill} -y`, {
          cwd: targetDir,
          stdio: "pipe",
          timeout: 12e4
        });
      } else {
        for (const flag of agentFlags) {
          execSync2(`npx skills add ${s.repo} --skill ${s.skill} -a ${flag} -y`, {
            cwd: targetDir,
            stdio: "pipe",
            timeout: 12e4
          });
        }
      }
      skillsInstalled++;
    } catch {
      skillsFailed.push(s.skill ? `${s.repo}/${s.skill}` : s.repo);
    }
  }
  if (skillsInstalled > 0) {
    p5.log.success(`Installed ${skillsInstalled}/${skillSet.length} skill(s)`);
  }
  if (skillsFailed.length > 0) {
    p5.log.warn(
      `Skill installs that failed (likely registry/network): ${skillsFailed.join(", ")}`
    );
  }
  const specPath = options.spec ?? findSpecFile(targetDir);
  const useOffline = options.offline ?? false;
  for (const agent of agents) {
    p5.log.step(`Generating prompt for ${chalk4.bold(agent)}...`);
    const prompt = await generatePrompt({
      specPath: specPath ?? void 0,
      agent,
      profile,
      analysis,
      offline: useOffline
    });
    p5.log.success(`Prompt ready (${prompt.split("\n").length} lines)`);
    if (options.dispatch === false) {
      const { writeFileSync: writeFileSync8, mkdirSync: mkdirSync6 } = await import("fs");
      const tmpDir = join9(targetDir, ".agents", ".tmp");
      if (!existsSync10(tmpDir)) mkdirSync6(tmpDir, { recursive: true });
      const outFile = join9(tmpDir, `${agent}-init-prompt.md`);
      writeFileSync8(outFile, prompt);
      p5.log.info(`Written to: ${outFile}`);
      continue;
    }
    if (canDispatch(agent)) {
      const result = await dispatchToAgent(agent, prompt, targetDir);
      if (result.success && result.method === "cli") {
        p5.log.success(result.message);
      } else if (result.method === "file") {
        p5.log.info(result.message);
      } else {
        p5.log.warn(result.message);
      }
    } else if (isIdeAgent(agent)) {
      const { writeFileSync: writeFileSync8, mkdirSync: mkdirSync6 } = await import("fs");
      const tmpDir = join9(targetDir, ".agents", ".tmp");
      if (!existsSync10(tmpDir)) mkdirSync6(tmpDir, { recursive: true });
      const outFile = join9(tmpDir, `${agent}-init-prompt.md`);
      writeFileSync8(outFile, prompt);
      const instruction = getDispatchInstructions(agent, outFile);
      p5.log.info(`${chalk4.dim("\u2192")} ${instruction}`);
    }
  }
  if (isClaudeCode) {
    const stagingResult = copyClaudeStagingToTarget(targetDir);
    if (stagingResult.copied.length > 0) {
      p5.log.success(
        `Moved ${stagingResult.copied.length} staged file(s) to .claude/`
      );
      cleanupStaging(targetDir);
    }
  }
  p5.log.step("Validating scaffold...");
  const validationResult = await validate(targetDir, agents);
  if (validationResult.issues.length === 0) {
    p5.log.success(`All checks passed (${validationResult.passed}/${validationResult.total}) \u2713`);
  } else {
    p5.log.warn(`${validationResult.issues.length} issue(s) found:`);
    for (const issue of validationResult.issues) {
      p5.log.message(`  ${chalk4.yellow("!")} ${issue}`);
    }
  }
  p5.note(
    [
      `Agent(s): ${agents.join(", ")}`,
      `Profile: ${profile.role} / ${profile.domain} / autonomy=${profile.autonomy}`,
      `Spec: ${specPath ?? "CDN (remote)"}`,
      "",
      "Phase 1 (deterministic) created:",
      "  \u2022 Scaffold files (CLAUDE.md, AGENTS.md, decisions.md)",
      isClaudeCode ? "  \u2022 .claude/ structure (settings, agents, skills, commands)" : "",
      `  \u2022 ${builtinRules.length} compiled rules`,
      "",
      "Phase 2 (AI) customized:",
      "  \u2022 Project-specific CLAUDE.md content",
      "  \u2022 Specialist sub-agents based on stack",
      "  \u2022 Additional skills discovery"
    ].filter(Boolean).join("\n"),
    "Complete"
  );
  p5.outro("Run `agentinit validate` to re-check scaffold integrity.");
});
function findSpecFile(startDir) {
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    const candidate = join9(dir, "agentic-system-initializer.md");
    if (existsSync10(candidate)) return candidate;
    const parent = join9(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
function getDefaultProfile() {
  return {
    role: "senior",
    domain: "fullstack",
    expertise: [],
    workingStyle: "mixed",
    autonomy: "high",
    reviewStrictness: "balanced",
    securityStance: "standard",
    communication: "concise",
    preferences: []
  };
}

// src/commands/generate.ts
import { Command as Command4 } from "commander";
import * as p6 from "@clack/prompts";
import chalk5 from "chalk";
import { writeFileSync as writeFileSync6, existsSync as existsSync11 } from "fs";
import { join as join10, resolve } from "path";
var generateCommand = new Command4("generate").description("Generate a slimmed-down initialization prompt and optionally dispatch to agent").option("-a, --agent <agent>", "Target agent (claude-code, cursor, copilot, etc.)").option("-o, --output <file>", "Output file (default: dispatch to agent)").option("--clipboard", "Copy to clipboard instead of dispatching").option("--no-dispatch", "Print to stdout instead of launching agent").option("--spec <path>", "Path to agentic-system-initializer.md (uses CDN by default)").option("--offline", "Use cached/local sections only, skip CDN fetch").action(async (options) => {
  p6.intro(chalk5.bgCyan(" agentinit generate "));
  const targetDir = process.cwd();
  const profile = loadProfile(targetDir);
  if (!profile) {
    p6.log.warn("No profile found. Run `agentinit init` first (or `agentinit profile`).");
    p6.outro("");
    return;
  }
  const specPath = options.spec ?? findSpecFile2(targetDir);
  const useOffline = options.offline ?? false;
  let agent = options.agent;
  if (!agent) {
    const choice = await p6.select({
      message: "Which agent should this prompt target?",
      options: [
        { value: "claude-code", label: "Claude Code" },
        { value: "cursor", label: "Cursor" },
        { value: "codex", label: "Codex CLI" },
        { value: "copilot", label: "GitHub Copilot" },
        { value: "gemini-cli", label: "Gemini CLI" },
        { value: "cline", label: "Cline" },
        { value: "windsurf", label: "Windsurf" },
        { value: "roo-code", label: "Roo Code" },
        { value: "kilo-code", label: "Kilo Code" },
        { value: "aider", label: "Aider" },
        { value: "generic", label: "Generic / Other" }
      ]
    });
    if (p6.isCancel(choice)) process.exit(0);
    agent = choice;
  }
  const analysis = await analyzeProject(targetDir);
  const genOptions = {
    specPath: specPath ?? void 0,
    agent,
    profile,
    analysis,
    offline: useOffline
  };
  const spinner2 = p6.spinner();
  spinner2.start("Generating slimmed prompt...");
  const result = await generatePrompt(genOptions);
  spinner2.stop("Prompt generated");
  if (options.output) {
    const outPath = resolve(options.output);
    writeFileSync6(outPath, result);
    p6.log.success(`Written to ${outPath} (${result.length} chars)`);
  } else if (options.clipboard) {
    try {
      const { execSync: execSync2 } = await import("child_process");
      const cmd = process.platform === "darwin" ? "pbcopy" : "xclip -selection clipboard";
      execSync2(cmd, { input: result });
      p6.log.success("Copied to clipboard!");
    } catch {
      p6.log.warn("Clipboard copy failed. Printing to stdout instead.");
      console.log(result);
    }
  } else if (options.dispatch !== false && canDispatch(agent)) {
    const dispatchResult = await dispatchToAgent(agent, result, targetDir);
    if (dispatchResult.success) {
      p6.log.success(dispatchResult.message);
    } else {
      p6.log.warn(dispatchResult.message);
    }
  } else if (options.dispatch !== false) {
    const { mkdirSync: mkdirSync6 } = await import("fs");
    const tmpDir = join10(targetDir, ".agents", ".tmp");
    if (!existsSync11(tmpDir)) mkdirSync6(tmpDir, { recursive: true });
    const outFile = join10(tmpDir, `${agent}-init-prompt.md`);
    writeFileSync6(outFile, result);
    const instruction = getDispatchInstructions(agent, outFile);
    p6.log.info(`${chalk5.dim("\u2192")} ${instruction}`);
  } else {
    console.log(result);
  }
  p6.outro(
    `${chalk5.dim(`Lines: ${result.split("\n").length} | Agent: ${agent}`)}`
  );
});
function findSpecFile2(startDir) {
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    const candidate = join10(dir, "agentic-system-initializer.md");
    if (existsSync11(candidate)) return candidate;
    const parent = join10(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// src/commands/clear.ts
import { Command as Command5 } from "commander";
import * as p7 from "@clack/prompts";
import chalk6 from "chalk";
import { existsSync as existsSync12, rmSync as rmSync2, readdirSync as readdirSync3 } from "fs";
import { join as join11 } from "path";
var AGENT_GENERATED_PATHS = [
  // Shared
  ".agents",
  // Per-agent config files
  "CLAUDE.md",
  "AGENTS.md",
  "GEMINI.md",
  ".claude",
  ".cursor/rules/00-core.mdc",
  ".github/copilot-instructions.md",
  ".clinerules/00-core.md",
  ".windsurf/rules/general.md",
  ".roo/rules/00-core.md",
  ".kilocode/rules/00-core.md",
  ".aider/instructions.md"
];
var AGENT_DIRS_CLEANUP = [
  ".cursor/rules",
  ".cursor",
  ".clinerules",
  ".windsurf/rules",
  ".windsurf",
  ".roo/rules",
  ".roo",
  ".kilocode/rules",
  ".kilocode",
  ".aider",
  ".claude"
];
var clearCommand = new Command5("clear").description("Remove all agentinit-generated files and directories").argument("[directory]", "Target directory", ".").option("--force", "Skip confirmation prompt").action(async (directory, options) => {
  p7.intro(chalk6.bgCyan(" agentinit clear "));
  const targetDir = directory === "." ? process.cwd() : directory;
  const existing = AGENT_GENERATED_PATHS.filter(
    (p9) => existsSync12(join11(targetDir, p9))
  );
  if (existing.length === 0) {
    p7.log.info("Nothing to clear \u2014 no agentinit-generated files found.");
    p7.outro("");
    return;
  }
  p7.log.warn("The following will be removed:");
  for (const item of existing) {
    p7.log.message(`  ${chalk6.red("\u2715")} ${item}`);
  }
  if (!options.force) {
    const confirm3 = await p7.confirm({
      message: "This is irreversible. Proceed?"
    });
    if (p7.isCancel(confirm3) || !confirm3) {
      p7.log.info("Cancelled.");
      p7.outro("");
      return;
    }
  }
  let removed = 0;
  for (const item of existing) {
    const fullPath = join11(targetDir, item);
    try {
      rmSync2(fullPath, { recursive: true, force: true });
      removed++;
    } catch (err) {
      p7.log.warn(`Failed to remove ${item}: ${err}`);
    }
  }
  for (const dir of AGENT_DIRS_CLEANUP) {
    const fullPath = join11(targetDir, dir);
    if (existsSync12(fullPath)) {
      try {
        const contents = readdirSync3(fullPath);
        if (contents.length === 0) {
          rmSync2(fullPath, { recursive: true });
        }
      } catch {
      }
    }
  }
  p7.log.success(`Removed ${removed} item(s).`);
  p7.outro("Project cleared. Run `agentinit init` to start fresh.");
});

// src/commands/rules.ts
import { Command as Command6 } from "commander";
import * as p8 from "@clack/prompts";
import chalk7 from "chalk";
import { existsSync as existsSync13, mkdirSync as mkdirSync5, readFileSync as readFileSync9, readdirSync as readdirSync4, writeFileSync as writeFileSync7 } from "fs";
import { join as join12, basename as basename2, resolve as resolve2 } from "path";
var RULES_DIR = ".agents/rules";
var CUSTOM_DIR = join12(RULES_DIR, "custom");
function ensureDir3(dir) {
  if (!existsSync13(dir)) mkdirSync5(dir, { recursive: true });
}
function loadProjectRules(targetDir) {
  const rules = [];
  const customDir = join12(targetDir, CUSTOM_DIR);
  const builtinDir = join12(targetDir, RULES_DIR, "builtin");
  for (const dir of [builtinDir, customDir]) {
    if (!existsSync13(dir)) continue;
    for (const file of readdirSync4(dir)) {
      if (!file.endsWith(".md")) continue;
      const slug = basename2(file, ".md");
      const raw = readFileSync9(join12(dir, file), "utf-8");
      try {
        rules.push(parseRule(raw, slug, dir === builtinDir));
      } catch (err) {
        p8.log.warn(`Skipping invalid rule ${file}: ${err}`);
      }
    }
  }
  return rules;
}
function detectAgents2(targetDir) {
  const agents = [];
  const checks = [
    ["CLAUDE.md", "claude-code"],
    [".cursor/rules", "cursor"],
    [".github/copilot-instructions.md", "copilot"],
    [".clinerules", "cline"],
    [".windsurf/rules", "windsurf"],
    [".roo/rules", "roo-code"],
    [".kilocode/rules", "kilo-code"],
    ["GEMINI.md", "gemini-cli"],
    ["AGENTS.md", "codex"]
  ];
  for (const [path, agent] of checks) {
    if (existsSync13(join12(targetDir, path))) agents.push(agent);
  }
  return agents;
}
var addCommand = new Command6("add").description("Add a rule to the project").argument("[name]", "Built-in rule slug or path to custom rule file").option("--all", "Add all built-in rules").action(async (name, options) => {
  const targetDir = process.cwd();
  if (options.all) {
    const builtinDir = join12(targetDir, RULES_DIR, "builtin");
    ensureDir3(builtinDir);
    const builtins = loadBuiltinRules();
    for (const rule of builtins) {
      const dest = join12(builtinDir, `${rule.slug}.md`);
      if (existsSync13(dest)) {
        p8.log.warn(`  \u2298 ${rule.slug} (already exists)`);
        continue;
      }
      const content = getBuiltinRuleContent(rule.slug);
      if (!content) continue;
      writeFileSync7(dest, content);
      p8.log.success(`  \u2713 ${rule.slug}`);
    }
    p8.log.info(`Added ${builtins.length} built-in rules to ${RULES_DIR}/builtin/`);
    return;
  }
  if (!name) {
    const builtins = loadBuiltinRules();
    const choices = builtins.map((r) => ({
      value: r.slug,
      label: `${r.slug} \u2014 ${r.meta.title}`,
      hint: r.meta.impact ? `Impact: ${r.meta.impact}` : void 0
    }));
    const selected = await p8.multiselect({
      message: "Select rules to add:",
      options: choices
    });
    if (p8.isCancel(selected)) {
      p8.cancel("Cancelled");
      process.exit(0);
    }
    const builtinDir = join12(targetDir, RULES_DIR, "builtin");
    ensureDir3(builtinDir);
    for (const slug of selected) {
      const content = getBuiltinRuleContent(slug);
      if (!content) continue;
      const dest = join12(builtinDir, `${slug}.md`);
      writeFileSync7(dest, content);
      p8.log.success(`  \u2713 ${slug}`);
    }
    return;
  }
  if (BUILTIN_RULE_SLUGS.includes(name)) {
    const builtinDir = join12(targetDir, RULES_DIR, "builtin");
    ensureDir3(builtinDir);
    const dest = join12(builtinDir, `${name}.md`);
    if (existsSync13(dest)) {
      p8.log.warn(`Rule "${name}" already exists`);
      return;
    }
    const content = getBuiltinRuleContent(name);
    if (!content) {
      p8.log.error(`Could not load built-in rule: ${name}`);
      return;
    }
    writeFileSync7(dest, content);
    p8.log.success(`Added built-in rule: ${name}`);
    return;
  }
  const filePath = resolve2(name);
  if (existsSync13(filePath) && filePath.endsWith(".md")) {
    const customDir = join12(targetDir, CUSTOM_DIR);
    ensureDir3(customDir);
    const slug = basename2(filePath, ".md");
    const raw = readFileSync9(filePath, "utf-8");
    parseRule(raw, slug);
    const dest = join12(customDir, `${slug}.md`);
    writeFileSync7(dest, raw);
    p8.log.success(`Added custom rule: ${slug}`);
    return;
  }
  p8.log.error(`Unknown rule: "${name}". Use a built-in slug or path to a .md file.`);
  p8.log.info(`Available built-in rules: ${BUILTIN_RULE_SLUGS.join(", ")}`);
});
var listCommand = new Command6("list").description("List all rules in the project").action(async () => {
  const targetDir = process.cwd();
  const rules = loadProjectRules(targetDir);
  if (rules.length === 0) {
    p8.log.info("No rules found. Use `agentinit rules add` to add rules.");
    return;
  }
  p8.log.info(chalk7.bold(`
  Rules (${rules.length}):
`));
  for (const rule of rules) {
    const impact = rule.meta.impact ? chalk7.yellow(`[${rule.meta.impact}]`) : chalk7.gray("[\u2014]");
    const type = rule.builtin ? chalk7.blue("builtin") : chalk7.green("custom");
    const globs = rule.meta.globs?.length ? chalk7.gray(` (${rule.meta.globs.join(", ")})`) : "";
    const always = rule.meta.alwaysApply ? chalk7.cyan(" \u2605") : "";
    console.log(`  ${impact} ${rule.meta.title} ${type}${globs}${always}`);
  }
  console.log();
});
var compileCommand = new Command6("compile").description("Compile rules to agent-specific formats").option("--agent <agents...>", "Target specific agents (auto-detects if omitted)").option("--dry-run", "Show what would be written without writing").action(async (options) => {
  const targetDir = process.cwd();
  const rules = loadProjectRules(targetDir);
  if (rules.length === 0) {
    p8.log.warn("No rules found. Use `agentinit rules add` first.");
    return;
  }
  let agents;
  if (options.agent) {
    agents = options.agent;
  } else {
    agents = detectAgents2(targetDir);
    if (agents.length === 0) {
      p8.log.warn(
        "No agent configurations detected. Use --agent to specify targets."
      );
      return;
    }
  }
  p8.log.info(
    `Compiling ${rules.length} rule(s) for: ${agents.join(", ")}`
  );
  let totalWritten = 0;
  for (const agent of agents) {
    const compiled = compileRules(rules, agent);
    p8.log.step(chalk7.bold(`  ${agent} (${compiled.length} files)`));
    for (const file of compiled) {
      const fullPath = join12(targetDir, file.path);
      if (options.dryRun) {
        console.log(`    \u2192 ${file.path}`);
        continue;
      }
      ensureDir3(join12(fullPath, ".."));
      writeFileSync7(fullPath, file.content);
      console.log(`    \u2713 ${file.path}`);
      totalWritten++;
    }
  }
  if (!options.dryRun) {
    p8.log.success(`Compiled ${totalWritten} rule file(s)`);
  }
});
var rulesCommand = new Command6("rules").description("Manage project rules (add, list, compile)").addCommand(addCommand).addCommand(listCommand).addCommand(compileCommand);

// src/index.ts
var program = new Command7();
program.name("agentinit").description(
  "Initialize AI coding agent configurations \u2014 compile agentic-system-initializer into targeted, user-profiled scaffolds"
).version("0.1.0");
program.addCommand(initCommand);
program.addCommand(profileCommand);
program.addCommand(validateCommand);
program.addCommand(generateCommand);
program.addCommand(clearCommand);
program.addCommand(rulesCommand);
program.parse();
