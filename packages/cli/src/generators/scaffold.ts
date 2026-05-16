import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import type { AgentId } from "../utils/agent-selector.js";
import type { UserProfile } from "../commands/profile.js";
import { profileToMarkdown } from "../commands/profile.js";
import type { ProjectAnalysis } from "../analyzers/project.js";

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

  // 5. Write agent-specific scaffolds
  for (const agent of agents) {
    try {
      scaffoldAgent(targetDir, agent, profile, analysis, result, overwrite);
    } catch (err) {
      result.errors.push(`Failed to scaffold ${agent}: ${err}`);
    }
  }

  return result;
}

function scaffoldAgent(
  targetDir: string,
  agent: AgentId,
  profile: UserProfile,
  analysis: ProjectAnalysis,
  result: ScaffoldResult,
  overwrite: boolean
): void {
  const profileMd = profileToMarkdown(profile);

  switch (agent) {
    case "claude-code": {
      const content = [
        "# CLAUDE.md",
        "",
        profileMd,
        "",
        "## Project context",
        "",
        `This is a ${analysis.languages.join("/")} project using ${analysis.frameworks.join(", ") || "standard tooling"}.`,
        "",
        "## Rules",
        "",
        "- Read .agents/memory/decisions.md before making architectural choices",
        "- Follow existing patterns in the codebase",
        "- Run tests before committing",
        "",
        "## Memory",
        "",
        "See .agents/memory/decisions.md for project decisions and context.",
      ].join("\n");
      writeIfMissing(join(targetDir, "CLAUDE.md"), content, result, overwrite);
      ensureDir(join(targetDir, ".claude"));
      break;
    }

    case "cursor": {
      ensureDir(join(targetDir, ".cursor", "rules"));
      const content = [
        "---",
        "description: Core project rules",
        "globs: **/*",
        "---",
        "",
        profileMd,
        "",
        "## Project context",
        "",
        `This is a ${analysis.languages.join("/")} project using ${analysis.frameworks.join(", ") || "standard tooling"}.`,
        "",
        "## Rules",
        "",
        "- Read .agents/memory/decisions.md before making architectural choices",
        "- Follow existing patterns in the codebase",
        "- Run tests before committing",
      ].join("\n");
      writeIfMissing(join(targetDir, ".cursor", "rules", "00-core.mdc"), content, result, overwrite);
      break;
    }

    case "codex": {
      const content = [
        "# AGENTS.md",
        "",
        profileMd,
        "",
        "## Project context",
        "",
        `This is a ${analysis.languages.join("/")} project using ${analysis.frameworks.join(", ") || "standard tooling"}.`,
        "",
        "## Instructions",
        "",
        "- Read .agents/memory/decisions.md before making architectural choices",
        "- Follow existing patterns in the codebase",
        "- Run tests before committing",
      ].join("\n");
      writeIfMissing(join(targetDir, "AGENTS.md"), content, result, overwrite);
      break;
    }

    case "copilot": {
      ensureDir(join(targetDir, ".github"));
      const content = [
        "# Copilot Instructions",
        "",
        profileMd,
        "",
        "## Project context",
        "",
        `This is a ${analysis.languages.join("/")} project using ${analysis.frameworks.join(", ") || "standard tooling"}.`,
        "",
        "## Rules",
        "",
        "- Read .agents/memory/decisions.md before making architectural choices",
        "- Follow existing patterns in the codebase",
        "- Run tests before committing",
      ].join("\n");
      writeIfMissing(join(targetDir, ".github", "copilot-instructions.md"), content, result, overwrite);
      break;
    }

    case "gemini-cli": {
      const content = [
        "# GEMINI.md",
        "",
        profileMd,
        "",
        "## Project context",
        "",
        `This is a ${analysis.languages.join("/")} project using ${analysis.frameworks.join(", ") || "standard tooling"}.`,
        "",
        "## Rules",
        "",
        "- Read .agents/memory/decisions.md before making architectural choices",
        "- Follow existing patterns in the codebase",
        "- Run tests before committing",
      ].join("\n");
      writeIfMissing(join(targetDir, "GEMINI.md"), content, result, overwrite);
      break;
    }

    case "cline": {
      ensureDir(join(targetDir, ".clinerules"));
      const content = [
        profileMd,
        "",
        "## Project context",
        "",
        `This is a ${analysis.languages.join("/")} project using ${analysis.frameworks.join(", ") || "standard tooling"}.`,
        "",
        "## Rules",
        "",
        "- Read .agents/memory/decisions.md before making architectural choices",
        "- Follow existing patterns in the codebase",
        "- Run tests before committing",
      ].join("\n");
      writeIfMissing(join(targetDir, ".clinerules", "00-core.md"), content, result, overwrite);
      break;
    }

    case "windsurf": {
      ensureDir(join(targetDir, ".windsurf", "rules"));
      const content = [
        "---",
        "trigger: always",
        "---",
        "",
        profileMd,
        "",
        "## Project context",
        "",
        `This is a ${analysis.languages.join("/")} project using ${analysis.frameworks.join(", ") || "standard tooling"}.`,
        "",
        "## Rules",
        "",
        "- Read .agents/memory/decisions.md before making architectural choices",
        "- Follow existing patterns in the codebase",
        "- Run tests before committing",
      ].join("\n");
      writeIfMissing(join(targetDir, ".windsurf", "rules", "general.md"), content, result, overwrite);
      break;
    }

    case "roo-code": {
      ensureDir(join(targetDir, ".roo", "rules"));
      const content = [
        profileMd,
        "",
        "## Project context",
        "",
        `This is a ${analysis.languages.join("/")} project using ${analysis.frameworks.join(", ") || "standard tooling"}.`,
        "",
        "## Rules",
        "",
        "- Read .agents/memory/decisions.md before making architectural choices",
        "- Follow existing patterns in the codebase",
      ].join("\n");
      writeIfMissing(join(targetDir, ".roo", "rules", "00-core.md"), content, result, overwrite);
      break;
    }

    case "kilo-code": {
      ensureDir(join(targetDir, ".kilocode", "rules"));
      const content = [
        profileMd,
        "",
        "## Project context",
        "",
        `This is a ${analysis.languages.join("/")} project using ${analysis.frameworks.join(", ") || "standard tooling"}.`,
        "",
        "## Rules",
        "",
        "- Read .agents/memory/decisions.md before making architectural choices",
        "- Follow existing patterns in the codebase",
      ].join("\n");
      writeIfMissing(join(targetDir, ".kilocode", "rules", "00-core.md"), content, result, overwrite);
      break;
    }

    case "aider":
    case "generic":
    default: {
      // Generic: just ensure shared files exist
      break;
    }
  }
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
