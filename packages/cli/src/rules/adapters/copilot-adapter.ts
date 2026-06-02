import type { RuleAdapter, CompiledRule } from "../compiler.js";
import type { Rule } from "../schema.js";

/**
 * GitHub Copilot uses .github/instructions/*.instructions.md files with an
 * `applyTo` glob in YAML frontmatter. There is no native lazy-by-description
 * mechanism, so description-triggered rules fall back to inline blocks in
 * the router file (.github/copilot-instructions.md). The router emitter
 * picks those up via the `routerLine` field.
 *
 *   trigger.always       → .github/instructions/<slug>.instructions.md, applyTo:"**"
 *   trigger.globs        → .github/instructions/<slug>.instructions.md, applyTo:"<glob>"
 *   trigger.description  → routerLine carries the inline body the router
 *                          composer will splice under `### When: <description>`.
 *                          The CompiledRule.path still resolves to the same
 *                          .instructions.md path for callers that write every
 *                          compiled file, but its content is a one-line
 *                          pointer so duplicating it into the file system is
 *                          harmless.
 */
export const copilotAdapter: RuleAdapter = {
  agentId: "copilot",

  compile(rule: Rule, _index: number): CompiledRule {
    const slug = rule.slug;
    const trigger = rule.meta.trigger;
    const path = `.github/instructions/${slug}.instructions.md`;

    if (trigger.kind === "description") {
      // The router composer will inline the body. We still emit a tiny
      // .instructions.md so anyone browsing the directory finds the rule;
      // it points back at the router so there's no body duplication.
      const pointerBody = [
        "---",
        'applyTo: ""',
        "---",
        "",
        `# ${rule.meta.title}`,
        "",
        `_This rule is description-triggered. Its full body is inlined into \`.github/copilot-instructions.md\` under "When: ${trigger.description}"._`,
        "",
      ].join("\n");

      const inlineBlock = renderInlineBlock(rule, trigger.description);

      return {
        path,
        content: pointerBody,
        routerLine: `__COPILOT_INLINE__${inlineBlock}`,
      };
    }

    const lines: string[] = ["---"];
    if (trigger.kind === "globs") {
      lines.push(`applyTo: "${trigger.globs.join(",")}"`);
    } else {
      lines.push('applyTo: "**"');
    }
    lines.push("---");
    lines.push("");
    lines.push(`# ${rule.meta.title}`);
    if (rule.meta.impact) {
      lines.push("");
      lines.push(`**Impact: ${rule.meta.impact}**`);
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
      routerLine: `- ${slug} — ${rule.meta.title} [${triggerHint}]`,
    };
  },
};

/** Render the description-triggered rule body for inline splicing. */
function renderInlineBlock(rule: Rule, description: string): string {
  const parts: string[] = [];
  parts.push(`### When: ${description}`);
  parts.push("");
  parts.push(`**${rule.meta.title}**`);
  if (rule.meta.impact) {
    parts.push("");
    parts.push(`Impact: ${rule.meta.impact}`);
  }
  parts.push("");
  parts.push(rule.body);
  return parts.join("\n");
}
