import { describe, it, expect } from "vitest";
import { claudeAdapter } from "../rules/adapters/claude-adapter.js";
import { parseRule } from "../rules/schema.js";

function compile(raw: string, slug: string, index = 60) {
  return claudeAdapter.compile(parseRule(raw, slug), index);
}

describe("claudeAdapter — three trigger variants", () => {
  it("emits .claude/rules/<NN>-<slug>.md for trigger.always", () => {
    const out = compile(
      `---
title: No Force Push
impact: CRITICAL
trigger:
  always: true
---
body`,
      "no-force-push",
      100,
    );
    expect(out.path).toBe(".claude/rules/100-no-force-push.md");
    expect(out.content).toContain("# No Force Push");
    expect(out.content).toContain("**Impact: CRITICAL**");
    expect(out.routerLine).toContain("[always]");
  });

  it("emits .claude/rules/ for trigger.globs and includes glob hint in routerLine", () => {
    const out = compile(
      `---
title: API stability
impact: CRITICAL
trigger:
  globs: ["src/api/**"]
---
body`,
      "api-stability",
      60,
    );
    expect(out.path).toBe(".claude/rules/60-api-stability.md");
    expect(out.content).toContain("**Applies to:** src/api/**");
    expect(out.routerLine).toContain("globs: src/api/**");
  });

  it("emits .claude/skills/<slug>/SKILL.md for trigger.description", () => {
    const out = compile(
      `---
title: Smallest Viable Change
impact: HIGH
trigger:
  description: "when scope spans >1 file"
---
body`,
      "smallest-viable-change",
      120,
    );
    expect(out.path).toBe(".claude/skills/smallest-viable-change/SKILL.md");
    expect(out.content).toMatch(/^---\nname: smallest-viable-change\n/);
    expect(out.content).toContain('description: "when scope spans >1 file"');
    expect(out.routerLine).toContain("[skill; load on description]");
  });
});
