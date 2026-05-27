import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";

interface SectionMeta {
  id: string;
  title: string;
  path: string;
  lineStart: number;
  lineEnd: number;
  size: number;
  sha256: string;
}

interface Manifest {
  version: string;
  generatedAt: string;
  sourceFile: string;
  sourceHash: string;
  sections: SectionMeta[];
}

const AGENT_SECTION_MAP: Record<string, string> = {
  "Claude Code": "claude-code",
  Cursor: "cursor",
  "Codex CLI": "codex-cli",
  Cline: "cline",
  Windsurf: "windsurf",
  "Roo Code": "roo-code",
  "Kilo Code": "kilo-code",
  "GitHub Copilot": "github-copilot",
  "Gemini CLI": "gemini-cli",
  Aider: "aider",
  "Generic AGENTS.md fallback": "generic",
  "Universal Files": "universal-files",
};

const COMMON_SECTIONS: { pattern: RegExp; id: string }[] = [
  { pattern: /^## How this file works/, id: "header" },
  { pattern: /^## Step 0 — Detailed project analysis/, id: "step0" },
  { pattern: /^## Step 0b — User profiling/, id: "step0b" },
  { pattern: /^## Step 1 — Skills discovery/, id: "step1" },
  { pattern: /^## Skills discovery coverage report/, id: "step1-coverage" },
  { pattern: /^## Step 2 — Team assembly/, id: "step2" },
  { pattern: /^## Step 3 — Multi-agent coexistence/, id: "step3" },
  { pattern: /^## Step 4 — Validation/, id: "step4" },
  { pattern: /^## What this scaffold delivers/, id: "capabilities" },
  { pattern: /^## Index/, id: "index" },
];

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function getCategory(id: string): string {
  if (Object.values(AGENT_SECTION_MAP).includes(id) && id !== "universal-files") {
    return "agents";
  }
  if (id === "universal-files") {
    return "universal";
  }
  return "common";
}

interface ParsedSection {
  id: string;
  title: string;
  lineStart: number;
  lineEnd: number;
  content: string;
}

function parseDocument(lines: string[]): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let currentSection: Partial<ParsedSection> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Check for agent sections: "## Section: <Name>"
    const agentMatch = line.match(/^## Section:\s*(.+)$/);
    if (agentMatch) {
      if (currentSection?.id) {
        currentSection.lineEnd = i - 1;
        currentSection.content = lines.slice(currentSection.lineStart!, i).join("\n");
        sections.push(currentSection as ParsedSection);
      }
      const name = agentMatch[1]!.trim();
      const id = AGENT_SECTION_MAP[name] ?? name.toLowerCase().replace(/\s+/g, "-");
      currentSection = { id, title: `Section: ${name}`, lineStart: i, lineEnd: -1, content: "" };
      continue;
    }

    // Check for common sections
    for (const { pattern, id } of COMMON_SECTIONS) {
      if (pattern.test(line)) {
        if (currentSection?.id) {
          currentSection.lineEnd = i - 1;
          currentSection.content = lines.slice(currentSection.lineStart!, i).join("\n");
          sections.push(currentSection as ParsedSection);
        }
        const title = line.replace(/^#+\s*/, "").trim();
        currentSection = { id, title, lineStart: i, lineEnd: -1, content: "" };
        break;
      }
    }
  }

  // Close last section
  if (currentSection?.id) {
    currentSection.lineEnd = lines.length - 1;
    currentSection.content = lines.slice(currentSection.lineStart!, lines.length).join("\n");
    sections.push(currentSection as ParsedSection);
  }

  return sections;
}

export function splitSections(specPath: string, outDir: string): Manifest {
  const source = readFileSync(specPath, "utf-8");
  const lines = source.split("\n");
  const version = JSON.parse(readFileSync(join(dirname(specPath), "packages/cli/package.json"), "utf-8")).version;

  const versionDir = join(outDir, `v${version}`);
  const sectionsDir = join(versionDir, "sections");

  for (const sub of ["common", "agents", "universal"]) {
    const dir = join(sectionsDir, sub);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  const parsed = parseDocument(lines);
  const sectionMetas: SectionMeta[] = [];

  for (const section of parsed) {
    const category = getCategory(section.id);
    const relativePath = `sections/${category}/${section.id}.md`;
    const fullPath = join(versionDir, relativePath);

    writeFileSync(fullPath, section.content, "utf-8");

    sectionMetas.push({
      id: section.id,
      title: section.title,
      path: relativePath,
      lineStart: section.lineStart + 1, // 1-based
      lineEnd: section.lineEnd + 1,
      size: Buffer.byteLength(section.content),
      sha256: sha256(section.content),
    });
  }

  const manifest: Manifest = {
    version,
    generatedAt: new Date().toISOString(),
    sourceFile: "agentic-system-initializer.md",
    sourceHash: sha256(source),
    sections: sectionMetas,
  };

  writeFileSync(join(versionDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");

  // Also copy built-in rules to CDN output
  copyBuiltinRules(versionDir);

  return manifest;
}

function copyBuiltinRules(versionDir: string): void {
  // versionDir = <root>/dist/cdn/v0.1.0 → go up 3 levels to root
  const rootDir = join(versionDir, "..", "..", "..");
  const builtinSrc = join(rootDir, "packages", "cli", "src", "rules", "builtin");
  const rulesDir = join(versionDir, "rules");

  if (!existsSync(builtinSrc)) {
    console.warn("⚠️  Built-in rules dir not found, skipping rules copy");
    return;
  }

  if (!existsSync(rulesDir)) mkdirSync(rulesDir, { recursive: true });

  const rulesMeta: { slug: string; path: string; size: number; sha256: string }[] = [];

  const files = readdirSync(builtinSrc).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const content = readFileSync(join(builtinSrc, file), "utf-8");
    const destPath = join(rulesDir, file);
    writeFileSync(destPath, content, "utf-8");

    rulesMeta.push({
      slug: file.replace(/\.md$/, ""),
      path: `rules/${file}`,
      size: Buffer.byteLength(content),
      sha256: sha256(content),
    });
  }

  const rulesManifest = {
    version: JSON.parse(readFileSync(join(rootDir, "packages", "cli", "package.json"), "utf-8")).version,
    generatedAt: new Date().toISOString(),
    rules: rulesMeta,
  };

  writeFileSync(join(rulesDir, "rules-manifest.json"), JSON.stringify(rulesManifest, null, 2), "utf-8");
  console.log(`   📏 ${rulesMeta.length} built-in rules copied to rules/`);
}

// CLI entry point
if (process.argv[1]?.endsWith("split-sections.ts") || process.argv[1]?.endsWith("split-sections.js")) {
  const root = process.argv[2] ?? process.cwd();
  const specPath = join(root, "agentic-system-initializer.md");
  const outDir = join(root, "dist", "cdn");

  if (!existsSync(specPath)) {
    console.error(`❌ Not found: ${specPath}`);
    process.exit(1);
  }

  const manifest = splitSections(specPath, outDir);
  console.log(`✅ Split into ${manifest.sections.length} sections → dist/cdn/v${manifest.version}/`);
  console.log(`   Manifest: dist/cdn/v${manifest.version}/manifest.json`);
  for (const s of manifest.sections) {
    console.log(`   ${s.path} (${s.size} bytes)`);
  }
}
