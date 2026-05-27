import type { RuleAdapter, CompiledRule } from "../compiler.js";
import type { Rule } from "../schema.js";

/**
 * GitHub Copilot uses .github/instructions/*.instructions.md files.
 * Supports `applyTo` glob in YAML frontmatter.
 */
export const copilotAdapter: RuleAdapter = {
  agentId: "copilot",

  compile(rule: Rule, _index: number): CompiledRule {
    const slug = rule.slug;
    const path = `.github/instructions/${slug}.instructions.md`;

    const lines: string[] = ["---"];

    if (rule.meta.globs?.length) {
      lines.push(`applyTo: "${rule.meta.globs.join(",")}"`);
    } else {
      lines.push('applyTo: "**"');
    }

    lines.push("---");
    lines.push("");
    lines.push(`# ${rule.meta.title}`);
    if (rule.meta.impact) {
      lines.push(`\n**Impact: ${rule.meta.impact}**`);
    }
    lines.push("");
    lines.push(rule.body);

    return { path, content: lines.join("\n") };
  },
};
