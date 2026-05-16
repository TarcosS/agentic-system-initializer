import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import type { AgentId } from "../utils/agent-selector.js";
import type { UserProfile } from "../commands/profile.js";
import { profileToMarkdown } from "../commands/profile.js";
import type { ProjectAnalysis } from "../analyzers/project.js";
import { loadTemplate, fillTemplate, buildTemplateVars } from "../utils/template-engine.js";

export interface ScaffoldOptions {
  targetDir: string;
  agents: AgentId[];
  profile: UserProfile;
  analysis: ProjectAnalysis;
  overwrite?: boolean;
}

export interface ScaffoldResult {
  created: string[];
  skipped: string[];
  errors: string[];
}

export function writeScaffold(options: ScaffoldOptions): ScaffoldResult {
  const { targetDir, agents, profile, analysis, overwrite = false } = options;
  const result: ScaffoldResult = { created: [], skipped: [], errors: [] };
  const vars = buildTemplateVars(profile, analysis);

  // 1. Create shared .agents directory
  ensureDir(join(targetDir, ".agents", "memory"));
  ensureDir(join(targetDir, ".agents", "instructions"));

  // 2. Write profile
  writeIfMissing(
    join(targetDir, ".agents", "profile.json"),
    JSON.stringify(profile, null, 2),
    result,
    overwrite
  );

  // 3. Write shared decisions.md
  const decisionsContent = buildDecisionsMd(analysis);
  writeIfMissing(
    join(targetDir, ".agents", "memory", "decisions.md"),
    decisionsContent,
    result,
    overwrite
  );

  // 4. Write shared instructions with user profile
  const sharedInstructions = buildSharedInstructions(profile, analysis);
  writeIfMissing(
    join(targetDir, ".agents", "instructions", "shared.md"),
    sharedInstructions,
    result,
    overwrite
  );

  // 5. Write agent-specific scaffolds from templates
  for (const agent of agents) {
    try {
      scaffoldAgent(targetDir, agent, vars, result, overwrite);
    } catch (err) {
      result.errors.push(`Failed to scaffold ${agent}: ${err}`);
    }
  }

  return result;
}

const AGENT_FILE_MAP: Record<AgentId, { path: string; templateName: string }> = {
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
  generic: { path: ".agents/instructions/agent.md", templateName: "generic.md" },
};

function scaffoldAgent(
  targetDir: string,
  agent: AgentId,
  vars: Record<string, string>,
  result: ScaffoldResult,
  overwrite: boolean
): void {
  const mapping = AGENT_FILE_MAP[agent];
  if (!mapping) return;

  const template = loadTemplate("agents", mapping.templateName);
  if (!template) {
    // Fallback to inline content if template not found
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
      "- Run tests before committing",
    ].join("\n");
    const filePath = join(targetDir, mapping.path);
    writeIfMissing(filePath, fallbackContent, result, overwrite);
    return;
  }

  const content = fillTemplate(template, vars);
  const filePath = join(targetDir, mapping.path);
  writeIfMissing(filePath, content, result, overwrite);
}

function buildDecisionsMd(analysis: ProjectAnalysis): string {
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
    "- (Define what agents should NOT do)",
  ].join("\n");
}

function buildSharedInstructions(profile: UserProfile, analysis: ProjectAnalysis): string {
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
    "4. Update decisions.md when making significant choices",
  ].join("\n");
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function writeIfMissing(
  filePath: string,
  content: string,
  result: ScaffoldResult,
  overwrite: boolean
): void {
  ensureDir(dirname(filePath));
  if (existsSync(filePath) && !overwrite) {
    result.skipped.push(filePath);
    return;
  }
  try {
    writeFileSync(filePath, content);
    result.created.push(filePath);
  } catch (err) {
    result.errors.push(`${filePath}: ${err}`);
  }
}
