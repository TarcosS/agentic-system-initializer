import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRule } from "./schema.js";
import type { Rule } from "./schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirnamePath = dirname(__filename);

function getBuiltinDir(): string {
  // Bundled output: dist/rules/builtin (copied by build script)
  const bundled = join(__dirnamePath, "rules", "builtin");
  if (existsSync(bundled)) return bundled;
  // Dev / unbundled: ../rules/builtin relative to this file
  const dev = join(__dirnamePath, "builtin");
  if (existsSync(dev)) return dev;
  // Fallback: source layout
  const src = join(__dirnamePath, "..", "rules", "builtin");
  if (existsSync(src)) return src;
  // Last resort
  return bundled;
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
