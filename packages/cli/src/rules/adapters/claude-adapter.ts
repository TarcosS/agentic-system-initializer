import type { RuleAdapter, CompiledRule } from "../compiler.js";
import type { Rule } from "../schema.js";

/**
 * Claude Code lazy-load mapping:
 *   trigger.always       → .claude/rules/<NN>-<slug>.md   (router lists by name)
 *   trigger.globs        → .claude/rules/<NN>-<slug>.md   (router shows glob hint)
 *   trigger.description  → .claude/skills/<slug>/SKILL.md (Claude's skill mechanism
 *                          loads it lazily when the description matches the task)
 */
export const claudeAdapter: RuleAdapter = {
  agentId: "claude-code",

  compile(rule: Rule, index: number): CompiledRule {
    const slug = rule.slug;
    const idx = String(index).padStart(2, "0");
    const trigger = rule.meta.trigger;

    if (trigger.kind === "description") {
      // Description-triggered rules ride Claude's skill mechanism.
      const path = `.claude/skills/${slug}/SKILL.md`;
      const fm = [
        "---",
        `name: ${slug}`,
        // Escape any embedded double quotes in the description.
        `description: ${JSON.stringify(trigger.description)}`,
        "---",
        "",
      ].join("\n");

      const body = renderRuleBody(rule);
      const content = fm + body;

      return {
        path,
        content,
        routerLine: `- ${slug} — ${rule.meta.title} [skill; load on description]`,
      };
    }

    // always + globs both go to .claude/rules/ as plain markdown.
    const path = `.claude/rules/${idx}-${slug}.md`;
    const lines: string[] = [];
    lines.push(`# ${rule.meta.title}`);
    if (rule.meta.impact) {
      lines.push("");
      lines.push(`**Impact: ${rule.meta.impact}**`);
    }
    if (trigger.kind === "globs") {
      lines.push("");
      lines.push(`**Applies to:** ${trigger.globs.join(", ")}`);
    }
    lines.push("");
    lines.push(rule.body);

    const triggerHint =
      trigger.kind === "always"
        ? "always"
        : `globs: ${trigger.globs.join(", ")}`;

    return {
      path,
      content: lines.join("\n"),
      routerLine: `- ${idx}-${slug} — ${rule.meta.title} [${triggerHint}]`,
    };
  },
};

function renderRuleBody(rule: Rule): string {
  const parts: string[] = [];
  parts.push(`# ${rule.meta.title}`);
  if (rule.meta.impact) {
    parts.push("");
    parts.push(`**Impact: ${rule.meta.impact}**`);
  }
  parts.push("");
  parts.push(rule.body);
  return parts.join("\n");
}
