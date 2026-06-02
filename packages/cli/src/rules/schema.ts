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

// ── Trigger ────────────────────────────────────────────────────
// A rule is loaded by an agent via one of three mechanisms:
//   always       → invariant; always in context
//   globs        → auto-attach when matching files are touched
//   description  → lazy / agent-requested when the description matches the task
// Exactly one variant must be populated.
export type RuleTrigger =
  | { kind: "always" }
  | { kind: "globs"; globs: string[] }
  | { kind: "description"; description: string };

// ── Frontmatter schema ────────────────────────────────────────
export interface RuleFrontmatter {
  title: string;
  impact?: RuleImpact;
  tags?: string[];
  category?: RuleCategory;
  /** Normalized trigger. Always populated after parseRule(). */
  trigger: RuleTrigger;
  /** @deprecated use trigger.globs — retained on the parsed object for callers that still read it */
  globs?: string[];
  /** @deprecated use trigger.kind === "always" — retained for compatibility */
  alwaysApply?: boolean;
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
 * Normalize trigger from frontmatter. Accepts either the new `trigger` block
 * or the legacy `alwaysApply` / `globs` fields. Throws on multi-variant
 * `trigger` blocks. Falls back to `{ kind: "always" }` when nothing is
 * specified (matches the historical default).
 */
function normalizeTrigger(data: Record<string, unknown>, slug: string): RuleTrigger {
  const explicit = data.trigger;
  if (explicit && typeof explicit === "object" && !Array.isArray(explicit)) {
    const t = explicit as Record<string, unknown>;
    const hasAlways = t.always === true;
    const hasGlobs = Array.isArray(t.globs) && t.globs.length > 0;
    const hasDescription = typeof t.description === "string" && t.description.length > 0;
    const count = Number(hasAlways) + Number(hasGlobs) + Number(hasDescription);
    if (count === 0) {
      throw new RuleParseError(
        "trigger block must contain one of: always, globs, description",
        slug
      );
    }
    if (count > 1) {
      throw new RuleParseError(
        "trigger block must contain exactly one of: always, globs, description",
        slug
      );
    }
    if (hasAlways) return { kind: "always" };
    if (hasGlobs) return { kind: "globs", globs: (t.globs as unknown[]).map(String) };
    return { kind: "description", description: t.description as string };
  }

  // Legacy normalization.
  const legacyGlobs = Array.isArray(data.globs)
    ? (data.globs as unknown[]).map(String).filter((g) => g.length > 0)
    : [];
  const legacyAlways = data.alwaysApply === true;

  // Wildcard globs (e.g. ["**/*"]) mean "everywhere" — collapse to always.
  const isWildcardOnly =
    legacyGlobs.length > 0 && legacyGlobs.every((g) => g === "**/*" || g === "*");

  if (legacyGlobs.length > 0 && !isWildcardOnly) {
    return { kind: "globs", globs: legacyGlobs };
  }
  if (legacyAlways || isWildcardOnly) {
    return { kind: "always" };
  }
  // No trigger info at all — historical default was alwaysApply: false with no
  // globs, which loaded nothing. Treat that as `always` since rules that
  // specified neither were typically referenced explicitly elsewhere.
  return { kind: "always" };
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

  const trigger = normalizeTrigger(data as Record<string, unknown>, slug);

  const meta: RuleFrontmatter = {
    title: data.title,
    impact: data.impact ?? undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
    category: data.category ?? undefined,
    trigger,
    // Legacy mirrors so older consumers still work.
    globs: trigger.kind === "globs" ? trigger.globs : undefined,
    alwaysApply: trigger.kind === "always",
  };

  return { meta, body: content.trim(), slug, builtin };
}

/**
 * Serialize a Rule back to markdown with YAML frontmatter. Always emits the
 * new `trigger` block; legacy fields are dropped on round-trip.
 */
export function serializeRule(rule: Rule): string {
  const fm: Record<string, unknown> = { title: rule.meta.title };
  if (rule.meta.impact) fm.impact = rule.meta.impact;
  if (rule.meta.tags?.length) fm.tags = rule.meta.tags;
  if (rule.meta.category) fm.category = rule.meta.category;

  const t = rule.meta.trigger;
  if (t.kind === "always") {
    fm.trigger = { always: true };
  } else if (t.kind === "globs") {
    fm.trigger = { globs: t.globs };
  } else {
    fm.trigger = { description: t.description };
  }

  return matter.stringify(rule.body, fm);
}
