import { describe, it, expect } from "vitest";
import { copilotAdapter } from "../rules/adapters/copilot-adapter.js";
import { parseRule } from "../rules/schema.js";

function compile(raw: string, slug: string, index = 60) {
  return copilotAdapter.compile(parseRule(raw, slug), index);
}

describe("copilotAdapter — three trigger variants", () => {
  it("emits .github/instructions/*.instructions.md with applyTo:** for trigger.always", () => {
    const out = compile(
      `---
title: No Force Push
impact: CRITICAL
trigger:
  always: true
---
body`,
      "no-force-push",
    );
    expect(out.path).toBe(".github/instructions/no-force-push.instructions.md");
    expect(out.content).toContain('applyTo: "**"');
    expect(out.content).toContain("# No Force Push");
    expect(out.routerLine).toContain("[always]");
  });

  it("emits .instructions.md with applyTo:<glob> for trigger.globs", () => {
    const out = compile(
      `---
title: API stability
impact: CRITICAL
trigger:
  globs: ["src/api/**", "src/routes/**"]
---
body`,
      "api-stability",
    );
    expect(out.path).toBe(".github/instructions/api-stability.instructions.md");
    expect(out.content).toContain('applyTo: "src/api/**,src/routes/**"');
    expect(out.routerLine).toContain("globs: src/api/**, src/routes/**");
  });

  it("returns a router-inline marker for trigger.description (no native lazy)", () => {
    const out = compile(
      `---
title: Smallest Viable Change
impact: HIGH
trigger:
  description: "when scope spans >1 file"
---
body content here`,
      "smallest-viable-change",
    );
    expect(out.path).toBe(".github/instructions/smallest-viable-change.instructions.md");
    // The path-emitted file is a pointer back to the router.
    expect(out.content).toContain("description-triggered");
    // The routerLine carries the inline body via marker.
    expect(out.routerLine?.startsWith("__COPILOT_INLINE__")).toBe(true);
    expect(out.routerLine).toContain("### When: when scope spans >1 file");
    expect(out.routerLine).toContain("**Smallest Viable Change**");
    expect(out.routerLine).toContain("body content here");
  });
});
