import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { existsSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

const AGENT_GENERATED_PATHS = [
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
  ".aider/instructions.md",
];

// Directories to remove only if empty after file deletion
const AGENT_DIRS_CLEANUP = [
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
  ".claude",
];

export const clearCommand = new Command("clear")
  .description("Remove all agentinit-generated files and directories")
  .argument("[directory]", "Target directory", ".")
  .option("--force", "Skip confirmation prompt")
  .action(async (directory: string, options) => {
    p.intro(chalk.bgCyan(" agentinit clear "));

    const targetDir = directory === "." ? process.cwd() : directory;

    // Find what exists
    const existing = AGENT_GENERATED_PATHS.filter((p) =>
      existsSync(join(targetDir, p))
    );

    if (existing.length === 0) {
      p.log.info("Nothing to clear — no agentinit-generated files found.");
      p.outro("");
      return;
    }

    // Show what will be removed
    p.log.warn("The following will be removed:");
    for (const item of existing) {
      p.log.message(`  ${chalk.red("✕")} ${item}`);
    }

    // Confirm
    if (!options.force) {
      const confirm = await p.confirm({
        message: "This is irreversible. Proceed?",
      });
      if (p.isCancel(confirm) || !confirm) {
        p.log.info("Cancelled.");
        p.outro("");
        return;
      }
    }

    // Remove files and directories
    let removed = 0;
    for (const item of existing) {
      const fullPath = join(targetDir, item);
      try {
        rmSync(fullPath, { recursive: true, force: true });
        removed++;
      } catch (err) {
        p.log.warn(`Failed to remove ${item}: ${err}`);
      }
    }

    // Clean up empty parent directories
    for (const dir of AGENT_DIRS_CLEANUP) {
      const fullPath = join(targetDir, dir);
      if (existsSync(fullPath)) {
        try {
          const contents = readdirSync(fullPath);
          if (contents.length === 0) {
            rmSync(fullPath, { recursive: true });
          }
        } catch {
          // ignore
        }
      }
    }

    p.log.success(`Removed ${removed} item(s).`);
    p.outro("Project cleared. Run `agentinit init` to start fresh.");
  });
