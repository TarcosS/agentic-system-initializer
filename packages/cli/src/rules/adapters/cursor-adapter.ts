import type { RuleAdapter, CompiledRule } from "../compiler.js";
import type { Rule } from "../schema.js";

/**
 * Cursor uses .mdc files with YAML frontmatter. Three native modes:
 *   trigger.always       → alwaysApply: true
 *   trigger.globs        → globs: [...], alwaysApply: false
 *   trigger.description  → description: "..." (no globs, no alwaysApply
 *                          ⇒ Cursor treats it as agent-requested)
 */
export const cursorAdapter: RuleAdapter = {
  agentId: "cursor",

  compile(rule: Rule, index: number): CompiledRule {
    const slug = rule.slug;
    const idx = String(index).padStart(2, "0");
    const path = `.cursor/rules/${idx}-${slug}.mdc`;
    const trigger = rule.meta.trigger;

    const fmLines: string[] = ["---"];
    let triggerHint: string;

    if (trigger.kind === "always") {
      fmLines.push(`description: ${JSON.stringify(rule.meta.title)}`);
      fmLines.push("alwaysApply: true");
      triggerHint = "always";
    } else if (trigger.kind === "globs") {
      fmLines.push(`description: ${JSON.stringify(rule.meta.title)}`);
      const globStr = trigger.globs.map((g) => `"${g}"`).join(", ");
      fmLines.push(`globs: [${globStr}]`);
      fmLines.push("alwaysApply: false");
      triggerHint = `globs: ${trigger.globs.join(", ")}`;
    } else {
      fmLines.push(`description: ${JSON.stringify(trigger.description)}`);
      triggerHint = "description";
    }

    fmLines.push("---");

    const content = [fmLines.join("\n"), "", rule.body].join("\n");

    return {
      path,
      content,
      routerLine: `- ${idx}-${slug} — ${rule.meta.title} [${triggerHint}]`,
    };
  },
};
