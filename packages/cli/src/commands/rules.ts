import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { parseRule, type Rule } from "../rules/schema.js";
import { compileRules } from "../rules/compiler.js";
import { loadBuiltinRules, getBuiltinRuleContent, BUILTIN_RULE_SLUGS } from "../rules/loader.js";
import type { AgentId } from "../utils/agent-selector.js";

// ── Helpers ────────────────────────────────────────────────────

const RULES_DIR = ".agents/rules";
const CUSTOM_DIR = join(RULES_DIR, "custom");

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadProjectRules(targetDir: string): Rule[] {
  const rules: Rule[] = [];
  const customDir = join(targetDir, CUSTOM_DIR);
  const builtinDir = join(targetDir, RULES_DIR, "builtin");

  for (const dir of [builtinDir, customDir]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".md")) continue;
      const slug = basename(file, ".md");
      const raw = readFileSync(join(dir, file), "utf-8");
      try {
        rules.push(parseRule(raw, slug, dir === builtinDir));
      } catch (err) {
        p.log.warn(`Skipping invalid rule ${file}: ${err}`);
      }
    }
  }
  return rules;
}

function detectAgents(targetDir: string): AgentId[] {
  const agents: AgentId[] = [];
  const checks: [string, AgentId][] = [
    ["CLAUDE.md", "claude-code"],
    [".cursor/rules", "cursor"],
    [".github/copilot-instructions.md", "copilot"],
    [".clinerules", "cline"],
    [".windsurf/rules", "windsurf"],
    [".roo/rules", "roo-code"],
    [".kilocode/rules", "kilo-code"],
    ["GEMINI.md", "gemini-cli"],
    ["AGENTS.md", "codex"],
  ];
  for (const [path, agent] of checks) {
    if (existsSync(join(targetDir, path))) agents.push(agent);
  }
  return agents;
}

// ── Subcommands ────────────────────────────────────────────────

const addCommand = new Command("add")
  .description("Add a rule to the project")
  .argument("[name]", "Built-in rule slug or path to custom rule file")
  .option("--all", "Add all built-in rules")
  .action(async (name: string | undefined, options) => {
    const targetDir = process.cwd();

    if (options.all) {
      const builtinDir = join(targetDir, RULES_DIR, "builtin");
      ensureDir(builtinDir);
      const builtins = loadBuiltinRules();
      for (const rule of builtins) {
        const dest = join(builtinDir, `${rule.slug}.md`);
        if (existsSync(dest)) {
          p.log.warn(`  ⊘ ${rule.slug} (already exists)`);
          continue;
        }
        const content = getBuiltinRuleContent(rule.slug);
        if (!content) continue;
        writeFileSync(dest, content);
        p.log.success(`  ✓ ${rule.slug}`);
      }
      p.log.info(`Added ${builtins.length} built-in rules to ${RULES_DIR}/builtin/`);
      return;
    }

    if (!name) {
      const builtins = loadBuiltinRules();
      const choices = builtins.map((r) => ({
        value: r.slug,
        label: `${r.slug} — ${r.meta.title}`,
        hint: r.meta.impact ? `Impact: ${r.meta.impact}` : undefined,
      }));

      const selected = await p.multiselect({
        message: "Select rules to add:",
        options: choices,
      });

      if (p.isCancel(selected)) {
        p.cancel("Cancelled");
        process.exit(0);
      }

      const builtinDir = join(targetDir, RULES_DIR, "builtin");
      ensureDir(builtinDir);

      for (const slug of selected as string[]) {
        const content = getBuiltinRuleContent(slug);
        if (!content) continue;
        const dest = join(builtinDir, `${slug}.md`);
        writeFileSync(dest, content);
        p.log.success(`  ✓ ${slug}`);
      }
      return;
    }

    // Check if it's a built-in slug
    if (BUILTIN_RULE_SLUGS.includes(name as typeof BUILTIN_RULE_SLUGS[number])) {
      const builtinDir = join(targetDir, RULES_DIR, "builtin");
      ensureDir(builtinDir);
      const dest = join(builtinDir, `${name}.md`);
      if (existsSync(dest)) {
        p.log.warn(`Rule "${name}" already exists`);
        return;
      }
      const content = getBuiltinRuleContent(name);
      if (!content) {
        p.log.error(`Could not load built-in rule: ${name}`);
        return;
      }
      writeFileSync(dest, content);
      p.log.success(`Added built-in rule: ${name}`);
      return;
    }

    // Check if it's a file path
    const filePath = resolve(name);
    if (existsSync(filePath) && filePath.endsWith(".md")) {
      const customDir = join(targetDir, CUSTOM_DIR);
      ensureDir(customDir);
      const slug = basename(filePath, ".md");
      const raw = readFileSync(filePath, "utf-8");
      // Validate it parses
      parseRule(raw, slug);
      const dest = join(customDir, `${slug}.md`);
      writeFileSync(dest, raw);
      p.log.success(`Added custom rule: ${slug}`);
      return;
    }

    p.log.error(`Unknown rule: "${name}". Use a built-in slug or path to a .md file.`);
    p.log.info(`Available built-in rules: ${BUILTIN_RULE_SLUGS.join(", ")}`);
  });

