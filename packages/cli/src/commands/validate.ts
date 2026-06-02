import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";

interface ValidationResult {
  issues: string[];
  passed: number;
  total: number;
}

const AGENTINIT_MANAGED_GLOBS = [
  "CLAUDE.md",
  "AGENTS.md",
  "GEMINI.md",
  ".github/copilot-instructions.md",
  ".github/instructions/**/*.md",
  ".agents/**/*.md",
  ".claude/**/*.md",
  ".cursor/**/*.{md,mdc}",
  ".codex/**/*.md",
  ".clinerules/**/*.md",
  ".windsurf/**/*.md",
  ".roo/**/*.md",
  ".kilocode/**/*.md",
];

const HTML_AND_GENERIC_TAGS = new Set([
  "p", "div", "span", "body", "html", "head", "title", "meta", "link", "script", "style",
  "table", "tr", "td", "th", "thead", "tbody", "tfoot", "caption", "colgroup", "col",
  "ul", "ol", "li", "dl", "dt", "dd",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "a", "img", "br", "hr",
  "em", "strong", "b", "i", "u", "s", "ins", "del", "mark", "small", "sub", "sup", "q", "cite",
  "code", "pre", "kbd", "samp", "var",
  "blockquote", "abbr", "address", "time",
  "nav", "header", "footer", "main", "section", "article", "aside", "figure", "figcaption",
  "video", "audio", "source", "track", "embed", "object", "param", "iframe", "canvas", "svg",
  "form", "input", "button", "select", "option", "optgroup", "textarea", "label",
  "fieldset", "legend", "datalist", "output", "progress", "meter",
  "details", "summary", "dialog", "template", "slot",
  "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "g", "defs", "use", "text", "tspan",
  "void", "any", "never", "unknown", "string", "number", "boolean", "object",
]);

function findPlaceholders(content: string): string[] {
  // Strip fenced code blocks and inline code — examples there are not placeholders
  const stripped = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]+`/g, "");

  const out: string[] = [];

  // 1. Angle-bracket placeholders that aren't known HTML/TS-generic tags
  const angleRe = /<([a-z][a-z0-9_-]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = angleRe.exec(stripped)) !== null) {
    if (!HTML_AND_GENERIC_TAGS.has(m[1]!.toLowerCase())) {
      out.push(m[0]);
    }
  }

  // 2. Mustache-style placeholders
  const mustache = stripped.match(/\{\{[^}\n]+\}\}/g);
  if (mustache) out.push(...mustache);

  return out;
}

const AGENT_PATHS: Record<string, string[]> = {
  "claude-code": ["CLAUDE.md", ".claude/settings.json", ".claude/mcp.json", ".claude/agents", ".claude/memory/decisions.md"],
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

  // 3. Check for unfilled placeholders — only in agentinit-managed files.
  // Skill package directories are excluded: they hold either vendored 3rd-party
  // packs (installed by `npx skills add`) or hand-written skill templates whose
  // `<example>`-style markers are intentional documentation, not placeholders.
  const mdFiles = await fg(AGENTINIT_MANAGED_GLOBS, {
    cwd: targetDir,
    ignore: [
      "node_modules/**",
      ".git/**",
      ".agents/skills/**",
      ".claude/skills/**",
      ".codex/skills/**",
      ".cursor/skills/**",
      ".github/skills/**",
    ],
    absolute: true,
  });

  for (const file of mdFiles) {
    const content = readFileSync(file, "utf-8");
    const placeholders = findPlaceholders(content);
    if (placeholders.length > 0) {
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

  // 5. Check decisions.md exists and is seeded with >1 entry
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
  const seededDecisionsFile = memoryPaths
    .map((mp) => join(targetDir, mp))
    .find((p) => existsSync(p) && countDecisionEntries(p) >= 2);
  if (seededDecisionsFile) {
    passed++;
  } else if (memoryPaths.some((mp) => existsSync(join(targetDir, mp)))) {
    issues.push("decisions.md exists but has fewer than 2 entries (AI should seed project-specific decisions)");
  } else {
    issues.push("No decisions.md found in any memory path");
  }

  // 6. Skills count — at least 5 installed
  total++;
  const skillCount = countInstalledSkills(targetDir);
  if (skillCount >= 5) {
    passed++;
  } else {
    issues.push(`Only ${skillCount} skill(s) installed — expected ≥5 for a customized stack`);
  }

  // 7. Specialist sub-agents (claude-code only — beyond core researcher/implementer/reviewer)
  if (detectedAgents.includes("claude-code")) {
    total++;
    const specialistCount = countSpecialistAgents(targetDir);
    if (specialistCount >= 1) {
      passed++;
    } else {
      issues.push(
        ".claude/agents/ has no specialist sub-agents — expected at least one (frontend/api/database/devops/qa) based on stack",
      );
    }
  }

  // 8. Compiled rules count
  total++;
  const ruleFileCount = countCompiledRules(targetDir, detectedAgents);
  if (ruleFileCount > 0) {
    passed++;
  } else {
    issues.push("0 compiled rules found — built-in rules pipeline failed to write outputs");
  }

  return { issues, passed, total };
}

function countDecisionEntries(filePath: string): number {
  try {
    const content = readFileSync(filePath, "utf-8");
    // Count `## ` headings that look like decision entries (skip top-level # title and table-of-contents)
    const headingMatches = content.match(/^##\s+\S/gm);
    return headingMatches?.length ?? 0;
  } catch {
    return 0;
  }
}

