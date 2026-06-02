import { describe, it, expect } from "vitest";
import { cursorAdapter } from "../rules/adapters/cursor-adapter.js";
import { parseRule } from "../rules/schema.js";

function compile(raw: string, slug: string, index = 60) {
  return cursorAdapter.compile(parseRule(raw, slug), index);
}

describe("cursorAdapter — three trigger variants", () => {
  it("emits .mdc with alwaysApply: true for trigger.always", () => {
    const out = compile(
      `---
title: No Force Push
trigger:
  always: true
---
body`,
      "no-force-push",
      100,
    );
    expect(out.path).toBe(".cursor/rules/100-no-force-push.mdc");
    expect(out.content).toContain("alwaysApply: true");
    expect(out.content).not.toContain("globs:");
    expect(out.routerLine).toContain("[always]");
  });

  it("emits .mdc with globs and alwaysApply: false for trigger.globs", () => {
    const out = compile(
      `---
title: API stability
trigger:
  globs: ["src/api/**", "src/routes/**"]
---
body`,
      "api-stability",
      60,
    );
    expect(out.path).toBe(".cursor/rules/60-api-stability.mdc");
    expect(out.content).toContain('globs: ["src/api/**", "src/routes/**"]');
    expect(out.content).toContain("alwaysApply: false");
    expect(out.routerLine).toContain("globs: src/api/**, src/routes/**");
  });

  it("emits agent-requested mode (description only) for trigger.description", () => {
    const out = compile(
      `---
title: Smallest Viable Change
trigger:
  description: "when scope spans >1 file"
---
body`,
      "smallest-viable-change",
      120,
    );
    expect(out.path).toBe(".cursor/rules/120-smallest-viable-change.mdc");
    expect(out.content).toContain('description: "when scope spans >1 file"');
    expect(out.content).not.toContain("alwaysApply:");
    expect(out.content).not.toContain("globs:");
    expect(out.routerLine).toContain("[description]");
  });
});
