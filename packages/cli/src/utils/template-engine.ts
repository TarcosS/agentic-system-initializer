import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { UserProfile } from "../commands/profile.js";
import type { ProjectAnalysis } from "../analyzers/project.js";
import { profileToMarkdown } from "../commands/profile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In bundled output, templates are at ../src/templates relative to dist/
// In dev mode, they're at ../templates relative to this file's source location.
function getTemplatesDir(): string {
  // Try source layout first (dev / unbundled)
  const srcTemplates = join(__dirname, "..", "templates");
  if (existsSync(srcTemplates)) return srcTemplates;
  // Fallback: sibling to dist (npm package layout)
  const pkgTemplates = join(__dirname, "..", "src", "templates");
  if (existsSync(pkgTemplates)) return pkgTemplates;
  // Last resort: relative to cwd
  return join(process.cwd(), "node_modules", "@deopca", "agentinit", "templates");
}

function loadTemplate(category: string, name: string): string | null {
  const dir = getTemplatesDir();
  const filePath = join(dir, category, name);
  if (existsSync(filePath)) {
    return readFileSync(filePath, "utf-8");
  }
  // Try with common extensions
  for (const ext of [".md", ".mdc"]) {
    const withExt = join(dir, category, name + ext);
    if (existsSync(withExt)) return readFileSync(withExt, "utf-8");
  }
  return null;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export function buildTemplateVars(profile: UserProfile, analysis: ProjectAnalysis): Record<string, string> {
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
    preferences: profile.preferences.length > 0
      ? profile.preferences.map((p) => `- ${p}`).join("\n")
      : "- (none yet)",
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
    upcomingWork: "{{upcomingWork}}",
  };
}

function guessTestCommand(analysis: ProjectAnalysis): string {
  if (analysis.testFramework.includes("Vitest")) return `${analysis.packageManager} run test`;
  if (analysis.testFramework.includes("Jest")) return `${analysis.packageManager} run test`;
  if (analysis.testFramework.includes("pytest")) return "pytest";
  if (analysis.packageManager === "cargo") return "cargo test";
  if (analysis.packageManager === "go") return "go test ./...";
  return `${analysis.packageManager !== "unknown" ? analysis.packageManager : "npm"} run test`;
}

function guessLintCommand(analysis: ProjectAnalysis): string {
  if (["npm", "yarn", "pnpm", "bun"].includes(analysis.packageManager)) {
    return `${analysis.packageManager} run lint`;
  }
  if (analysis.packageManager === "cargo") return "cargo clippy";
  if (analysis.packageManager === "go") return "golangci-lint run";
  return "npm run lint";
}

function guessLockFile(analysis: ProjectAnalysis): string {
  const map: Record<string, string> = {
    npm: "package-lock.json",
    yarn: "yarn.lock",
    pnpm: "pnpm-lock.yaml",
    bun: "bun.lockb",
    pip: "requirements.txt",
    poetry: "poetry.lock",
    cargo: "Cargo.lock",
    go: "go.sum",
  };
  return map[analysis.packageManager] || "unknown";
}

export { loadTemplate, fillTemplate, getTemplatesDir };