const listCommand = new Command("list")
  .description("List all rules in the project")
  .action(async () => {
    const targetDir = process.cwd();
    const rules = loadProjectRules(targetDir);

    if (rules.length === 0) {
      p.log.info("No rules found. Use `agentinit rules add` to add rules.");
      return;
    }

    p.log.info(chalk.bold(`\n  Rules (${rules.length}):\n`));

    for (const rule of rules) {
      const impact = rule.meta.impact
        ? chalk.yellow(`[${rule.meta.impact}]`)
        : chalk.gray("[—]");
      const type = rule.builtin ? chalk.blue("builtin") : chalk.green("custom");
      const globs = rule.meta.globs?.length
        ? chalk.gray(` (${rule.meta.globs.join(", ")})`)
        : "";
      const always = rule.meta.alwaysApply ? chalk.cyan(" ★") : "";

      console.log(`  ${impact} ${rule.meta.title} ${type}${globs}${always}`);
    }
    console.log();
  });

const compileCommand = new Command("compile")
  .description("Compile rules to agent-specific formats")
  .option("--agent <agents...>", "Target specific agents (auto-detects if omitted)")
  .option("--dry-run", "Show what would be written without writing")
  .action(async (options) => {
    const targetDir = process.cwd();
    const rules = loadProjectRules(targetDir);

    if (rules.length === 0) {
      p.log.warn("No rules found. Use `agentinit rules add` first.");
      return;
    }

    let agents: AgentId[];
    if (options.agent) {
      agents = options.agent as AgentId[];
    } else {
      agents = detectAgents(targetDir);
      if (agents.length === 0) {
        p.log.warn(
          "No agent configurations detected. Use --agent to specify targets."
        );
        return;
      }
    }

    p.log.info(
      `Compiling ${rules.length} rule(s) for: ${agents.join(", ")}`
    );

    let totalWritten = 0;

    for (const agent of agents) {
      const compiled = compileRules(rules, agent);
      p.log.step(chalk.bold(`  ${agent} (${compiled.length} files)`));

      for (const file of compiled) {
        const fullPath = join(targetDir, file.path);

        if (options.dryRun) {
          console.log(`    → ${file.path}`);
          continue;
        }

        ensureDir(join(fullPath, ".."));
        writeFileSync(fullPath, file.content);
        console.log(`    ✓ ${file.path}`);
        totalWritten++;
      }
    }

    if (!options.dryRun) {
      p.log.success(`Compiled ${totalWritten} rule file(s)`);
    }
  });

// ── Main command ───────────────────────────────────────────────

export const rulesCommand = new Command("rules")
  .description("Manage project rules (add, list, compile)")
  .addCommand(addCommand)
  .addCommand(listCommand)
  .addCommand(compileCommand);
