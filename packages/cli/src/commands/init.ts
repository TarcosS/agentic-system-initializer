import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { analyzeProject } from "../analyzers/project.js";
import { collectProfile, saveProfile, type UserProfile } from "./profile.js";
import { selectAgents, type AgentId } from "../utils/agent-selector.js";
import { generatePrompt } from "../generators/prompt.js";
import { canDispatch, dispatchToAgent, isIdeAgent, getDispatchInstructions } from "../utils/dispatch.js";

export const initCommand = new Command("init")
  .description("Analyze project, build profile, generate prompt, and dispatch to agent")
  .argument("[directory]", "Target directory", ".")
  .option("--agent <agents...>", "Pre-select agent(s) to skip interactive selection")
  .option("--skip-profile", "Use default profile (senior, high autonomy)")
  .option("--no-dispatch", "Generate prompt file only, don't launch agent")
  .option("--spec <path>", "Path to agentic-system-initializer.md (uses CDN by default)")
  .option("--offline", "Use cached/local sections only, skip CDN fetch")
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

    // Save profile for future runs
    const agentsDir = join(targetDir, ".agents");
    if (!existsSync(agentsDir)) {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(agentsDir, { recursive: true });
    }
    saveProfile(targetDir, profile);

    // Agent selection
    let agents: AgentId[];
    if (options.agent) {
      agents = options.agent as AgentId[];
    } else {
      agents = await selectAgents();
    }
    p.log.success(`Selected agent(s): ${agents.join(", ")}`);

    // Find spec file (optional — CDN is used by default)
    const specPath = options.spec ?? findSpecFile(targetDir);
    const useOffline = options.offline ?? false;

    // Generate prompt for each agent and dispatch
    for (const agent of agents) {
      p.log.step(`Generating prompt for ${chalk.bold(agent)}...`);

      const prompt = await generatePrompt({
        specPath: specPath ?? undefined,
        agent,
        profile,
        analysis,
        offline: useOffline,
      });

      p.log.success(`Prompt ready (${prompt.split("\n").length} lines)`);

      // Dispatch
      if (options.dispatch === false) {
        // --no-dispatch: just write file
        const { writeFileSync, mkdirSync } = await import("node:fs");
        const tmpDir = join(targetDir, ".agents", ".tmp");
        if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
        const outFile = join(tmpDir, `${agent}-init-prompt.md`);
        writeFileSync(outFile, prompt);
        p.log.info(`Written to: ${outFile}`);
        continue;
      }

      if (canDispatch(agent)) {
        // CLI agent — dispatch directly
        const result = await dispatchToAgent(agent, prompt, targetDir);
        if (result.success && result.method === "cli") {
          p.log.success(result.message);
        } else if (result.method === "file") {
          p.log.info(result.message);
        } else {
          p.log.warn(result.message);
        }
      } else if (isIdeAgent(agent)) {
        // IDE agent — write file and show instructions
        const { writeFileSync, mkdirSync } = await import("node:fs");
        const tmpDir = join(targetDir, ".agents", ".tmp");
        if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
        const outFile = join(tmpDir, `${agent}-init-prompt.md`);
        writeFileSync(outFile, prompt);
        const instruction = getDispatchInstructions(agent, outFile);
        p.log.info(`${chalk.dim("→")} ${instruction}`);
      }
    }

    // Report
    p.note(
      [
        `Agent(s): ${agents.join(", ")}`,
        `Profile: ${profile.role} / ${profile.domain} / autonomy=${profile.autonomy}`,
        `Spec: ${specPath ?? "CDN (remote)"}`,
        "",
        "The agent will now:",
        "  1. Read your project structure",
        "  2. Install relevant skills (npx skills add ...)",
        "  3. Generate config files + custom agents",
        "  4. Write decisions.md and scaffold",
      ].join("\n"),
      "Dispatched"
    );

    p.outro("Run `agentinit validate` after the agent finishes to verify the scaffold.");
  });

function findSpecFile(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, "agentic-system-initializer.md");
    if (existsSync(candidate)) return candidate;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

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
