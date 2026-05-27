import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadProfile } from "./profile.js";
import { analyzeProject } from "../analyzers/project.js";
import { generatePrompt, type GenerateOptions } from "../generators/prompt.js";
import { canDispatch, dispatchToAgent, getDispatchInstructions } from "../utils/dispatch.js";
import type { AgentId } from "../utils/agent-selector.js";

export const generateCommand = new Command("generate")
  .description("Generate a slimmed-down initialization prompt and optionally dispatch to agent")
  .option("-a, --agent <agent>", "Target agent (claude-code, cursor, copilot, etc.)")
  .option("-o, --output <file>", "Output file (default: dispatch to agent)")
  .option("--clipboard", "Copy to clipboard instead of dispatching")
  .option("--no-dispatch", "Print to stdout instead of launching agent")
  .option("--spec <path>", "Path to agentic-system-initializer.md (uses CDN by default)")
  .option("--offline", "Use cached/local sections only, skip CDN fetch")
  .action(async (options) => {
    p.intro(chalk.bgCyan(" agentinit generate "));

    const targetDir = process.cwd();
    const profile = loadProfile(targetDir);

    if (!profile) {
      p.log.warn("No profile found. Run `agentinit init` first (or `agentinit profile`).");
      p.outro("");
      return;
    }

    // Determine spec file location (optional — CDN is default)
    const specPath = options.spec ?? findSpecFile(targetDir);
    const useOffline = options.offline ?? false;

    // Select agent
    let agent = options.agent;
    if (!agent) {
      const choice = await p.select({
        message: "Which agent should this prompt target?",
        options: [
          { value: "claude-code", label: "Claude Code" },
          { value: "cursor", label: "Cursor" },
          { value: "codex", label: "Codex CLI" },
          { value: "copilot", label: "GitHub Copilot" },
          { value: "gemini-cli", label: "Gemini CLI" },
          { value: "cline", label: "Cline" },
          { value: "windsurf", label: "Windsurf" },
          { value: "roo-code", label: "Roo Code" },
          { value: "kilo-code", label: "Kilo Code" },
          { value: "aider", label: "Aider" },
          { value: "generic", label: "Generic / Other" },
        ],
      });
      if (p.isCancel(choice)) process.exit(0);
      agent = choice as string;
    }

    const analysis = await analyzeProject(targetDir);

    const genOptions: GenerateOptions = {
      specPath: specPath ?? undefined,
      agent,
      profile,
      analysis,
      offline: useOffline,
    };

    const spinner = p.spinner();
    spinner.start("Generating slimmed prompt...");
    const result = await generatePrompt(genOptions);
    spinner.stop("Prompt generated");

    if (options.output) {
      const outPath = resolve(options.output);
      writeFileSync(outPath, result);
      p.log.success(`Written to ${outPath} (${result.length} chars)`);
    } else if (options.clipboard) {
      // Best-effort clipboard copy via pbcopy/xclip
      try {
        const { execSync } = await import("node:child_process");
        const cmd =
          process.platform === "darwin" ? "pbcopy" : "xclip -selection clipboard";
        execSync(cmd, { input: result });
        p.log.success("Copied to clipboard!");
      } catch {
        p.log.warn("Clipboard copy failed. Printing to stdout instead.");
        console.log(result);
      }
    } else if (options.dispatch !== false && canDispatch(agent as AgentId)) {
      // Direct dispatch to agent CLI
      const dispatchResult = await dispatchToAgent(agent as AgentId, result, targetDir);
      if (dispatchResult.success) {
        p.log.success(dispatchResult.message);
      } else {
        p.log.warn(dispatchResult.message);
      }
    } else if (options.dispatch !== false) {
      // IDE agent — show instructions
      const { mkdirSync } = await import("node:fs");
      const tmpDir = join(targetDir, ".agents", ".tmp");
      if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
      const outFile = join(tmpDir, `${agent}-init-prompt.md`);
      writeFileSync(outFile, result);
      const instruction = getDispatchInstructions(agent as AgentId, outFile);
      p.log.info(`${chalk.dim("→")} ${instruction}`);
    } else {
      console.log(result);
    }

    p.outro(
      `${chalk.dim(`Lines: ${result.split("\n").length} | Agent: ${agent}`)}`
    );
  });

function findSpecFile(startDir: string): string | null {
  // Look upward for agentic-system-initializer.md
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
