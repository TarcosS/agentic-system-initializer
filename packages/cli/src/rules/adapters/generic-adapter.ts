import type { RuleAdapter, CompiledRule } from "../compiler.js";
import type { Rule } from "../schema.js";

/**
 * Generic adapter for Codex, Aider, and other agents.
 * Writes to .agents/rules/compiled/<slug>.md
 */
export const genericAdapter: RuleAdapter = {
  agentId: "generic",

  compile(rule: Rule, index: number): CompiledRule {
    const slug = rule.slug;
    const path = `.agents/rules/compiled/${String(index).padStart(2, "0")}-${slug}.md`;

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
