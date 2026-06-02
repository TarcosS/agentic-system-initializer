/**
 * Thin-router emitter. Replaces the long, template-grown per-agent
 * instruction files (CLAUDE.md, .cursor/rules/00-core.mdc, copilot
 * instructions) with a ~80-line router that:
 *   1. points at lazy-loaded rules (skills / .mdc globs / applyTo)
 *   2. surfaces a 6-line dispatch matrix the agent will actually follow
 *   3. lists rules / skills / sub-agents by one-line descriptor
 *
 * The body of each rule lives in its own compiled file (claude-adapter /
 * cursor-adapter / copilot-adapter). This file only renders the router.
 */
import type { AgentId } from "../utils/agent-selector.js";
import type { UserProfile } from "../commands/profile.js";
import type { ProjectAnalysis } from "../analyzers/project.js";
import type { CompiledRule } from "../rules/compiler.js";
import { profileToMarkdown } from "../commands/profile.js";

export interface RouterTarget {
  path: string;
  content: string;
}

/**
 * Agents that get a generated thin router from this module. Other agents
 * keep using their template files (handled in scaffold.ts) until the
 * Tier-2 follow-up.
 */
export const ROUTER_AGENTS = new Set<AgentId>(["claude-code", "cursor", "copilot"]);

const COPILOT_INLINE_MARKER = "__COPILOT_INLINE__";

/**
 * Hard-coded Claude skill catalogue. Mirrors the literals in
 * generators/claude-files.ts so the router advertises exactly what the
 * scaffolder writes to .claude/skills/.
 */
const CLAUDE_SKILLS: Array<{ slug: string; description: string }> = [
  { slug: "context-hygiene", description: "Keep the working context lean during long sessions." },
  { slug: "log-decision", description: "Append a structured entry to .claude/memory/decisions.md." },
  { slug: "workflows", description: "Step-by-step procedures for feature / bug / refactor / debug / spike." },
  { slug: "commands", description: "Reference for project install / dev / test / lint / build commands." },
  { slug: "conventions", description: "File naming, import order, export style, error-handling pattern." },
  { slug: "git-flow", description: "Branching, commit message style, push/merge rules." },
  { slug: "error-recovery", description: "Recovering from build / test / deploy / tool failures." },
  { slug: "pr-flow", description: "PR title style, body sections, screenshots, self-review checklist." },
];

const CLAUDE_SUB_AGENTS: Array<{ slug: string; description: string }> = [
  { slug: "researcher", description: "Bounded info-gathering: codebase exploration, doc comparison, trade-off analysis." },
  { slug: "implementer", description: "Bounded coding sub-agent for well-scoped tasks (<300 LOC, <10 files)." },
  { slug: "reviewer", description: "Second-pass correctness / security / data-safety review of a diff." },
  { slug: "adversarial-reviewer", description: "Fresh-context audit of diff vs. plan/spec — correctness, not style." },
];

const DISPATCH_MATRIX_LINES = [
  "Dispatch BEFORE you start work when ANY apply:",
  "- Task touches >3 files OR needs Grep across the repo → researcher",
  "- Library / pattern / migration trade-off needs comparing → researcher",
  "- Bounded coding task with agreed design, <300 LOC, <10 files → implementer",
  "- Diff is >50 LOC OR touches auth / secrets / migrations OR adds a dep → reviewer",
  "- Diff ready for merge AND a plan/spec exists → adversarial-reviewer (fresh context)",
  "Skip dispatch for: single-file edits <2 min, pure typo / format fixes.",
];

const DEGRADED_DISPATCH_LINES = [
  "Before any task that touches >3 files OR needs repo-wide search:",
  "1. Do a read-only pass first (Grep / Read / Glob) — no edits.",
  "2. Summarize findings in three bullets (key files, current pattern, risks).",
  "3. *Then* start editing. The read-only pass replaces a researcher sub-agent.",
];

/**
 * Emit the agent-specific router file.
 *
 * @param profile  user-facing profile (role, autonomy, etc.)
 * @param analysis project analysis (stack, paths)
 * @param compiled compiled rules for the chosen agent — `routerLine`s become
 *                 the rule registry section; Copilot-specific inline markers
 *                 split out into the "When" section
 * @param agent    target agent (must be one of ROUTER_AGENTS)
 */
