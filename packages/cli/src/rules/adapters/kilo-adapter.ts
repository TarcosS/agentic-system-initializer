import type { RuleAdapter, CompiledRule } from "../compiler.js";
import type { Rule } from "../schema.js";

/**
 * Kilo Code uses .kilocode/rules/*.md files.
 */
export const kiloAdapter: RuleAdapter = {
  agentId: "kilo-code",

  compile(rule: Rule, index: number): CompiledRule {
    const slug = rule.slug;
    const path = `.kilocode/rules/${String(index).padStart(2, "0")}-${slug}.md`;

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
