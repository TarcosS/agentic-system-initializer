import { describe, it, expect } from "vitest";
import { generateRouter } from "../generators/router.js";
import { compileRules } from "../rules/compiler.js";
import { parseRule } from "../rules/schema.js";
import type { UserProfile } from "../commands/profile.js";
import type { ProjectAnalysis } from "../analyzers/project.js";

const profile: UserProfile = {
  role: "senior",
  domain: "fullstack",
  expertise: ["TypeScript", "React"],
  workingStyle: "spec-first",
  autonomy: "high",
  reviewStrictness: "balanced",
  securityStance: "standard",
  communication: "concise",
  preferences: [],
};

const analysis: ProjectAnalysis = {
  name: "test-app",
  languages: ["TypeScript"],
  frameworks: ["Next.js"],
  packageManager: "pnpm",
  testFramework: ["vitest"],
  ci: ["github-actions"],
  deployTarget: [],
  hasDocker: false,
  hasTerraform: false,
  hasDatabase: false,
  monorepo: true,
  signals: [],
};

function makeRules() {
  return [
    parseRule(
      `---
title: No Force Push
impact: CRITICAL
trigger:
  always: true
---
body`,
      "no-force-push",
    ),
    parseRule(
      `---
title: API stability
impact: CRITICAL
trigger:
  globs: ["src/api/**"]
---
body`,
      "api-stability",
    ),
    parseRule(
      `---
title: Smallest Viable Change
impact: HIGH
trigger:
  description: "when scope spans >1 file"
---
body`,
      "smallest-viable-change",
    ),
  ];
}

describe("generateRouter — claude-code", () => {
  it("emits CLAUDE.md with all seven sections", () => {
    const compiled = compileRules(makeRules(), "claude-code");
    const out = generateRouter(profile, analysis, compiled, "claude-code");

    expect(out.path).toBe("CLAUDE.md");
    expect(out.content).toContain("# CLAUDE.md");
    expect(out.content).toContain("## User profile");
    expect(out.content).toContain("## Project");
    expect(out.content).toContain("## Dispatch");
    expect(out.content).toContain("## Rules registry");
    expect(out.content).toContain("## Skills (load on demand)");
    expect(out.content).toContain("## Sub-agents");
    expect(out.content).toContain("## Gotchas");
    expect(out.content).toContain("## Decision log");
    // Dispatch matrix should be the full Claude form mentioning sub-agents.
    expect(out.content).toContain("researcher");
    expect(out.content).toContain("adversarial-reviewer");
  });

  it("includes routerLine descriptors for every compiled rule", () => {
    const compiled = compileRules(makeRules(), "claude-code");
    const out = generateRouter(profile, analysis, compiled, "claude-code");
    expect(out.content).toContain("no-force-push");
    expect(out.content).toContain("api-stability");
    expect(out.content).toContain("smallest-viable-change");
  });

  it("stays under 120 lines for a 3-rule project", () => {
    const compiled = compileRules(makeRules(), "claude-code");
    const out = generateRouter(profile, analysis, compiled, "claude-code");
    const lines = out.content.split("\n").length;
    expect(lines).toBeLessThan(120);
  });
});

describe("generateRouter — cursor", () => {
  it("emits .cursor/rules/00-router.mdc with alwaysApply:true frontmatter", () => {
    const compiled = compileRules(makeRules(), "cursor");
    const out = generateRouter(profile, analysis, compiled, "cursor");

    expect(out.path).toBe(".cursor/rules/00-router.mdc");
    expect(out.content.startsWith("---\n")).toBe(true);
    expect(out.content).toContain("alwaysApply: true");
    expect(out.content).not.toContain("## Skills (load on demand)");
    expect(out.content).not.toContain("## Sub-agents");
    // Degraded dispatch (no sub-agent table).
    expect(out.content).toContain("read-only pass");
  });
});

describe("generateRouter — copilot", () => {
  it("emits .github/copilot-instructions.md", () => {
    const compiled = compileRules(makeRules(), "copilot");
    const out = generateRouter(profile, analysis, compiled, "copilot");
    expect(out.path).toBe(".github/copilot-instructions.md");
  });

  it("inlines description-triggered rules under a When section", () => {
    const compiled = compileRules(makeRules(), "copilot");
    const out = generateRouter(profile, analysis, compiled, "copilot");
    expect(out.content).toContain("## Description-triggered rules");
    expect(out.content).toContain("### When: when scope spans >1 file");
    expect(out.content).toContain("**Smallest Viable Change**");
    // Marker must never leak into the rendered output.
    expect(out.content).not.toContain("__COPILOT_INLINE__");
  });

  it("does not list Claude sub-agents", () => {
    const compiled = compileRules(makeRules(), "copilot");
    const out = generateRouter(profile, analysis, compiled, "copilot");
    expect(out.content).not.toContain("## Sub-agents");
  });
});

describe("generateRouter — registry fallback", () => {
  it("shows a no-rules placeholder when compiled list is empty", () => {
    const out = generateRouter(profile, analysis, [], "claude-code");
    expect(out.content).toContain("No rules installed");
  });
});
