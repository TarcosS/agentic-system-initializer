import matter from "gray-matter";

// ── Impact levels ──────────────────────────────────────────────
export type RuleImpact = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// ── Category taxonomy ──────────────────────────────────────────
export type RuleCategory =
  | "architecture"
  | "testing"
  | "security"
  | "api"
  | "performance"
  | "workflow"
  | "coding-standards"
  | "git"
  | "dependencies";

// ── Frontmatter schema ────────────────────────────────────────
export interface RuleFrontmatter {
  title: string;
  impact?: RuleImpact;
  tags?: string[];
  globs?: string[];
  alwaysApply?: boolean;
  category?: RuleCategory;
}

// ── Parsed rule ────────────────────────────────────────────────
export interface Rule {
  /** Frontmatter metadata */
  meta: RuleFrontmatter;
  /** Markdown body (without frontmatter) */
  body: string;
  /** Slug derived from filename (e.g. "api-stability") */
  slug: string;
  /** Whether this is a built-in rule shipped with agentinit */
  builtin: boolean;
}

// ── Validation ─────────────────────────────────────────────────

const VALID_IMPACTS: RuleImpact[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const VALID_CATEGORIES: RuleCategory[] = [
  "architecture",
  "testing",
  "security",
  "api",
  "performance",
  "workflow",
  "coding-standards",
  "git",
  "dependencies",
];

export class RuleParseError extends Error {
  constructor(message: string, public slug: string) {
    super(`Rule "${slug}": ${message}`);
    this.name = "RuleParseError";
  }
}

/**
 * Parse a rule markdown string (with YAML frontmatter) into a Rule object.
 */
export function parseRule(
  raw: string,
  slug: string,
  builtin = false
): Rule {
  const { data, content } = matter(raw);

  if (!data.title || typeof data.title !== "string") {
    throw new RuleParseError("Missing required 'title' in frontmatter", slug);
  }

  if (data.impact && !VALID_IMPACTS.includes(data.impact)) {
    throw new RuleParseError(
      `Invalid impact "${data.impact}". Must be one of: ${VALID_IMPACTS.join(", ")}`,
      slug
    );
  }

  if (data.category && !VALID_CATEGORIES.includes(data.category)) {
    throw new RuleParseError(
      `Invalid category "${data.category}". Must be one of: ${VALID_CATEGORIES.join(", ")}`,
      slug
    );
  }

  const meta: RuleFrontmatter = {
    title: data.title,
    impact: data.impact ?? undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
    globs: Array.isArray(data.globs) ? data.globs.map(String) : undefined,
    alwaysApply: typeof data.alwaysApply === "boolean" ? data.alwaysApply : false,
    category: data.category ?? undefined,
  };

  return { meta, body: content.trim(), slug, builtin };
}

/**
 * Serialize a Rule back to markdown with YAML frontmatter.
 */
export function serializeRule(rule: Rule): string {
  const fm: Record<string, unknown> = { title: rule.meta.title };
  if (rule.meta.impact) fm.impact = rule.meta.impact;
  if (rule.meta.tags?.length) fm.tags = rule.meta.tags;
  if (rule.meta.globs?.length) fm.globs = rule.meta.globs;
  if (rule.meta.alwaysApply) fm.alwaysApply = true;
  if (rule.meta.category) fm.category = rule.meta.category;

  return matter.stringify(rule.body, fm);
}
