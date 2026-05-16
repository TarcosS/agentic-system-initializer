import { existsSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import fg from "fast-glob";

export interface ProjectAnalysis {
  name: string;
  languages: string[];
  frameworks: string[];
  packageManager: "npm" | "yarn" | "pnpm" | "bun" | "pip" | "poetry" | "cargo" | "go" | "unknown";
  testFramework: string[];
  ci: string[];
  deployTarget: string[];
  hasDocker: boolean;
  hasTerraform: boolean;
  hasDatabase: boolean;
  monorepo: boolean;
  signals: string[];
}

export async function analyzeProject(targetDir: string): Promise<ProjectAnalysis> {
  const analysis: ProjectAnalysis = {
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
    signals: [],
  };

  // Detect languages
  const langIndicators: Record<string, string[]> = {
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
    Kotlin: ["build.gradle.kts"],
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

  // Detect package manager
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

  // Detect frameworks from package.json
  const pkgPath = join(targetDir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const fwMap: Record<string, string> = {
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
        typeorm: "TypeORM",
      };
      for (const [dep, fw] of Object.entries(fwMap)) {
        if (dep in allDeps && !analysis.frameworks.includes(fw)) {
          analysis.frameworks.push(fw);
        }
      }
      // Test frameworks
      const testMap: Record<string, string> = {
        jest: "Jest",
        vitest: "Vitest",
        mocha: "Mocha",
        "@testing-library/react": "Testing Library",
        cypress: "Cypress",
        playwright: "Playwright",
        "@playwright/test": "Playwright",
      };
      for (const [dep, tf] of Object.entries(testMap)) {
        if (dep in allDeps && !analysis.testFramework.includes(tf)) {
          analysis.testFramework.push(tf);
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  // Detect pyproject.toml frameworks
  if (existsSync(join(targetDir, "pyproject.toml"))) {
    const content = readFileSync(join(targetDir, "pyproject.toml"), "utf-8");
    if (content.includes("django")) analysis.frameworks.push("Django");
    if (content.includes("fastapi")) analysis.frameworks.push("FastAPI");
    if (content.includes("flask")) analysis.frameworks.push("Flask");
    if (content.includes("pytest")) analysis.testFramework.push("pytest");
  }

  // Docker
  analysis.hasDocker =
    existsSync(join(targetDir, "Dockerfile")) ||
    existsSync(join(targetDir, "docker-compose.yml")) ||
    existsSync(join(targetDir, "docker-compose.yaml"));

  // Terraform / IaC
  const tfFiles = await fg(["**/*.tf"], { cwd: targetDir, ignore: ["node_modules/**", ".git/**"] });
  analysis.hasTerraform = tfFiles.length > 0;

  // Database signals
  const dbSignals = ["prisma", "drizzle", "migrations", "schema.sql", "alembic"];
  const dbFiles = await fg(
    dbSignals.map((s) => `**/*${s}*`),
    { cwd: targetDir, ignore: ["node_modules/**", ".git/**"] }
  );
  analysis.hasDatabase = dbFiles.length > 0;

  // CI/CD
  if (existsSync(join(targetDir, ".github", "workflows"))) analysis.ci.push("GitHub Actions");
  if (existsSync(join(targetDir, ".gitlab-ci.yml"))) analysis.ci.push("GitLab CI");
  if (existsSync(join(targetDir, "Jenkinsfile"))) analysis.ci.push("Jenkins");
  if (existsSync(join(targetDir, ".circleci"))) analysis.ci.push("CircleCI");

  // Deploy targets
  if (existsSync(join(targetDir, "vercel.json")) || existsSync(join(targetDir, ".vercel")))
    analysis.deployTarget.push("Vercel");
  if (existsSync(join(targetDir, "netlify.toml"))) analysis.deployTarget.push("Netlify");
  if (existsSync(join(targetDir, "fly.toml"))) analysis.deployTarget.push("Fly.io");
  if (existsSync(join(targetDir, "railway.toml"))) analysis.deployTarget.push("Railway");
  if (existsSync(join(targetDir, "render.yaml"))) analysis.deployTarget.push("Render");
  if (analysis.hasTerraform) analysis.deployTarget.push("AWS/GCP/Azure (Terraform)");

  // Monorepo
  analysis.monorepo =
    existsSync(join(targetDir, "pnpm-workspace.yaml")) ||
    existsSync(join(targetDir, "lerna.json")) ||
    existsSync(join(targetDir, "nx.json")) ||
    existsSync(join(targetDir, "turbo.json"));

  // Collect signals (for routing)
  if (analysis.languages.length > 0) analysis.signals.push(...analysis.languages.map((l) => `lang:${l}`));
  if (analysis.frameworks.length > 0) analysis.signals.push(...analysis.frameworks.map((f) => `fw:${f}`));
  if (analysis.hasDocker) analysis.signals.push("docker");
  if (analysis.hasTerraform) analysis.signals.push("terraform");
  if (analysis.hasDatabase) analysis.signals.push("database");
  if (analysis.monorepo) analysis.signals.push("monorepo");
  if (analysis.ci.length > 0) analysis.signals.push("ci");

  return analysis;
}
