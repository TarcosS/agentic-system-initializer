#!/usr/bin/env node

// src/index.ts
import { Command as Command5 } from "commander";

// src/commands/init.ts
import { Command as Command3 } from "commander";
import * as p4 from "@clack/prompts";
import chalk3 from "chalk";

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
  const role = await p.select({
    message: "What's your role and experience level?",
    options: [
      { value: "junior", label: "Junior Developer" },
      { value: "mid", label: "Mid-Level Developer" },
      { value: "senior", label: "Senior Developer" },
      { value: "lead", label: "Tech Lead / Architect" },
      { value: "solo", label: "Solo Founder / Indie" }
    ]
  });
  if (p.isCancel(role)) process.exit(0);
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
    placeholder: "e.g., React, Next.js, PostgreSQL, AWS"
  });
  if (p.isCancel(expertiseRaw)) process.exit(0);
  const expertise = expertiseRaw.split(",").map((s) => s.trim()).filter(Boolean);
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
  const preferences = prefsRaw.split(",").map((s) => s.trim()).filter(Boolean);
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
    message: "Which AI coding agents do you use? (select all that apply)",
    options: Object.entries(AGENT_LABELS).map(([value, label]) => ({
      value,
      label
    })),
    required: true
  });
  if (p2.isCancel(selected)) process.exit(0);
  return selected;
}

// src/generators/scaffold.ts
import { existsSync as existsSync4, mkdirSync, writeFileSync as writeFileSync2 } from "fs";
import { join as join4, dirname as dirname2 } from "path";

