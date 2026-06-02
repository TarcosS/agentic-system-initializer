import type { Rule } from "./schema.js";
import type { AgentId } from "../utils/agent-selector.js";
import { cursorAdapter } from "./adapters/cursor-adapter.js";
import { claudeAdapter } from "./adapters/claude-adapter.js";
import { copilotAdapter } from "./adapters/copilot-adapter.js";
import { clineAdapter } from "./adapters/cline-adapter.js";
import { windsurfAdapter } from "./adapters/windsurf-adapter.js";
import { rooAdapter } from "./adapters/roo-adapter.js";
import { kiloAdapter } from "./adapters/kilo-adapter.js";
import { geminiAdapter } from "./adapters/gemini-adapter.js";
import { genericAdapter } from "./adapters/generic-adapter.js";

// ── Adapter interface ─────────────────────────────────────────
export interface RuleAdapter {
  /** Agent identifier */
  agentId: AgentId;
  /**
   * Convert a universal rule into agent-specific file content.
   * Returns { path, content } — the relative path and rendered content.
   */
  compile(rule: Rule, index: number): CompiledRule;
}

export interface CompiledRule {
  /** Relative path from project root (e.g. ".cursor/rules/60-api-stability.mdc") */
  path: string;
  /** File content in agent-native format */
  content: string;
  /**
   * One-line registry entry the router emitter surfaces in the thin router
   * file. Adapters return this so the router can point at the rule without
   * duplicating its body. Omit for rules the router should not advertise
   * (e.g. description-triggered rules inlined into a single instructions
   * file when an agent lacks native lazy-load).
   */
  routerLine?: string;
}

// ── Adapter registry ──────────────────────────────────────────
const adapters: Record<AgentId, RuleAdapter> = {
  "claude-code": claudeAdapter,
  cursor: cursorAdapter,
  copilot: copilotAdapter,
  cline: clineAdapter,
  windsurf: windsurfAdapter,
  "roo-code": rooAdapter,
  "kilo-code": kiloAdapter,
  "gemini-cli": geminiAdapter,
  codex: genericAdapter,
  aider: genericAdapter,
  generic: genericAdapter,
};

/**
 * Compile a single rule for a specific agent.
 * @param rule - Parsed universal rule
 * @param agent - Target agent
 * @param index - Rule ordering index (used for file numbering)
 */
export function compileRule(
  rule: Rule,
  agent: AgentId,
  index = 0
): CompiledRule {
  const adapter = adapters[agent];
  if (!adapter) {
    throw new Error(`No adapter registered for agent: ${agent}`);
  }
  return adapter.compile(rule, index);
}

/**
 * Compile multiple rules for a specific agent.
 */
export function compileRules(
  rules: Rule[],
  agent: AgentId,
  startIndex = 60
): CompiledRule[] {
  return rules.map((rule, i) => compileRule(rule, agent, startIndex + i * 10));
}

/**
 * Compile rules for all specified agents.
 */
export function compileRulesForAgents(
  rules: Rule[],
  agents: AgentId[],
  startIndex = 60
): Map<AgentId, CompiledRule[]> {
  const result = new Map<AgentId, CompiledRule[]>();
  for (const agent of agents) {
    result.set(agent, compileRules(rules, agent, startIndex));
  }
  return result;
}