export function generateRouter(
  profile: UserProfile,
  analysis: ProjectAnalysis,
  compiled: CompiledRule[],
  agent: AgentId,
): RouterTarget {
  if (!ROUTER_AGENTS.has(agent)) {
    throw new Error(`generateRouter does not support agent: ${agent}`);
  }

  const sections: string[] = [];

  // Frontmatter (Cursor only — it needs alwaysApply:true on the router).
  if (agent === "cursor") {
    sections.push(
      [
        "---",
        'description: "Project router — always loaded. Lists rules, skills, dispatch matrix."',
        "alwaysApply: true",
        "---",
      ].join("\n"),
    );
  }

  // Header.
  sections.push(headerSection(analysis, agent));

  // Profile.
  sections.push(profileToMarkdown(profile).trim());

  // Project.
  sections.push(projectSection(analysis));

  // Dispatch matrix.
  sections.push(dispatchSection(agent));

  // Rule registry + Copilot inline-When section.
  const { registry, copilotInlines } = splitRegistry(compiled);
  sections.push(registrySection(registry, agent));

  if (agent === "copilot" && copilotInlines.length > 0) {
    sections.push(["## Description-triggered rules", "", ...copilotInlines].join("\n"));
  }

  // Skills (Claude only).
  if (agent === "claude-code") {
    sections.push(skillsSection());
    sections.push(subAgentsSection());
  }

  // Gotchas placeholder (stack-driven follow-up). Keep terse so AI Phase 2
  // can extend if the project warrants it.
  sections.push(gotchasSection(analysis));

  // Decision-log pointer.
  sections.push(decisionLogSection(agent));

  // Personal overrides pointer (Claude only — .local stub lives there).
  if (agent === "claude-code") {
    sections.push(
      "## Personal overrides\n\nSee `CLAUDE.local.md` (gitignored) for personal-only overrides.",
    );
  }

  const content = sections.join("\n\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";

  return { path: routerPath(agent), content };
}

function routerPath(agent: AgentId): string {
  switch (agent) {
    case "claude-code":
      return "CLAUDE.md";
    case "cursor":
      return ".cursor/rules/00-router.mdc";
    case "copilot":
      return ".github/copilot-instructions.md";
    default:
      throw new Error(`No router path for agent: ${agent}`);
  }
}

function headerSection(analysis: ProjectAnalysis, agent: AgentId): string {
  const titles: Record<string, string> = {
    "claude-code": "CLAUDE.md",
    cursor: "# Project router",
    copilot: "# Copilot instructions",
  };
  const title = agent === "claude-code" ? `# ${titles["claude-code"]}` : titles[agent]!;
  return [
    title,
    "",
    `> Thin router for **${analysis.name}**. Bodies live in lazy-loaded rules and skills — this file only points at them.`,
  ].join("\n");
}

function projectSection(analysis: ProjectAnalysis): string {
  const stack = [...analysis.languages, ...analysis.frameworks].filter(Boolean).join(", ") || "unspecified";
  const tests = analysis.testFramework.join(", ") || "none detected";
  const ci = analysis.ci.join(", ") || "none";
  const lines = [
    "## Project",
    "",
    `- **Stack:** ${stack}`,
    `- **Package manager:** ${analysis.packageManager}`,
    `- **Tests:** ${tests}`,
    `- **CI:** ${ci}`,
  ];
  if (analysis.monorepo) lines.push("- **Monorepo:** yes");
  if (analysis.hasDocker) lines.push("- **Docker:** present");
  if (analysis.hasTerraform) lines.push("- **Terraform:** present");
  if (analysis.hasDatabase) lines.push("- **Database:** present");
  return lines.join("\n");
}

function dispatchSection(agent: AgentId): string {
  const isClaude = agent === "claude-code";
  const lines = isClaude ? DISPATCH_MATRIX_LINES : DEGRADED_DISPATCH_LINES;
  return ["## Dispatch", "", "```", ...lines, "```"].join("\n");
}

function splitRegistry(
  compiled: CompiledRule[],
): { registry: string[]; copilotInlines: string[] } {
  const registry: string[] = [];
  const copilotInlines: string[] = [];

  for (const c of compiled) {
    if (!c.routerLine) continue;
    if (c.routerLine.startsWith(COPILOT_INLINE_MARKER)) {
      copilotInlines.push(c.routerLine.slice(COPILOT_INLINE_MARKER.length));
    } else {
      registry.push(c.routerLine);
    }
  }
  return { registry, copilotInlines };
}

function registrySection(registry: string[], _agent: AgentId): string {
  if (registry.length === 0) {
    return [
      "## Rules registry",
      "",
      "_No rules installed. Run `agentinit rules add --all` to seed the builtin set._",
    ].join("\n");
  }
  return ["## Rules registry", "", ...registry].join("\n");
}

function skillsSection(): string {
  const lines = ["## Skills (load on demand)", ""];
  for (const s of CLAUDE_SKILLS) {
    lines.push(`- \`${s.slug}\` — ${s.description}`);
  }
  return lines.join("\n");
}

function subAgentsSection(): string {
  const lines = ["## Sub-agents", ""];
  for (const a of CLAUDE_SUB_AGENTS) {
    lines.push(`- \`${a.slug}\` — ${a.description}`);
  }
  return lines.join("\n");
}

function gotchasSection(_analysis: ProjectAnalysis): string {
  return [
    "## Gotchas",
    "",
    "_Project-specific traps go here. AI Phase 2 may extend; keep entries short and load-bearing._",
  ].join("\n");
}

function decisionLogSection(agent: AgentId): string {
  const logPath =
    agent === "claude-code"
      ? ".claude/memory/decisions.md"
      : ".agents/memory/decisions.md";
  return [
    "## Decision log",
    "",
    `See \`${logPath}\` for the project's append-only decision log. Recent entries are kept inline there; older entries roll to \`.agents/memory/decisions-archive/<year>.md\`.`,
  ].join("\n");
}
