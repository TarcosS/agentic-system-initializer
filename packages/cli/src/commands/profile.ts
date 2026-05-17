import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface UserProfile {
  role: "junior" | "mid" | "senior" | "lead" | "solo";
  domain: "frontend" | "backend" | "fullstack" | "devops" | "data" | "mobile" | "ml" | "infra";
  expertise: string[];
  workingStyle: "spec-first" | "code-first" | "mixed";
  autonomy: "high" | "medium" | "low";
  reviewStrictness: "relaxed" | "balanced" | "strict";
  securityStance: "basic" | "standard" | "paranoid";
  communication: "concise" | "detailed" | "match-my-style";
  preferences: string[];
}

export async function collectProfile(): Promise<UserProfile> {
  const role = await p.select({
    message: "What's your role and experience level?",
    options: [
      { value: "junior", label: "Junior Developer" },
      { value: "mid", label: "Mid-Level Developer" },
      { value: "senior", label: "Senior Developer" },
      { value: "lead", label: "Tech Lead / Architect" },
      { value: "solo", label: "Solo Founder / Indie" },
    ],
  });
  if (p.isCancel(role)) process.exit(0);

  const domain = await p.select({
    message: "What's your primary domain?",
    options: [
      { value: "fullstack", label: "Full-Stack" },
      { value: "frontend", label: "Frontend" },
      { value: "backend", label: "Backend" },
      { value: "devops", label: "DevOps / Platform" },
      { value: "data", label: "Data Engineering" },
      { value: "mobile", label: "Mobile" },
      { value: "ml", label: "ML / AI" },
      { value: "infra", label: "Infrastructure / Cloud" },
    ],
  });
  if (p.isCancel(domain)) process.exit(0);

  const expertiseRaw = await p.text({
    message: "What frameworks/tools are you most experienced with?",
    placeholder: "e.g., React, Next.js, PostgreSQL, AWS",
    defaultValue: "",
  });
  if (p.isCancel(expertiseRaw)) process.exit(0);
  const expertise = ((expertiseRaw as string) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const workingStyle = await p.select({
    message: "When building something non-trivial, what's your style?",
    options: [
      { value: "spec-first", label: "Spec first — plan before coding" },
      { value: "code-first", label: "Code first — iterate and refine" },
      { value: "mixed", label: "Mixed — depends on complexity" },
    ],
  });
  if (p.isCancel(workingStyle)) process.exit(0);

  const autonomy = await p.select({
    message: "How much should the AI confirm before acting?",
    options: [
      { value: "high", label: "High autonomy — just do obvious things, only ask on real ambiguity" },
      { value: "medium", label: "Medium — confirm non-trivial decisions" },
      { value: "low", label: "Low — confirm everything before acting" },
    ],
  });
  if (p.isCancel(autonomy)) process.exit(0);

  const reviewStrictness = await p.select({
    message: "When reviewing code, what should the AI flag?",
    options: [
      { value: "strict", label: "Strict — everything including style and naming" },
      { value: "balanced", label: "Balanced — bugs, security, logic, plus notable concerns" },
      { value: "relaxed", label: "Relaxed — only real problems (bugs, security, data safety)" },
    ],
  });
  if (p.isCancel(reviewStrictness)) process.exit(0);

  const communication = await p.select({
    message: "What communication style do you prefer?",
    options: [
      { value: "concise", label: "Concise — just the answer" },
      { value: "detailed", label: "Detailed — explain reasoning" },
      { value: "match-my-style", label: "Match my style — adapt to how I write" },
    ],
  });
  if (p.isCancel(communication)) process.exit(0);

  const prefsRaw = await p.text({
    message: "Any other preferences? (coding conventions, patterns you like/avoid, pet peeves)",
    placeholder: "e.g., conventional commits, prefer composition over inheritance, no barrel files",
    defaultValue: "",
  });
  if (p.isCancel(prefsRaw)) process.exit(0);
  const preferences = ((prefsRaw as string) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    role: role as UserProfile["role"],
    domain: domain as UserProfile["domain"],
    expertise,
    workingStyle: workingStyle as UserProfile["workingStyle"],
    autonomy: autonomy as UserProfile["autonomy"],
    reviewStrictness: reviewStrictness as UserProfile["reviewStrictness"],
    securityStance: "standard",
    communication: communication as UserProfile["communication"],
    preferences,
  };
}

export function profileToMarkdown(profile: UserProfile): string {
  const lines = [
    "## User profile",
    "",
    `- **Role:** ${profile.role}`,
    `- **Domain expertise:** ${profile.domain}`,
    `- **Strongest with:** ${profile.expertise.join(", ") || "not specified"}`,
    `- **Working style:** ${profile.workingStyle}`,
    `- **Autonomy preference:** ${profile.autonomy}`,
    `- **Review strictness:** ${profile.reviewStrictness}`,
    `- **Security stance:** ${profile.securityStance}`,
    `- **Communication:** ${profile.communication}`,
    "",
    "**Known preferences:**",
  ];

  if (profile.preferences.length > 0) {
    for (const pref of profile.preferences) {
      lines.push(`- ${pref}`);
    }
  } else {
    lines.push("- (none yet — will be filled as the agent learns your style)");
  }

  lines.push("");
  lines.push("**Learned over time** (agent appends here as it discovers patterns):");
  lines.push("- (empty — the agent will add entries as it works with you)");

  return lines.join("\n");
}

export function saveProfile(targetDir: string, profile: UserProfile): void {
  const profilePath = join(targetDir, ".agents", "profile.json");
  writeFileSync(profilePath, JSON.stringify(profile, null, 2));
}

export function loadProfile(targetDir: string): UserProfile | null {
  const profilePath = join(targetDir, ".agents", "profile.json");
  if (!existsSync(profilePath)) return null;
  return JSON.parse(readFileSync(profilePath, "utf-8")) as UserProfile;
}

export const profileCommand = new Command("profile")
  .description("View or update your developer profile")
  .option("--show", "Show current profile")
  .option("--reset", "Re-run the profile questionnaire")
  .action(async (options) => {
    const targetDir = process.cwd();

    if (options.show) {
      const profile = loadProfile(targetDir);
      if (!profile) {
        p.log.warn("No profile found. Run `agentinit init` first.");
        return;
      }
      console.log(profileToMarkdown(profile));
      return;
    }

    p.intro(chalk.bgCyan(" agentinit profile "));
    const profile = await collectProfile();
    saveProfile(targetDir, profile);
    p.log.success("Profile saved to .agents/profile.json");
    p.outro("Your AI agents will now adapt to your preferences.");
  });
