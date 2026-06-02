import { describe, it, expect } from "vitest";
import { parseRule, serializeRule, RuleParseError } from "../rules/schema.js";

describe("parseRule — trigger normalization", () => {
  it("parses an explicit trigger.always block", () => {
    const raw = `---
title: T
trigger:
  always: true
---
body`;
    const rule = parseRule(raw, "t");
    expect(rule.meta.trigger).toEqual({ kind: "always" });
    expect(rule.meta.alwaysApply).toBe(true);
  });

  it("parses an explicit trigger.globs block", () => {
    const raw = `---
title: T
trigger:
  globs: ["src/api/**"]
---
body`;
    const rule = parseRule(raw, "t");
    expect(rule.meta.trigger).toEqual({ kind: "globs", globs: ["src/api/**"] });
    expect(rule.meta.globs).toEqual(["src/api/**"]);
  });

  it("parses an explicit trigger.description block", () => {
    const raw = `---
title: T
trigger:
  description: "when scope spans >1 file"
---
body`;
    const rule = parseRule(raw, "t");
    expect(rule.meta.trigger).toEqual({
      kind: "description",
      description: "when scope spans >1 file",
    });
  });

  it("rejects a trigger block with multiple variants", () => {
    const raw = `---
title: T
trigger:
  always: true
  globs: ["src/**"]
---
body`;
    expect(() => parseRule(raw, "t")).toThrow(RuleParseError);
  });

  it("rejects an empty trigger block", () => {
    const raw = `---
title: T
trigger: {}
---
body`;
    expect(() => parseRule(raw, "t")).toThrow(RuleParseError);
  });

  it("normalizes legacy alwaysApply: true to trigger.always", () => {
    const raw = `---
title: T
alwaysApply: true
---
body`;
    const rule = parseRule(raw, "t");
    expect(rule.meta.trigger).toEqual({ kind: "always" });
  });

  it("normalizes legacy globs to trigger.globs", () => {
    const raw = `---
title: T
globs: ["src/api/**"]
alwaysApply: false
---
body`;
    const rule = parseRule(raw, "t");
    expect(rule.meta.trigger).toEqual({ kind: "globs", globs: ["src/api/**"] });
  });

  it("collapses wildcard-only legacy globs to trigger.always", () => {
    const raw = `---
title: T
globs: ["**/*"]
alwaysApply: true
---
body`;
    const rule = parseRule(raw, "t");
    expect(rule.meta.trigger).toEqual({ kind: "always" });
  });

  it("prefers specific legacy globs over alwaysApply when both are set", () => {
    const raw = `---
title: T
globs: ["src/api/**"]
alwaysApply: true
---
body`;
    const rule = parseRule(raw, "t");
    expect(rule.meta.trigger).toEqual({ kind: "globs", globs: ["src/api/**"] });
  });

  it("defaults to trigger.always when no legacy or new fields are set", () => {
    const raw = `---
title: T
---
body`;
    const rule = parseRule(raw, "t");
    expect(rule.meta.trigger).toEqual({ kind: "always" });
  });

  it("rejects missing title", () => {
    const raw = `---
trigger:
  always: true
---
body`;
    expect(() => parseRule(raw, "t")).toThrow(RuleParseError);
  });
});

describe("serializeRule", () => {
  it("round-trips an always-trigger rule via the new trigger block", () => {
    const raw = `---
title: T
trigger:
  always: true
---
body`;
    const rule = parseRule(raw, "t");
    const serialized = serializeRule(rule);
    expect(serialized).toContain("trigger:");
    expect(serialized).toContain("always: true");
    expect(serialized).not.toContain("alwaysApply:");
  });

  it("round-trips a globs-trigger rule", () => {
    const raw = `---
title: T
trigger:
  globs: ["src/api/**"]
---
body`;
    const rule = parseRule(raw, "t");
    const serialized = serializeRule(rule);
    expect(serialized).toContain("globs:");
    expect(serialized).toContain("src/api/**");
  });

  it("round-trips a description-trigger rule", () => {
    const raw = `---
title: T
trigger:
  description: "agent-requested when X"
---
body`;
    const rule = parseRule(raw, "t");
    const serialized = serializeRule(rule);
    expect(serialized).toContain("description: agent-requested when X");
  });
});
