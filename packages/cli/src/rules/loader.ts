import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRule } from "./schema.js";
import type { Rule } from "./schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirnamePath = dirname(__filename);

function hasMarkdownFiles(dir: string): boolean {
  if (!existsSync(dir)) return false;
  try {
    return readdirSync(dir).some((f) => f.endsWith(".md"));
  } catch {
    return false;
  }
}

function getBuiltinDir(): string {
  const candidates = [
    // Bundled output (correct layout)
    join(__dirnamePath, "rules", "builtin"),
    // Bundled output (legacy double-nested from older build script)
    join(__dirnamePath, "rules", "builtin", "builtin"),
    // Dev / unbundled: ../rules/builtin relative to this file
    join(__dirnamePath, "builtin"),
    // Source layout
    join(__dirnamePath, "..", "rules", "builtin"),
  ];
  for (const c of candidates) {
    if (hasMarkdownFiles(c)) return c;
  }
  // Last resort — first existing dir even if empty
  return candidates.find((c) => existsSync(c)) ?? candidates[0]!;
}

export const BUILTIN_RULE_SLUGS = [
  "api-stability",
  "no-secrets-in-code",
  "test-before-commit",
  "smallest-viable-change",
  "match-existing-patterns",
  "no-force-push",
  "dependency-approval",
  "error-handling-standards",
  "dispatch-discipline",
] as const;

/**
 * Load all built-in rules from the builtin directory.
 */
export function loadBuiltinRules(): Rule[] {
  const rules: Rule[] = [];
  const builtinDir = getBuiltinDir();

  if (!existsSync(builtinDir)) return rules;

  for (const file of readdirSync(builtinDir)) {
    if (!file.endsWith(".md")) continue;
    const slug = basename(file, ".md");
    const raw = readFileSync(join(builtinDir, file), "utf-8");
    rules.push(parseRule(raw, slug, true));
  }

  return rules;
}

/**
 * Get the raw content of a built-in rule file.
 */
export function getBuiltinRuleContent(slug: string): string | undefined {
  const builtinDir = getBuiltinDir();
  const filePath = join(builtinDir, `${slug}.md`);
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return undefined;
  }
}
export function getBuiltinRule(slug: string): Rule | undefined {
  const builtinDir = getBuiltinDir();
  const filePath = join(builtinDir, `${slug}.md`);
  try {
    const raw = readFileSync(filePath, "utf-8");
    return parseRule(raw, slug, true);
  } catch {
    return undefined;
  }
}
