import { execSync, spawn } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync, createReadStream } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import type { AgentId } from "./agent-selector.js";

interface DispatchConfig {
  command: string;
  args: (promptFile: string, cwd: string) => string[];
  useStdinPipe: boolean; // pipe prompt file to stdin instead of arg
  needsFile: boolean;
  checkBinary: string;
}

const DISPATCH_MAP: Partial<Record<AgentId, DispatchConfig>> = {
  "claude-code": {
    command: "claude",
    args: (_promptFile, _cwd) => ["-p", "--verbose"],
    useStdinPipe: true, // pipe prompt via stdin for streaming
    needsFile: true,
    checkBinary: "claude",
  },
  codex: {
    command: "codex",
    args: (promptFile, _cwd) => ["--prompt-file", promptFile],
    useStdinPipe: false,
    needsFile: true,
    checkBinary: "codex",
  },
  "gemini-cli": {
    command: "gemini",
    args: (_promptFile, _cwd) => [],
    useStdinPipe: true,
    needsFile: true,
    checkBinary: "gemini",
  },
  aider: {
    command: "aider",
    args: (promptFile, _cwd) => ["--message-file", promptFile],
    useStdinPipe: false,
    needsFile: true,
    checkBinary: "aider",
  },
  copilot: {
    command: "copilot",
    args: (_promptFile, _cwd) => ["-p"],
    useStdinPipe: true,
    needsFile: true,
    checkBinary: "copilot",
  },
};

const IDE_AGENTS: AgentId[] = ["cursor", "windsurf", "roo-code", "kilo-code", "cline"];

export function canDispatch(agent: AgentId): boolean {
  return agent in DISPATCH_MAP;
}

export function isIdeAgent(agent: AgentId): boolean {
  return IDE_AGENTS.includes(agent);
}

function isBinaryAvailable(binary: string): boolean {
  try {
    execSync(`which ${binary}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function dispatchToAgent(
  agent: AgentId,
  prompt: string,
  cwd: string
): Promise<{ success: boolean; method: "cli" | "file" | "clipboard"; message: string }> {
  const config = DISPATCH_MAP[agent];

  if (!config) {
    // IDE agent — write prompt to file
    return writePromptFile(agent, prompt, cwd);
  }

  // Check if binary is available
  if (!isBinaryAvailable(config.checkBinary)) {
    p.log.warn(
      `${config.checkBinary} not found in PATH. Falling back to file output.`
    );
    return writePromptFile(agent, prompt, cwd);
  }

  // Ask for confirmation
  const confirm = await p.confirm({
    message: `Ready to send prompt to ${chalk.bold(agent)} via \`${config.command}\`. Proceed?`,
  });
  if (p.isCancel(confirm) || !confirm) {
    return writePromptFile(agent, prompt, cwd);
  }

  // Write prompt to temp file
  const promptFile = writePromptToTempFile(prompt, cwd);
  const args = config.args(promptFile, cwd);

  if (config.useStdinPipe) {
    p.log.info(`Running: cat ${promptFile} | ${config.command} ${args.join(" ")}`);
  } else {
    p.log.info(`Running: ${config.command} ${args.join(" ")}`);
  }

  // Spawn the agent process with live output
  return new Promise((resolve) => {
    const stdinMode = config.useStdinPipe ? "pipe" : "inherit";
    const child = spawn(config.command, args, {
      cwd,
      stdio: [stdinMode, "inherit", "inherit"],
      env: { ...process.env },
    });

    // Pipe prompt file to stdin if needed
    if (config.useStdinPipe && child.stdin) {
      const fileStream = createReadStream(promptFile);
      fileStream.pipe(child.stdin);
    }

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          method: "cli",
          message: `${agent} completed successfully`,
        });
      } else {
        resolve({
          success: false,
          method: "cli",
          message: `${agent} exited with code ${code}`,
        });
      }
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        method: "cli",
        message: `Failed to launch ${config.command}: ${err.message}`,
      });
    });
  });
}

function writePromptToTempFile(prompt: string, cwd: string): string {
  const dir = join(cwd, ".agents", ".tmp");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const filePath = join(dir, "init-prompt.md");
  writeFileSync(filePath, prompt);
  return filePath;
}

function writePromptFile(
  agent: AgentId,
  prompt: string,
  cwd: string
): { success: boolean; method: "file"; message: string } {
  const dir = join(cwd, ".agents", ".tmp");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${agent}-init-prompt.md`);
  writeFileSync(filePath, prompt);

  return {
    success: true,
    method: "file",
    message: `Prompt written to ${filePath}. Feed this file to your agent manually.`,
  };
}

export function getDispatchInstructions(agent: AgentId, promptFile: string): string {
  const config = DISPATCH_MAP[agent];
  if (config) {
    const args = config.args(promptFile, ".");
    return `${config.command} ${args.join(" ")}`;
  }

  // IDE agents
  switch (agent) {
    case "cursor":
      return `Open Cursor → Cmd+I → paste or reference ${promptFile}`;
    case "windsurf":
      return `Open Windsurf → Cascade → reference ${promptFile}`;
    case "cline":
      return `Open VS Code → Cline sidebar → paste from ${promptFile}`;
    case "roo-code":
      return `Open VS Code → Roo Code → paste from ${promptFile}`;
    case "kilo-code":
      return `Open VS Code → Kilo Code → paste from ${promptFile}`;
    default:
      return `Feed ${promptFile} to your agent`;
  }
}
