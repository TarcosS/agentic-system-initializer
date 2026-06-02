import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync, copyFileSync, rmSync, rmdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { AgentId } from "../utils/agent-selector.js";
import type { UserProfile } from "../commands/profile.js";
import { profileToMarkdown } from "../commands/profile.js";
import type { ProjectAnalysis } from "../analyzers/project.js";
import { loadTemplate, fillTemplate, buildTemplateVars } from "../utils/template-engine.js";
import { generateRouter, ROUTER_AGENTS } from "./router.js";
import type { CompiledRule } from "../rules/compiler.js";

export interface ScaffoldOptions {
  targetDir: string;
  agents: AgentId[];
  profile: UserProfile;
  analysis: ProjectAnalysis;
  overwrite?: boolean;
  /**
   * Compiled rules per agent. When provided for an agent in ROUTER_AGENTS,
   * scaffold emits a thin router via generateRouter() instead of the
   * legacy template. Tier-2 agents still fall back to templates.
   */
  compiledRules?: Map<AgentId, CompiledRule[]>;
}

export interface ScaffoldResult {
  created: string[];
  skipped: string[];
  errors: string[];
}

export function writeScaffold(options: ScaffoldOptions): ScaffoldResult {
  const { targetDir, agents, profile, analysis, overwrite = false, compiledRules } = options;
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

  // 5. Always write a minimal AGENTS.md pointer (shared across agents).
  //    Codex scaffolding below will overwrite with its richer template when selected.
  writeIfMissing(
    join(targetDir, "AGENTS.md"),
    buildAgentsMd(agents, analysis),
    result,
    overwrite
  );

  // 6. Write agent-specific scaffolds. For Tier-1 (claude-code, cursor,
  //    copilot) we emit a thin router from generateRouter(); other agents
  //    keep using the legacy template until the Tier-2 follow-up.
  for (const agent of agents) {
    try {
      if (ROUTER_AGENTS.has(agent)) {
        const rules = compiledRules?.get(agent) ?? [];
        const router = generateRouter(profile, analysis, rules, agent);
        const filePath = join(targetDir, router.path);
        writeIfMissing(filePath, router.content, result, overwrite);
      } else {
        scaffoldAgent(targetDir, agent, vars, result, overwrite);
      }
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

function buildAgentsMd(agents: AgentId[], analysis: ProjectAnalysis): string {
  const stack = [...analysis.languages, ...analysis.frameworks].join(", ") || "unknown";
  const agentLines: string[] = [];
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
    ...(agentLines.length > 0 ? agentLines : ["- (none configured)"]),
    "",
    "## Shared resources",
    "",
    "- `how-to-use-skills.sh` — Skills CLI cheat-sheet",
    "- `.agents/profile.json` — user developer profile",
    "- `.agents/rules/builtin/` — source-of-truth for compiled rules",
    "",
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

// --- Claude Code staging → .claude/ copy ---

export const CLAUDE_STAGING_DIR = ".agents/staging/claude-config";

export interface StagingCopyResult {
  copied: string[];
  errors: string[];
}

/**
 * Copies staged `.claude/` files from the staging area to `.claude/`.
 * Claude Code's sandbox blocks all writes to `.claude/` paths, so
 * the init prompt instructs the AI to write to `.agents/staging/claude-config/`
 * instead. This function moves them to the real location after dispatch.
 */
export function copyClaudeStagingToTarget(targetDir: string): StagingCopyResult {
  const result: StagingCopyResult = { copied: [], errors: [] };
  const stagingDir = join(targetDir, CLAUDE_STAGING_DIR);

  if (!existsSync(stagingDir)) {
    return result;
  }

  const claudeDir = join(targetDir, ".claude");
  ensureDir(claudeDir);

  copyDirRecursive(stagingDir, claudeDir, result);
  return result;
}

function copyDirRecursive(
  src: string,
  dest: string,
  result: StagingCopyResult,
): void {
  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      ensureDir(destPath);
      copyDirRecursive(srcPath, destPath, result);
    } else {
      try {
        ensureDir(dirname(destPath));
        copyFileSync(srcPath, destPath);
        result.copied.push(destPath);
      } catch (err) {
        result.errors.push(`${destPath}: ${err}`);
      }
    }
  }
}

/**
 * Cleans up the staging directory after files have been copied.
 */
export function cleanupStaging(targetDir: string): void {
  const stagingDir = join(targetDir, CLAUDE_STAGING_DIR);
  if (existsSync(stagingDir)) {
    rmSync(stagingDir, { recursive: true, force: true });
  }
  // Remove .agents/staging/ if empty
  const parentStaging = join(targetDir, ".agents", "staging");
  if (existsSync(parentStaging)) {
    try {
      if (readdirSync(parentStaging).length === 0) {
        rmdirSync(parentStaging);
      }
    } catch {
      // ignore
    }
  }
}
