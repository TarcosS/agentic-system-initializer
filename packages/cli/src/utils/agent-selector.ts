import * as p from "@clack/prompts";

export type AgentId =
  | "claude-code"
  | "cursor"
  | "codex"
  | "copilot"
  | "gemini-cli"
  | "cline"
  | "windsurf"
  | "roo-code"
  | "kilo-code"
  | "aider"
  | "generic";

export const AGENT_LABELS: Record<AgentId, string> = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  codex: "Codex CLI (OpenAI)",
  copilot: "GitHub Copilot",
  "gemini-cli": "Gemini CLI",
  cline: "Cline",
  windsurf: "Windsurf",
  "roo-code": "Roo Code",
  "kilo-code": "Kilo Code",
  aider: "Aider",
  generic: "Generic / Other",
};

export async function selectAgents(): Promise<AgentId[]> {
  const selected = await p.multiselect({
    message: "Which AI coding agents do you use? (select all that apply)",
    options: Object.entries(AGENT_LABELS).map(([value, label]) => ({
      value: value as AgentId,
      label,
    })),
    required: true,
  });

  if (p.isCancel(selected)) process.exit(0);
  return selected as AgentId[];
}
