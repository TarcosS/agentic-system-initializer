#!/usr/bin/env node

// src/index.ts
import { Command as Command6 } from "commander";

// src/commands/init.ts
import { Command as Command2 } from "commander";
import * as p4 from "@clack/prompts";
import chalk3 from "chalk";
import { existsSync as existsSync4 } from "fs";
import { join as join4 } from "path";

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
import { readFileSync as readFileSync3 } from "fs";
function generatePrompt(options) {
  const { specPath, agent, profile, analysis } = options;
  const spec = readFileSync3(specPath, "utf-8");
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

// src/utils/dispatch.ts
import { execSync, spawn } from "child_process";
import { writeFileSync as writeFileSync2, mkdirSync, existsSync as existsSync3, createReadStream } from "fs";
import { join as join3 } from "path";
import * as p3 from "@clack/prompts";
import chalk2 from "chalk";
var DISPATCH_MAP = {
  "claude-code": {
    command: "claude",
    args: (_promptFile, _cwd) => ["-p", "--verbose"],
    useStdinPipe: true,
    // pipe prompt via stdin for streaming
    needsFile: true,
    checkBinary: "claude"
  },
  codex: {
    command: "codex",
    args: (promptFile, _cwd) => ["--prompt-file", promptFile],
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
    args: (promptFile, _cwd) => ["--message-file", promptFile],
    useStdinPipe: false,
    needsFile: true,
    checkBinary: "aider"
  },
  copilot: {
    command: "copilot",
    args: (_promptFile, _cwd) => ["-p"],
    useStdinPipe: true,
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
    p3.log.info(`Running: cat ${promptFile} | ${config.command} ${args.join(" ")}`);
  } else {
    p3.log.info(`Running: ${config.command} ${args.join(" ")}`);
  }
  return new Promise((resolve2) => {
    const stdinMode = config.useStdinPipe ? "pipe" : "inherit";
    const child = spawn(config.command, args, {
      cwd,
      stdio: [stdinMode, "inherit", "inherit"],
      env: { ...process.env }
    });
    if (config.useStdinPipe && child.stdin) {
      const fileStream = createReadStream(promptFile);
      fileStream.pipe(child.stdin);
    }
    child.on("close", (code) => {
      if (code === 0) {
        resolve2({
          success: true,
          method: "cli",
          message: `${agent} completed successfully`
        });
      } else {
        resolve2({
          success: false,
          method: "cli",
          message: `${agent} exited with code ${code}`
        });
      }
    });
    child.on("error", (err) => {
      resolve2({
        success: false,
        method: "cli",
        message: `Failed to launch ${config.command}: ${err.message}`
      });
    });
  });
}
function writePromptToTempFile(prompt, cwd) {
  const dir = join3(cwd, ".agents", ".tmp");
  if (!existsSync3(dir)) mkdirSync(dir, { recursive: true });
  const filePath = join3(dir, "init-prompt.md");
  writeFileSync2(filePath, prompt);
  return filePath;
}
function writePromptFile(agent, prompt, cwd) {
  const dir = join3(cwd, ".agents", ".tmp");
  if (!existsSync3(dir)) mkdirSync(dir, { recursive: true });
  const filePath = join3(dir, `${agent}-init-prompt.md`);
  writeFileSync2(filePath, prompt);
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

// src/commands/init.ts
var initCommand = new Command2("init").description("Analyze project, build profile, generate prompt, and dispatch to agent").argument("[directory]", "Target directory", ".").option("--agent <agents...>", "Pre-select agent(s) to skip interactive selection").option("--skip-profile", "Use default profile (senior, high autonomy)").option("--no-dispatch", "Generate prompt file only, don't launch agent").option("--spec <path>", "Path to agentic-system-initializer.md").action(async (directory, options) => {
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
  const agentsDir = join4(targetDir, ".agents");
  if (!existsSync4(agentsDir)) {
    const { mkdirSync: mkdirSync2 } = await import("fs");
    mkdirSync2(agentsDir, { recursive: true });
  }
  saveProfile(targetDir, profile);
  let agents;
  if (options.agent) {
    agents = options.agent;
  } else {
    agents = await selectAgents();
  }
  p4.log.success(`Selected agent(s): ${agents.join(", ")}`);
  const specPath = options.spec ?? findSpecFile(targetDir);
  if (!specPath || !existsSync4(specPath)) {
    p4.log.error(
      "Cannot find agentic-system-initializer.md. Use --spec to provide path."
    );
    p4.outro("");
    return;
  }
  for (const agent of agents) {
    p4.log.step(`Generating prompt for ${chalk3.bold(agent)}...`);
    const prompt = generatePrompt({
      specPath,
      agent,
      profile,
      analysis
    });
    p4.log.success(`Prompt ready (${prompt.split("\n").length} lines)`);
    if (options.dispatch === false) {
      const { writeFileSync: writeFileSync4, mkdirSync: mkdirSync2 } = await import("fs");
      const tmpDir = join4(targetDir, ".agents", ".tmp");
      if (!existsSync4(tmpDir)) mkdirSync2(tmpDir, { recursive: true });
      const outFile = join4(tmpDir, `${agent}-init-prompt.md`);
      writeFileSync4(outFile, prompt);
      p4.log.info(`Written to: ${outFile}`);
      continue;
    }
    if (canDispatch(agent)) {
      const result = await dispatchToAgent(agent, prompt, targetDir);
      if (result.success && result.method === "cli") {
        p4.log.success(result.message);
      } else if (result.method === "file") {
        p4.log.info(result.message);
      } else {
        p4.log.warn(result.message);
      }
    } else if (isIdeAgent(agent)) {
      const { writeFileSync: writeFileSync4, mkdirSync: mkdirSync2 } = await import("fs");
      const tmpDir = join4(targetDir, ".agents", ".tmp");
      if (!existsSync4(tmpDir)) mkdirSync2(tmpDir, { recursive: true });
      const outFile = join4(tmpDir, `${agent}-init-prompt.md`);
      writeFileSync4(outFile, prompt);
      const instruction = getDispatchInstructions(agent, outFile);
      p4.log.info(`${chalk3.dim("\u2192")} ${instruction}`);
    }
  }
  p4.note(
    [
      `Agent(s): ${agents.join(", ")}`,
      `Profile: ${profile.role} / ${profile.domain} / autonomy=${profile.autonomy}`,
      `Spec: ${specPath}`,
      "",
      "The agent will now:",
      "  1. Read your project structure",
      "  2. Install relevant skills (npx skills add ...)",
      "  3. Generate config files + custom agents",
      "  4. Write decisions.md and scaffold"
    ].join("\n"),
    "Dispatched"
  );
  p4.outro("Run `agentinit validate` after the agent finishes to verify the scaffold.");
});
function findSpecFile(startDir) {
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    const candidate = join4(dir, "agentic-system-initializer.md");
    if (existsSync4(candidate)) return candidate;
    const parent = join4(dir, "..");
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

// src/commands/validate.ts
import { Command as Command3 } from "commander";
import * as p5 from "@clack/prompts";
import chalk4 from "chalk";
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
  const hasMemory = memoryPaths.some((p8) => existsSync5(join5(targetDir, p8)));
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
var validateCommand = new Command3("validate").description("Health-check: verify scaffold integrity, find unfilled placeholders").argument("[directory]", "Target directory", ".").action(async (directory) => {
  p5.intro(chalk4.bgCyan(" agentinit validate "));
  const targetDir = directory === "." ? process.cwd() : directory;
  const agents = detectAgents(targetDir);
  if (agents.length === 0) {
    p5.log.warn("No agent scaffold detected. Run `agentinit init` first.");
    p5.outro("");
    return;
  }
  p5.log.info(`Detected agents: ${agents.join(", ")}`);
  const result = await validate(targetDir, agents);
  if (result.issues.length === 0) {
    p5.log.success(`All checks passed (${result.passed}/${result.total}) \u2713`);
  } else {
    p5.log.warn(`${result.issues.length} issue(s) found:`);
    for (const issue of result.issues) {
      p5.log.message(`  ${chalk4.yellow("!")} ${issue}`);
    }
    p5.log.info(`Passed: ${result.passed}/${result.total}`);
  }
  p5.outro("");
});

// src/commands/generate.ts
import { Command as Command4 } from "commander";
import * as p6 from "@clack/prompts";
import chalk5 from "chalk";
import { writeFileSync as writeFileSync3, existsSync as existsSync6 } from "fs";
import { join as join6, resolve } from "path";
var generateCommand = new Command4("generate").description("Generate a slimmed-down initialization prompt and optionally dispatch to agent").option("-a, --agent <agent>", "Target agent (claude-code, cursor, copilot, etc.)").option("-o, --output <file>", "Output file (default: dispatch to agent)").option("--clipboard", "Copy to clipboard instead of dispatching").option("--no-dispatch", "Print to stdout instead of launching agent").option("--spec <path>", "Path to agentic-system-initializer.md").action(async (options) => {
  p6.intro(chalk5.bgCyan(" agentinit generate "));
  const targetDir = process.cwd();
  const profile = loadProfile(targetDir);
  if (!profile) {
    p6.log.warn("No profile found. Run `agentinit init` first (or `agentinit profile`).");
    p6.outro("");
    return;
  }
  const specPath = options.spec ?? findSpecFile2(targetDir);
  if (!specPath || !existsSync6(specPath)) {
    p6.log.error(
      "Cannot find agentic-system-initializer.md. Use --spec to provide path."
    );
    p6.outro("");
    return;
  }
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
    specPath,
    agent,
    profile,
    analysis
  };
  const spinner2 = p6.spinner();
  spinner2.start("Generating slimmed prompt...");
  const result = generatePrompt(genOptions);
  spinner2.stop("Prompt generated");
  if (options.output) {
    const outPath = resolve(options.output);
    writeFileSync3(outPath, result);
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
    const { mkdirSync: mkdirSync2 } = await import("fs");
    const tmpDir = join6(targetDir, ".agents", ".tmp");
    if (!existsSync6(tmpDir)) mkdirSync2(tmpDir, { recursive: true });
    const outFile = join6(tmpDir, `${agent}-init-prompt.md`);
    writeFileSync3(outFile, result);
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
    const candidate = join6(dir, "agentic-system-initializer.md");
    if (existsSync6(candidate)) return candidate;
    const parent = join6(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// src/commands/clear.ts
import { Command as Command5 } from "commander";
import * as p7 from "@clack/prompts";
import chalk6 from "chalk";
import { existsSync as existsSync7, rmSync, readdirSync } from "fs";
import { join as join7 } from "path";
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
    (p8) => existsSync7(join7(targetDir, p8))
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
    const fullPath = join7(targetDir, item);
    try {
      rmSync(fullPath, { recursive: true, force: true });
      removed++;
    } catch (err) {
      p7.log.warn(`Failed to remove ${item}: ${err}`);
    }
  }
  for (const dir of AGENT_DIRS_CLEANUP) {
    const fullPath = join7(targetDir, dir);
    if (existsSync7(fullPath)) {
      try {
        const contents = readdirSync(fullPath);
        if (contents.length === 0) {
          rmSync(fullPath, { recursive: true });
        }
      } catch {
      }
    }
  }
  p7.log.success(`Removed ${removed} item(s).`);
  p7.outro("Project cleared. Run `agentinit init` to start fresh.");
});

// src/index.ts
var program = new Command6();
program.name("agentinit").description(
  "Initialize AI coding agent configurations \u2014 compile agentic-system-initializer into targeted, user-profiled scaffolds"
).version("0.1.0");
program.addCommand(initCommand);
program.addCommand(profileCommand);
program.addCommand(validateCommand);
program.addCommand(generateCommand);
program.addCommand(clearCommand);
program.parse();
