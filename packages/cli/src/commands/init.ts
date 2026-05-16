import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { analyzeProject } from "../analyzers/project.js";
import { collectProfile, type UserProfile } from "./profile.js";
import { selectAgents, type AgentId } from "../utils/agent-selector.js";
import { writeScaffold } from "../generators/scaffold.js";
import { validate } from "./validate.js";

export const initCommand = new Command("init")
  .description("Initialize agent configuration: profile + agent selection + scaffold")
  .argument("[directory]", "Target directory", ".")
  .option("--agent <agents...>", "Pre-select agent(s) to skip interactive selection")
  .option("--skip-profile", "Use default profile (senior, high autonomy)")
  .option("--dry-run", "Show what would be created without writing files")
  .action(async (directory: string, options) => {
    p.intro(chalk.bgCyan(" agentinit "));

    const targetDir = directory === "." ? process.cwd() : directory;

    // Step 0: Analyze project
    p.log.step("Step 0: Analyzing project...");
    const analysis = await analyzeProject(targetDir);
    p.log.success(
      `Detected: ${analysis.languages.join(", ") || "unknown"} / ${analysis.frameworks.join(", ") || "no framework"} / ${analysis.packageManager}`
    );

    // Step 0b: User profile
    let profile: UserProfile;
    if (options.skipProfile) {
      profile = getDefaultProfile();
      p.log.info("Using default profile (senior, high autonomy, balanced strictness)");
    } else {
      p.log.step("Step 0b: Building your developer profile...");
      profile = await collectProfile();
    }

    // Agent selection
    let agents: AgentId[];
    if (options.agent) {
      agents = options.agent as AgentId[];
    } else {
      agents = await selectAgents();
    }
    p.log.success(`Selected agent(s): ${agents.join(", ")}`);

    if (options.dryRun) {
      p.log.info("Dry run — would scaffold for: " + agents.join(", "));
      p.outro("Dry run complete. No files written.");
      return;
    }

    // Write scaffold
    p.log.step("Writing scaffold files...");
    const result = writeScaffold({ targetDir, agents, profile, analysis });
    p.log.success(`Created ${result.created.length} files`);
    if (result.skipped.length > 0) {
      p.log.info(`Skipped ${result.skipped.length} existing files`);
    }

    // Validate
    p.log.step("Validating scaffold...");
    const validation = await validate(targetDir, agents.map(String));
    if (validation.issues.length === 0) {
      p.log.success("Validation passed ✓");
    } else {
      p.log.warn(`Validation: ${validation.issues.length} issue(s) found`);
      for (const issue of validation.issues) {
        p.log.message(`  ${chalk.yellow("!")} ${issue}`);
      }
    }

    // Report
    p.note(
      [
        `Agent(s): ${agents.join(", ")}`,
        `Profile: ${profile.role} / ${profile.domain} / autonomy=${profile.autonomy}`,
        `Files created: ${result.created.length}`,
        "",
        "Next steps:",
        "  1. Feed the generated prompt to your agent (use `agentinit generate`)",
        "  2. Run: npx skills add vercel-labs/skills --skill find-skills -y",
        "  3. Run: agentinit validate",
      ].join("\n"),
      "Initialization complete"
    );

    p.outro("Done! Run `agentinit validate` anytime to health-check your scaffold.");
  });

function getDefaultProfile(): UserProfile {
  return {
    role: "senior",
    domain: "fullstack",
    expertise: [],
    workingStyle: "mixed",
    autonomy: "high",
    reviewStrictness: "balanced",
    securityStance: "standard",
    communication: "concise",
    preferences: [],
  };
}
