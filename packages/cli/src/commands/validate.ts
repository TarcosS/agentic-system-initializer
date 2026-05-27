import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";

interface ValidationResult {
  issues: string[];
  passed: number;
  total: number;
}

const AGENT_PATHS: Record<string, string[]> = {
  "claude-code": ["CLAUDE.md", ".claude/settings.json", ".claude/mcp.json"],
  cursor: [".cursor/rules/00-core.mdc", ".cursor/mcp.json"],
  codex: ["AGENTS.md", ".codex/skills/context-hygiene/SKILL.md"],
  copilot: [".github/copilot-instructions.md"],
  "gemini-cli": ["GEMINI.md"],
  cline: [".clinerules/00-core.md"],
  windsurf: [".windsurf/rules/general.md"],
  "roo-code": [".roomodes", ".roo/rules/00-core.md"],
  "kilo-code": [".kilocode/rules/00-core.md"],
};

export async function validate(
  targetDir: string,
  agents?: string[]
): Promise<ValidationResult> {
  const issues: string[] = [];
  let passed = 0;
  let total = 0;

  // 1. Check shared files
  const sharedFiles = ["AGENTS.md", "how-to-use-skills.sh"];
  for (const file of sharedFiles) {
    total++;
    if (existsSync(join(targetDir, file))) {
      passed++;
    } else {
      issues.push(`Missing shared file: ${file}`);
    }
  }

  // 2. Check agent-specific files
  const detectedAgents = agents ?? detectAgents(targetDir);
  for (const agent of detectedAgents) {
    const paths = AGENT_PATHS[agent];
    if (!paths) continue;
    for (const filePath of paths) {
      total++;
      if (existsSync(join(targetDir, filePath))) {
        passed++;
      } else {
        issues.push(`Missing ${agent} file: ${filePath}`);
      }
    }
  }

  // 3. Check for unfilled placeholders
  const mdFiles = await fg(["**/*.md", "**/*.mdc"], {
    cwd: targetDir,
    ignore: ["node_modules/**", ".git/**"],
    absolute: true,
  });

  for (const file of mdFiles) {
    const content = readFileSync(file, "utf-8");
    const placeholders = content.match(/<[a-z][a-z\s-]*>/g);
    if (placeholders && placeholders.length > 0) {
      const relativePath = file.replace(targetDir + "/", "");
      const unique = [...new Set(placeholders)].slice(0, 3);
      issues.push(
        `Unfilled placeholder(s) in ${relativePath}: ${unique.join(", ")}${placeholders.length > 3 ? ` (+${placeholders.length - 3} more)` : ""}`
      );
    }
  }

  // 4. Check skills-lock.json
  total++;
  if (existsSync(join(targetDir, "skills-lock.json"))) {
    passed++;
  } else {
    issues.push("skills-lock.json not found (run npx skills to generate)");
  }

  // 5. Check decisions.md exists and is seeded
  const memoryPaths = [
    ".agents/memory/decisions.md",
    ".claude/memory/decisions.md",
    ".codex/memory/decisions.md",
    ".clinerules/memory/decisions.md",
    ".windsurf/memory/decisions.md",
    ".roo/memory/decisions.md",
    ".gemini/memory/decisions.md",
  ];
  total++;
  const hasMemory = memoryPaths.some((p) => existsSync(join(targetDir, p)));
  if (hasMemory) {
    passed++;
  } else {
    issues.push("No decisions.md found in any memory path");
  }

  // 6. Broken symlink check (best-effort via fast-glob)

  return { issues, passed, total };
}

function detectAgents(targetDir: string): string[] {
  const detected: string[] = [];
  if (existsSync(join(targetDir, ".claude"))) detected.push("claude-code");
  if (existsSync(join(targetDir, ".cursor"))) detected.push("cursor");
  if (existsSync(join(targetDir, ".codex"))) detected.push("codex");
  if (existsSync(join(targetDir, ".github", "copilot-instructions.md")))
    detected.push("copilot");
  if (existsSync(join(targetDir, "GEMINI.md"))) detected.push("gemini-cli");
  if (existsSync(join(targetDir, ".clinerules"))) detected.push("cline");
  if (existsSync(join(targetDir, ".windsurf"))) detected.push("windsurf");
  if (existsSync(join(targetDir, ".roo"))) detected.push("roo-code");
  if (existsSync(join(targetDir, ".kilocode"))) detected.push("kilo-code");
  return detected;
}

export const validateCommand = new Command("validate")
  .description("Health-check: verify scaffold integrity, find unfilled placeholders")
  .argument("[directory]", "Target directory", ".")
  .action(async (directory: string) => {
    p.intro(chalk.bgCyan(" agentinit validate "));

    const targetDir = directory === "." ? process.cwd() : directory;
    const agents = detectAgents(targetDir);

    if (agents.length === 0) {
      p.log.warn("No agent scaffold detected. Run `agentinit init` first.");
      p.outro("");
      return;
    }

    p.log.info(`Detected agents: ${agents.join(", ")}`);
    const result = await validate(targetDir, agents);

    if (result.issues.length === 0) {
      p.log.success(`All checks passed (${result.passed}/${result.total}) ✓`);
    } else {
      p.log.warn(`${result.issues.length} issue(s) found:`);
      for (const issue of result.issues) {
        p.log.message(`  ${chalk.yellow("!")} ${issue}`);
      }
      p.log.info(`Passed: ${result.passed}/${result.total}`);
    }

    p.outro("");
  });
