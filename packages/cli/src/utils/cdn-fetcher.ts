import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { type CdnConfig, getCdnVersionUrl } from "../config.js";

export interface SectionMeta {
  id: string;
  title: string;
  path: string;
  lineStart: number;
  lineEnd: number;
  size: number;
  sha256: string;
}

export interface CdnManifest {
  version: string;
  generatedAt: string;
  sourceFile: string;
  sourceHash: string;
  sections: SectionMeta[];
}

function getCacheDir(config: CdnConfig, version: string): string {
  return join(homedir(), config.cacheDir, `v${version}`);
}

async function fetchWithRetry(url: string, config: CdnConfig): Promise<string> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < config.retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

function verifySha256(content: string, expected: string): boolean {
  const actual = createHash("sha256").update(content).digest("hex");
  return actual === expected;
}

export async function fetchManifest(version: string, config: CdnConfig): Promise<CdnManifest> {
  const cacheDir = getCacheDir(config, version);
  const cachedManifest = join(cacheDir, "manifest.json");

  // Offline mode: use cache only
  if (config.offline) {
    if (existsSync(cachedManifest)) {
      return JSON.parse(readFileSync(cachedManifest, "utf-8")) as CdnManifest;
    }
    throw new Error(`Offline mode: no cached manifest for v${version}`);
  }

  const baseUrl = getCdnVersionUrl(config, version);
  const url = `${baseUrl}/manifest.json`;

  try {
    const text = await fetchWithRetry(url, config);
    const manifest = JSON.parse(text) as CdnManifest;

    // Cache the manifest
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cachedManifest, text, "utf-8");

    return manifest;
  } catch (error) {
    // Fallback to cache
    if (existsSync(cachedManifest)) {
      return JSON.parse(readFileSync(cachedManifest, "utf-8")) as CdnManifest;
    }
    throw error;
  }
}

export async function fetchSection(
  sectionId: string,
  version: string,
  config: CdnConfig,
  manifest?: CdnManifest,
): Promise<string> {
  const resolved = manifest ?? (await fetchManifest(version, config));
  const meta = resolved.sections.find((s) => s.id === sectionId);

  if (!meta) {
    throw new Error(`Section "${sectionId}" not found in manifest v${version}`);
  }

  const cacheDir = getCacheDir(config, version);
  const cachedFile = join(cacheDir, meta.path);

  // Check cache with hash validation
  if (existsSync(cachedFile)) {
    const cached = readFileSync(cachedFile, "utf-8");
    if (verifySha256(cached, meta.sha256)) {
      return cached;
    }
  }

  // Offline mode: cache miss
  if (config.offline) {
    if (existsSync(cachedFile)) {
      return readFileSync(cachedFile, "utf-8");
    }
    throw new Error(`Offline mode: section "${sectionId}" not cached for v${version}`);
  }

  // Fetch from CDN
  const baseUrl = getCdnVersionUrl(config, version);
  const url = `${baseUrl}/${meta.path}`;
  const content = await fetchWithRetry(url, config);

  // Verify integrity
  if (!verifySha256(content, meta.sha256)) {
    throw new Error(`Integrity check failed for section "${sectionId}" — hash mismatch`);
  }

  // Cache
  const cacheSubDir = join(cacheDir, ...meta.path.split("/").slice(0, -1));
  if (!existsSync(cacheSubDir)) mkdirSync(cacheSubDir, { recursive: true });
  writeFileSync(cachedFile, content, "utf-8");

  return content;
}

export async function fetchAgentAndUniversal(
  agentId: string,
  version: string,
  config: CdnConfig,
): Promise<{ agentSection: string; universalSection: string; manifest: CdnManifest }> {
  const manifest = await fetchManifest(version, config);

  // Map CLI agent IDs to CDN section IDs
  const agentSectionMap: Record<string, string> = {
    "claude-code": "claude-code",
    cursor: "cursor",
    codex: "codex-cli",
    copilot: "github-copilot",
    "gemini-cli": "gemini-cli",
    cline: "cline",
    windsurf: "windsurf",
    "roo-code": "roo-code",
    "kilo-code": "kilo-code",
    aider: "aider",
    generic: "generic",
  };

  const sectionId = agentSectionMap[agentId] ?? agentId;

  const [agentSection, universalSection] = await Promise.all([
    fetchSection(sectionId, version, config, manifest),
    fetchSection("universal-files", version, config, manifest),
  ]);

  return { agentSection, universalSection, manifest };
}

// ── Rules CDN Fetcher ─────────────────────────────────────────

export interface RulesManifest {
  version: string;
  generatedAt: string;
  rules: {
    slug: string;
    path: string;
    size: number;
    sha256: string;
  }[];
}

export async function fetchRulesManifest(
  version: string,
  config: CdnConfig,
): Promise<RulesManifest> {
  const cacheDir = getCacheDir(config, version);
  const cachedPath = join(cacheDir, "rules", "rules-manifest.json");

  if (config.offline) {
    if (existsSync(cachedPath)) {
      return JSON.parse(readFileSync(cachedPath, "utf-8")) as RulesManifest;
    }
    throw new Error(`Offline mode: no cached rules manifest for v${version}`);
  }

  const baseUrl = getCdnVersionUrl(config, version);
  const url = `${baseUrl}/rules/rules-manifest.json`;

  try {
    const text = await fetchWithRetry(url, config);
    const manifest = JSON.parse(text) as RulesManifest;

    const dir = join(cacheDir, "rules");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(cachedPath, text, "utf-8");

    return manifest;
  } catch (error) {
    if (existsSync(cachedPath)) {
      return JSON.parse(readFileSync(cachedPath, "utf-8")) as RulesManifest;
    }
    throw error;
  }
}

export async function fetchBuiltinRule(
  slug: string,
  version: string,
  config: CdnConfig,
  rulesManifest?: RulesManifest,
): Promise<string> {
  const manifest = rulesManifest ?? (await fetchRulesManifest(version, config));
  const meta = manifest.rules.find((r) => r.slug === slug);

  if (!meta) {
    throw new Error(`Built-in rule "${slug}" not found in rules manifest v${version}`);
  }

  const cacheDir = getCacheDir(config, version);
  const cachedFile = join(cacheDir, meta.path);

  if (existsSync(cachedFile)) {
    const cached = readFileSync(cachedFile, "utf-8");
    if (verifySha256(cached, meta.sha256)) return cached;
  }

  if (config.offline) {
    if (existsSync(cachedFile)) return readFileSync(cachedFile, "utf-8");
    throw new Error(`Offline mode: rule "${slug}" not cached`);
  }

  const baseUrl = getCdnVersionUrl(config, version);
  const url = `${baseUrl}/${meta.path}`;
  const content = await fetchWithRetry(url, config);

  if (!verifySha256(content, meta.sha256)) {
    throw new Error(`Integrity check failed for rule "${slug}"`);
  }

  const dir = join(cacheDir, "rules");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(cachedFile, content, "utf-8");

  return content;
}

export async function fetchAllBuiltinRules(
  version: string,
  config: CdnConfig,
): Promise<{ slug: string; content: string }[]> {
  const manifest = await fetchRulesManifest(version, config);

  const results = await Promise.all(
    manifest.rules.map(async (meta) => ({
      slug: meta.slug,
      content: await fetchBuiltinRule(meta.slug, version, config, manifest),
    })),
  );

  return results;
}