function countInstalledSkills(targetDir: string): number {
  const skillDirs = [
    ".claude/skills",
    ".agents/skills",
    ".codex/skills",
    ".github/skills",
    ".cursor/skills",
  ];
  const seen = new Set<string>();
  for (const dir of skillDirs) {
    const fullDir = join(targetDir, dir);
    if (!existsSync(fullDir)) continue;
    try {
      for (const entry of readdirSync(fullDir)) {
        if (entry.startsWith(".")) continue;
        const entryPath = join(fullDir, entry);
        try {
          if (statSync(entryPath).isDirectory()) seen.add(entry);
        } catch {
          // ignore stat errors
        }
      }
    } catch {
      // ignore readdir errors
    }
  }
  return seen.size;
}

function countSpecialistAgents(targetDir: string): number {
  const agentsDir = join(targetDir, ".claude", "agents");
  if (!existsSync(agentsDir)) return 0;
  const core = new Set(["researcher.md", "implementer.md", "reviewer.md"]);
  try {
    return readdirSync(agentsDir).filter(
      (f) => f.endsWith(".md") && !core.has(f),
    ).length;
  } catch {
    return 0;
  }
}

function countCompiledRules(targetDir: string, agents: string[]): number {
  let count = 0;
  const rulePaths: string[] = [
    ".agents/rules/builtin",
  ];
  if (agents.includes("claude-code")) rulePaths.push(".claude/rules");
  if (agents.includes("cursor")) rulePaths.push(".cursor/rules");
  if (agents.includes("copilot")) rulePaths.push(".github/instructions");
  if (agents.includes("codex")) rulePaths.push(".codex/rules");
  if (agents.includes("cline")) rulePaths.push(".clinerules");
  if (agents.includes("windsurf")) rulePaths.push(".windsurf/rules");
  if (agents.includes("roo-code")) rulePaths.push(".roo/rules");
  if (agents.includes("kilo-code")) rulePaths.push(".kilocode/rules");

  for (const rp of rulePaths) {
    const fullDir = join(targetDir, rp);
    if (!existsSync(fullDir)) continue;
    try {
      count += readdirSync(fullDir).filter(
        (f) => f.endsWith(".md") || f.endsWith(".mdc"),
      ).length;
    } catch {
      // ignore
    }
  }
  return count;
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
