import type { RuleAdapter, CompiledRule } from "../compiler.js";
import type { Rule } from "../schema.js";

/**
 * Cursor uses .mdc files with YAML frontmatter.
 * Supports: globs (auto-attach), alwaysApply, description (agent-requested).
 */
export const cursorAdapter: RuleAdapter = {
  agentId: "cursor",

  compile(rule: Rule, index: number): CompiledRule {
    const slug = rule.slug;
    const path = `.cursor/rules/${String(index).padStart(2, "0")}-${slug}.mdc`;

    const fmLines: string[] = ["---"];

    // Cursor frontmatter: description is always present
    fmLines.push(`description: "${rule.meta.title}"`);

    if (rule.meta.alwaysApply) {
      fmLines.push("alwaysApply: true");
    } else if (rule.meta.globs?.length) {
      const globStr = rule.meta.globs.map((g) => `"${g}"`).join(", ");
      fmLines.push(`globs: [${globStr}]`);
    }
    // If neither alwaysApply nor globs → agent-requested (description only)

    fmLines.push("---");

    const content = [fmLines.join("\n"), "", rule.body].join("\n");
    return { path, content };
  },
};
