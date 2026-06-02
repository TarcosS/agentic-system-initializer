/**
 * Stack-driven skill catalog.
 *
 * Maps detected stack signals (frameworks, languages, infra) to curated
 * skill packages available via `npx skills add`. Phase 1 (deterministic)
 * installs these so the AI agent doesn't have to discover them in Phase 2.
 *
 * Each entry is best-effort; if a registry/skill doesn't exist or the
 * install fails (network, version mismatch), it's silently skipped.
 */

import type { ProjectAnalysis } from "../analyzers/project.js";

export interface SkillPackage {
  repo: string;
  skill?: string;
  reason: string;
}

const ALWAYS: SkillPackage[] = [
  {
    repo: "vercel-labs/skills",
    skill: "find-skills",
    reason: "Meta-skill: discover other skills via `npx skills find`",
  },
  {
    repo: "obra/superpowers",
    reason: "Mandatory universal skill pack — install whole repo on every project",
  },
  {
    repo: "mattpocock/skills",
    reason: "Mandatory universal skill pack — install whole repo on every project",
  },
];

const STACK_MAP: Array<{
  match: (a: ProjectAnalysis) => boolean;
  skills: SkillPackage[];
}> = [
  {
    match: (a) => a.languages.includes("TypeScript"),
    skills: [
      {
        repo: "wshobson/agents",
        skill: "typescript-advanced-types",
        reason: "TypeScript detected — advanced type patterns",
      },
    ],
  },
  {
    match: (a) => a.frameworks.includes("Next.js"),
    skills: [
      {
        repo: "wshobson/agents",
        skill: "nextjs-app-router-patterns",
        reason: "Next.js detected — App Router conventions",
      },
    ],
  },
  {
    match: (a) => a.frameworks.includes("React") || a.frameworks.includes("Next.js"),
    skills: [
      {
        repo: "vercel-labs/agent-skills",
        skill: "vercel-react-best-practices",
        reason: "React detected — performance + composition patterns",
      },
    ],
  },
  {
    match: (a) => a.frameworks.includes("Prisma"),
    skills: [
      {
        repo: "prisma/skills",
        skill: "prisma-client-api",
        reason: "Prisma detected — client query API",
      },
      {
        repo: "prisma/skills",
        skill: "prisma-cli",
        reason: "Prisma detected — migrations and CLI",
      },
    ],
  },
  {
    match: (a) => a.frameworks.includes("Tailwind CSS"),
    skills: [
      {
        repo: "wshobson/agents",
        skill: "tailwind-design-systems",
        reason: "Tailwind detected — design-system patterns",
      },
    ],
  },
  {
    match: (a) => a.frameworks.includes("Vue") || a.frameworks.includes("Nuxt"),
    skills: [
      {
        repo: "wshobson/agents",
        skill: "vue-composition-patterns",
        reason: "Vue detected — composition patterns",
      },
    ],
  },
];

/**
 * Compute the set of skill packages to install for this project.
 * Deduplicated by `${repo}/${skill}`.
 */
export function getSkillsForStack(analysis: ProjectAnalysis): SkillPackage[] {
  const keyOf = (s: SkillPackage) => `${s.repo}/${s.skill ?? "*"}`;
  const out: SkillPackage[] = [...ALWAYS];
  const seen = new Set(out.map(keyOf));

  for (const entry of STACK_MAP) {
    if (!entry.match(analysis)) continue;
    for (const skill of entry.skills) {
      const key = keyOf(skill);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(skill);
      }
    }
  }

  return out;
}
