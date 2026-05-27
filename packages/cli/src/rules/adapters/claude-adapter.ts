import type { RuleAdapter, CompiledRule } from "../compiler.js";
import type { Rule } from "../schema.js";

/**
 * Claude Code appends rules to CLAUDE.md.
 * For individual rule files, we place them in .claude/rules/ directory.
 */
export const claudeAdapter: RuleAdapter = {
  agentId: "claude-code",

  compile(rule: Rule, index: number): CompiledRule {
    const slug = rule.slug;
    // Claude Code reads CLAUDE.md and files referenced from it.
    // We write individual rule files that can be referenced.
    const path = `.claude/rules/${String(index).padStart(2, "0")}-${slug}.md`;

    const lines: string[] = [];
    lines.push(`# ${rule.meta.title}`);
    if (rule.meta.impact) {
      lines.push(`\n**Impact: ${rule.meta.impact}**`);
    }
    if (rule.meta.globs?.length) {
      lines.push(`\n**Applies to:** ${rule.meta.globs.join(", ")}`);
    }
    lines.push("");
    lines.push(rule.body);

    return { path, content: lines.join("\n") };
  },
};