// src/utils/template-engine.ts
import { readFileSync as readFileSync3, existsSync as existsSync3 } from "fs";
import { join as join3, dirname } from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
function getTemplatesDir() {
  const srcTemplates = join3(__dirname, "..", "templates");
  if (existsSync3(srcTemplates)) return srcTemplates;
  const pkgTemplates = join3(__dirname, "..", "src", "templates");
  if (existsSync3(pkgTemplates)) return pkgTemplates;
  return join3(process.cwd(), "node_modules", "@deopca", "agentinit", "templates");
}
function loadTemplate(category, name) {
  const dir = getTemplatesDir();
  const filePath = join3(dir, category, name);
  if (existsSync3(filePath)) {
    return readFileSync3(filePath, "utf-8");
  }
  for (const ext of [".md", ".mdc"]) {
    const withExt = join3(dir, category, name + ext);
    if (existsSync3(withExt)) return readFileSync3(withExt, "utf-8");
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
    preferences: profile.preferences.length > 0 ? profile.preferences.map((p6) => `- ${p6}`).join("\n") : "- (none yet)",
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
  ensureDir(join4(targetDir, ".agents", "memory"));
  ensureDir(join4(targetDir, ".agents", "instructions"));
  writeIfMissing(
    join4(targetDir, ".agents", "profile.json"),
    JSON.stringify(profile, null, 2),
    result,
    overwrite
  );
  const decisionsContent = buildDecisionsMd(analysis);
  writeIfMissing(
    join4(targetDir, ".agents", "memory", "decisions.md"),
    decisionsContent,
    result,
    overwrite
  );
  const sharedInstructions = buildSharedInstructions(profile, analysis);
  writeIfMissing(
    join4(targetDir, ".agents", "instructions", "shared.md"),
    sharedInstructions,
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
    const filePath2 = join4(targetDir, mapping.path);
    writeIfMissing(filePath2, fallbackContent, result, overwrite);
    return;
  }
  const content = fillTemplate(template, vars);
  const filePath = join4(targetDir, mapping.path);
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
  if (!existsSync4(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
function writeIfMissing(filePath, content, result, overwrite) {
  ensureDir(dirname2(filePath));
  if (existsSync4(filePath) && !overwrite) {
    result.skipped.push(filePath);
    return;
  }
  try {
    writeFileSync2(filePath, content);
    result.created.push(filePath);
  } catch (err) {
    result.errors.push(`${filePath}: ${err}`);
  }
}

// src/commands/validate.ts
import { Command as Command2 } from "commander";
import * as p3 from "@clack/prompts";
import chalk2 from "chalk";
import { existsSync as existsSync5, readFileSync as readFileSync4 } from "fs";
import { join as join5 } from "path";
import fg2 from "fast-glob";
var AGENT_PATHS = {
  "claude-code": ["CLAUDE.md", ".claude/settings.json", ".claude/mcp.json"],
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
    if (existsSync5(join5(targetDir, file))) {
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
      if (existsSync5(join5(targetDir, filePath))) {
        passed++;
      } else {
        issues.push(`Missing ${agent} file: ${filePath}`);
      }
    }
  }
  const mdFiles = await fg2(["**/*.md", "**/*.mdc"], {
    cwd: targetDir,
    ignore: ["node_modules/**", ".git/**"],
    absolute: true
  });
  for (const file of mdFiles) {
    const content = readFileSync4(file, "utf-8");
    const placeholders = content.match(/<[a-z][a-z\s\-]*>/g);
    if (placeholders && placeholders.length > 0) {
      const relativePath = file.replace(targetDir + "/", "");
      const unique = [...new Set(placeholders)].slice(0, 3);
      issues.push(
        `Unfilled placeholder(s) in ${relativePath}: ${unique.join(", ")}${placeholders.length > 3 ? ` (+${placeholders.length - 3} more)` : ""}`
      );
    }
  }
  total++;
  if (existsSync5(join5(targetDir, "skills-lock.json"))) {
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
  const hasMemory = memoryPaths.some((p6) => existsSync5(join5(targetDir, p6)));
  if (hasMemory) {
    passed++;
  } else {
    issues.push("No decisions.md found in any memory path");
  }
  return { issues, passed, total };
}
function detectAgents(targetDir) {
  const detected = [];
  if (existsSync5(join5(targetDir, ".claude"))) detected.push("claude-code");
  if (existsSync5(join5(targetDir, ".cursor"))) detected.push("cursor");
  if (existsSync5(join5(targetDir, ".codex"))) detected.push("codex");
  if (existsSync5(join5(targetDir, ".github", "copilot-instructions.md")))
    detected.push("copilot");
  if (existsSync5(join5(targetDir, "GEMINI.md"))) detected.push("gemini-cli");
  if (existsSync5(join5(targetDir, ".clinerules"))) detected.push("cline");
  if (existsSync5(join5(targetDir, ".windsurf"))) detected.push("windsurf");
  if (existsSync5(join5(targetDir, ".roo"))) detected.push("roo-code");
  if (existsSync5(join5(targetDir, ".kilocode"))) detected.push("kilo-code");
  return detected;
}
var validateCommand = new Command2("validate").description("Health-check: verify scaffold integrity, find unfilled placeholders").argument("[directory]", "Target directory", ".").action(async (directory) => {
  p3.intro(chalk2.bgCyan(" agentinit validate "));
  const targetDir = directory === "." ? process.cwd() : directory;
  const agents = detectAgents(targetDir);
  if (agents.length === 0) {
    p3.log.warn("No agent scaffold detected. Run `agentinit init` first.");
    p3.outro("");
    return;
  }
  p3.log.info(`Detected agents: ${agents.join(", ")}`);
  const result = await validate(targetDir, agents);
  if (result.issues.length === 0) {
    p3.log.success(`All checks passed (${result.passed}/${result.total}) \u2713`);
  } else {
    p3.log.warn(`${result.issues.length} issue(s) found:`);
    for (const issue of result.issues) {
      p3.log.message(`  ${chalk2.yellow("!")} ${issue}`);
    }
    p3.log.info(`Passed: ${result.passed}/${result.total}`);
  }
  p3.outro("");
});

// src/commands/init.ts
var initCommand = new Command3("init").description("Initialize agent configuration: profile + agent selection + scaffold").argument("[directory]", "Target directory", ".").option("--agent <agents...>", "Pre-select agent(s) to skip interactive selection").option("--skip-profile", "Use default profile (senior, high autonomy)").option("--dry-run", "Show what would be created without writing files").action(async (directory, options) => {
  p4.intro(chalk3.bgCyan(" agentinit "));
  const targetDir = directory === "." ? process.cwd() : directory;
  p4.log.step("Step 0: Analyzing project...");
  const analysis = await analyzeProject(targetDir);
  p4.log.success(
    `Detected: ${analysis.languages.join(", ") || "unknown"} / ${analysis.frameworks.join(", ") || "no framework"} / ${analysis.packageManager}`
  );
  let profile;
  if (options.skipProfile) {
    profile = getDefaultProfile();
    p4.log.info("Using default profile (senior, high autonomy, balanced strictness)");
  } else {
    p4.log.step("Step 0b: Building your developer profile...");
    profile = await collectProfile();
  }
  let agents;
  if (options.agent) {
    agents = options.agent;
  } else {
    agents = await selectAgents();
  }
  p4.log.success(`Selected agent(s): ${agents.join(", ")}`);
  if (options.dryRun) {
    p4.log.info("Dry run \u2014 would scaffold for: " + agents.join(", "));
    p4.outro("Dry run complete. No files written.");
    return;
  }
  p4.log.step("Writing scaffold files...");
  const result = writeScaffold({ targetDir, agents, profile, analysis });
  p4.log.success(`Created ${result.created.length} files`);
  if (result.skipped.length > 0) {
    p4.log.info(`Skipped ${result.skipped.length} existing files`);
  }
  p4.log.step("Validating scaffold...");
  const validation = await validate(targetDir, agents.map(String));
  if (validation.issues.length === 0) {
    p4.log.success("Validation passed \u2713");
  } else {
    p4.log.warn(`Validation: ${validation.issues.length} issue(s) found`);
    for (const issue of validation.issues) {
      p4.log.message(`  ${chalk3.yellow("!")} ${issue}`);
    }
  }
  p4.note(
    [
      `Agent(s): ${agents.join(", ")}`,
      `Profile: ${profile.role} / ${profile.domain} / autonomy=${profile.autonomy}`,
      `Files created: ${result.created.length}`,
      "",
      "Next steps:",
      "  1. Feed the generated prompt to your agent (use `agentinit generate`)",
      "  2. Run: npx skills add vercel-labs/skills --skill find-skills -y",
      "  3. Run: agentinit validate"
    ].join("\n"),
    "Initialization complete"
  );
  p4.outro("Done! Run `agentinit validate` anytime to health-check your scaffold.");
});
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
import * as p5 from "@clack/prompts";
import chalk4 from "chalk";
import { writeFileSync as writeFileSync3, existsSync as existsSync6 } from "fs";
import { join as join6, resolve } from "path";

// src/generators/prompt.ts
import { readFileSync as readFileSync5 } from "fs";
function generatePrompt(options) {
  const { specPath, agent, profile, analysis } = options;
  const spec = readFileSync5(specPath, "utf-8");
  const lines = spec.split("\n");
  const sections = [];
  sections.push(buildHeader(agent, analysis));
  sections.push(profileToMarkdown(profile));
  const agentSection = extractAgentSection(lines, agent);
  if (agentSection) {
    sections.push(agentSection);
  }
  const universalBlocks = extractUniversalBlocks(lines, analysis);
  sections.push(universalBlocks);
  sections.push(buildAnalysisSummary(analysis));
  return sections.join("\n\n---\n\n");
}
function buildHeader(agent, analysis) {
  return [
    "# Agentic System Initialization Prompt",
    "",
    `> Generated by \`agentinit\` for **${agent}**`,
    `> Project: ${analysis.name}`,
    `> Stack: ${[...analysis.languages, ...analysis.frameworks].join(", ") || "unknown"}`,
    "",
    "Use this prompt to initialize your AI coding agent with project-specific context.",
    "Feed this entire document to your agent at session start."
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
function extractUniversalBlocks(lines, _analysis) {
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

// src/commands/generate.ts
var generateCommand = new Command4("generate").description("Generate a slimmed-down initialization prompt for a specific agent").option("-a, --agent <agent>", "Target agent (claude-code, cursor, copilot, etc.)").option("-o, --output <file>", "Output file (default: stdout)").option("--clipboard", "Copy to clipboard instead of printing").option("--spec <path>", "Path to agentic-system-initializer.md").action(async (options) => {
  p5.intro(chalk4.bgCyan(" agentinit generate "));
  const targetDir = process.cwd();
  const profile = loadProfile(targetDir);
  if (!profile) {
    p5.log.warn("No profile found. Run `agentinit init` first (or `agentinit profile`).");
    p5.outro("");
    return;
  }
  const specPath = options.spec ?? findSpecFile(targetDir);
  if (!specPath || !existsSync6(specPath)) {
    p5.log.error(
      "Cannot find agentic-system-initializer.md. Use --spec to provide path."
    );
    p5.outro("");
    return;
  }
  let agent = options.agent;
  if (!agent) {
    const choice = await p5.select({
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
    if (p5.isCancel(choice)) process.exit(0);
    agent = choice;
  }
  const analysis = await analyzeProject(targetDir);
  const genOptions = {
    specPath,
    agent,
    profile,
    analysis
  };
  const spinner2 = p5.spinner();
  spinner2.start("Generating slimmed prompt...");
  const result = generatePrompt(genOptions);
  spinner2.stop("Prompt generated");
  if (options.output) {
    const outPath = resolve(options.output);
    writeFileSync3(outPath, result);
    p5.log.success(`Written to ${outPath} (${result.length} chars)`);
  } else if (options.clipboard) {
    try {
      const { execSync } = await import("child_process");
      const cmd = process.platform === "darwin" ? "pbcopy" : "xclip -selection clipboard";
      execSync(cmd, { input: result });
      p5.log.success("Copied to clipboard!");
    } catch {
      p5.log.warn("Clipboard copy failed. Printing to stdout instead.");
      console.log(result);
    }
  } else {
    console.log(result);
  }
  p5.outro(
    `${chalk4.dim(`Lines: ${result.split("\n").length} | Agent: ${agent}`)}`
  );
});
function findSpecFile(startDir) {
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    const candidate = join6(dir, "agentic-system-initializer.md");
    if (existsSync6(candidate)) return candidate;
    const parent = join6(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// src/index.ts
var program = new Command5();
program.name("agentinit").description(
  "Initialize AI coding agent configurations \u2014 compile agentic-system-initializer into targeted, user-profiled scaffolds"
).version("0.1.0");
program.addCommand(initCommand);
program.addCommand(profileCommand);
program.addCommand(validateCommand);
program.addCommand(generateCommand);
program.parse();
