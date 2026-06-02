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
import { writeScaffold, copyClaudeStagingToTarget, cleanupStaging } from "../generators/scaffold.js";
import { generateClaudeFiles, writeHowToUseSkills } from "../generators/claude-files.js";
import { loadBuiltinRules } from "../rules/loader.js";
import { compileRulesForAgents } from "../rules/compiler.js";
import { getSkillsForStack } from "../utils/stack-skills.js";
import { validate } from "./validate.js";

const COPILOT_AGENT_FLAG: Record<string, string> = {
  "claude-code": "claude-code",
  copilot: "github-copilot",
  cursor: "cursor",
  codex: "codex",
  cline: "cline",
  windsurf: "windsurf",
};

export const initCommand = new Command("init")
  .description("Analyze project, build profile, scaffold files, and dispatch to agent")
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

    const isClaudeCode = agents.includes("claude-code" as AgentId);

    // ═══════════════════════════════════════════════════════════
    // Phase 1: Deterministic scaffolding (Node.js, before AI)
    // ═══════════════════════════════════════════════════════════
    p.log.step("Phase 1: Writing scaffold files...");

    // 1a. Write shared scaffold (CLAUDE.md, AGENTS.md, decisions.md, shared instructions)
    const scaffoldResult = writeScaffold({
      targetDir,
      agents,
      profile,
      analysis,
    });
    if (scaffoldResult.created.length > 0) {
      p.log.success(`Created ${scaffoldResult.created.length} scaffold file(s)`);
    }
    if (scaffoldResult.errors.length > 0) {
      for (const err of scaffoldResult.errors) {
        p.log.warn(`Scaffold error: ${err}`);
      }
    }

    // 1b. Write how-to-use-skills.sh
    if (writeHowToUseSkills(targetDir)) {
      p.log.success("Created how-to-use-skills.sh");
    }

    // 1c. Write .claude/ files (settings.json, mcp.json, agents, skills, commands, memory)
    if (isClaudeCode) {
      const claudeResult = generateClaudeFiles(targetDir, profile, analysis);
      if (claudeResult.created.length > 0) {
        p.log.success(
          `Created ${claudeResult.created.length} file(s) in .claude/`
        );
      }
    }

    // 1d. Add & compile rules
    const builtinRules = loadBuiltinRules();
    if (builtinRules.length > 0) {
      const { writeFileSync, mkdirSync } = await import("node:fs");
      // Copy builtin rules to project
      const builtinDir = join(targetDir, ".agents", "rules", "builtin");
      if (!existsSync(builtinDir)) mkdirSync(builtinDir, { recursive: true });

      let rulesAdded = 0;
      for (const rule of builtinRules) {
        const dest = join(builtinDir, `${rule.slug}.md`);
        if (!existsSync(dest)) {
          const { getBuiltinRuleContent } = await import("../rules/loader.js");
          const content = getBuiltinRuleContent(rule.slug);
          if (content) {
            writeFileSync(dest, content);
            rulesAdded++;
          }
        }
      }
      if (rulesAdded > 0) {
        p.log.success(`Added ${rulesAdded} built-in rule(s)`);
      }

      // Compile rules for all selected agents
      const compiled = compileRulesForAgents(builtinRules, agents);
      let totalCompiled = 0;
      for (const [, files] of compiled) {
        for (const file of files) {
          const fullPath = join(targetDir, file.path);
          const dir = join(fullPath, "..");
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          writeFileSync(fullPath, file.content);
          totalCompiled++;
        }
      }
      if (totalCompiled > 0) {
        p.log.success(`Compiled ${totalCompiled} rule file(s) for ${agents.join(", ")}`);
      }
    }

    // 1e. Install stack-driven skills (best-effort, per-skill)
    const skillSet = getSkillsForStack(analysis);
    const agentFlags = Array.from(
      new Set(
        agents
          .map((a) => COPILOT_AGENT_FLAG[a])
          .filter((f): f is string => Boolean(f)),
      ),
    );
    p.log.step(`Installing ${skillSet.length} stack-driven skill(s)...`);
    const { execSync } = await import("node:child_process");
    let skillsInstalled = 0;
    const skillsFailed: string[] = [];
    for (const s of skillSet) {
      // Whole-repo entries (s.skill undefined) install with `npx skills add
      // <repo>`'s defaults: all skills, all agents, project scope, symlink —
      // no -a/--skill flags. Per-skill entries still install per-agent so
      // the targeted skill lands in each selected agent's skill dir.
      const isWholeRepo = !s.skill;
      try {
        if (isWholeRepo) {
          execSync(`npx skills add ${s.repo} -y`, {
            cwd: targetDir,
            stdio: "pipe",
            timeout: 120_000,
          });
        } else if (agentFlags.length === 0) {
          execSync(`npx skills add ${s.repo} --skill ${s.skill} -y`, {
            cwd: targetDir,
            stdio: "pipe",
            timeout: 120_000,
          });
        } else {
          for (const flag of agentFlags) {
            execSync(`npx skills add ${s.repo} --skill ${s.skill} -a ${flag} -y`, {
              cwd: targetDir,
              stdio: "pipe",
              timeout: 120_000,
            });
          }
        }
        skillsInstalled++;
      } catch {
        skillsFailed.push(s.skill ? `${s.repo}/${s.skill}` : s.repo);
      }
    }
    if (skillsInstalled > 0) {
      p.log.success(`Installed ${skillsInstalled}/${skillSet.length} skill(s)`);
    }
    if (skillsFailed.length > 0) {
      p.log.warn(
        `Skill installs that failed (likely registry/network): ${skillsFailed.join(", ")}`,
      );
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 2: AI dispatch (reduced scope — customize & extend)
    // ═══════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════
    // Phase 3: Post-dispatch — staging copy + validation
    // ═══════════════════════════════════════════════════════════

    // Copy staged .claude/ files (if AI wrote to staging)
    if (isClaudeCode) {
      const stagingResult = copyClaudeStagingToTarget(targetDir);
      if (stagingResult.copied.length > 0) {
        p.log.success(
          `Moved ${stagingResult.copied.length} staged file(s) to .claude/`
        );
        cleanupStaging(targetDir);
      }
    }

    // Validate scaffold completeness
    p.log.step("Validating scaffold...");
    const validationResult = await validate(targetDir, agents as string[]);
    if (validationResult.issues.length === 0) {
      p.log.success(`All checks passed (${validationResult.passed}/${validationResult.total}) ✓`);
    } else {
      p.log.warn(`${validationResult.issues.length} issue(s) found:`);
      for (const issue of validationResult.issues) {
        p.log.message(`  ${chalk.yellow("!")} ${issue}`);
      }
    }

    // Report
    p.note(
      [
        `Agent(s): ${agents.join(", ")}`,
        `Profile: ${profile.role} / ${profile.domain} / autonomy=${profile.autonomy}`,
        `Spec: ${specPath ?? "CDN (remote)"}`,
        "",
        "Phase 1 (deterministic) created:",
        "  • Scaffold files (CLAUDE.md, AGENTS.md, decisions.md)",
        isClaudeCode ? "  • .claude/ structure (settings, agents, skills, commands)" : "",
        `  • ${builtinRules.length} compiled rules`,
        "",
        "Phase 2 (AI) customized:",
        "  • Project-specific CLAUDE.md content",
        "  • Specialist sub-agents based on stack",
        "  • Additional skills discovery",
      ]
        .filter(Boolean)
        .join("\n"),
      "Complete"
    );

    p.outro("Run `agentinit validate` to re-check scaffold integrity.");
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
