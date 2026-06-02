/**
 * Decision-log bounding pass. Keeps the most recent `MAX_INLINE` entries
 * (H2-delimited blocks) in `.agents/memory/decisions.md`; older entries roll
 * into `.agents/memory/decisions-archive/<year>.md`, grouped by the year
 * parsed out of each entry's `YYYY-MM-DD — title` header.
 *
 * Idempotent: re-running on a bounded log is a no-op. Designed to be called
 * once per `agentinit` invocation.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";

export const MAX_INLINE_ENTRIES = 20;

export interface BoundDecisionsResult {
  /** Entries kept in the live decisions.md file. */
  kept: number;
  /** Entries moved to archive files (across all years). */
  archived: number;
  /** Year files that received new content this pass. */
  archiveFiles: string[];
}

interface ParsedEntry {
  /** Year extracted from the `## YYYY-MM-DD — ...` header, or null. */
  year: string | null;
  /** Full entry text including the leading `## ` heading. */
  text: string;
}

/**
 * Bound the decisions log at `<targetDir>/.agents/memory/decisions.md`.
 * Does nothing if the file is missing or under the inline limit.
 */
export function boundDecisionsLog(targetDir: string): BoundDecisionsResult {
  const logPath = join(targetDir, ".agents", "memory", "decisions.md");
  const result: BoundDecisionsResult = { kept: 0, archived: 0, archiveFiles: [] };

  if (!existsSync(logPath)) return result;

  const raw = readFileSync(logPath, "utf-8");
  const { preamble, entries } = parseLog(raw);

  if (entries.length <= MAX_INLINE_ENTRIES) {
    result.kept = entries.length;
    return result;
  }

  // Newest first — keep the head, archive the tail.
  const keep = entries.slice(0, MAX_INLINE_ENTRIES);
  const archive = entries.slice(MAX_INLINE_ENTRIES);

  // Rewrite the live file with just the kept entries.
  const newContent = composeLog(preamble, keep);
  writeFileSync(logPath, newContent);
  result.kept = keep.length;

  // Group archive entries by year and append to per-year files.
  const archiveDir = join(targetDir, ".agents", "memory", "decisions-archive");
  if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });

  const byYear = new Map<string, ParsedEntry[]>();
  for (const e of archive) {
    const year = e.year ?? "undated";
    const bucket = byYear.get(year) ?? [];
    bucket.push(e);
    byYear.set(year, bucket);
  }

  for (const [year, group] of byYear) {
    const archivePath = join(archiveDir, `${year}.md`);
    const existed = existsSync(archivePath);
    const header = existed ? "" : `# Decisions archive — ${year}\n\n`;
    const block = group.map((e) => e.text).join("\n\n") + "\n";
    if (existed) {
      // Append separator only if the file does not already end with two
      // newlines.
      const tail = readFileSync(archivePath, "utf-8");
      const needsSep = !tail.endsWith("\n\n");
      appendFileSync(archivePath, (needsSep ? "\n\n" : "") + block);
    } else {
      ensureDir(dirname(archivePath));
      writeFileSync(archivePath, header + block);
    }
    result.archiveFiles.push(archivePath);
    result.archived += group.length;
  }

  return result;
}

interface ParsedLog {
  /** Everything before the first `## ` heading (title, intro paragraph, etc.). */
  preamble: string;
  /** Entries in document order — newest-first by convention. */
  entries: ParsedEntry[];
}

function parseLog(raw: string): ParsedLog {
  const lines = raw.split("\n");
  const entries: ParsedEntry[] = [];
  const preambleLines: string[] = [];

  let current: { headerYear: string | null; body: string[] } | null = null;

  const flush = () => {
    if (current) {
      entries.push({ year: current.headerYear, text: current.body.join("\n").trimEnd() });
      current = null;
    }
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flush();
      const yearMatch = /^##\s+(\d{4})-\d{2}-\d{2}\b/.exec(line);
      current = { headerYear: yearMatch ? yearMatch[1]! : null, body: [line] };
    } else if (current) {
      current.body.push(line);
    } else {
      preambleLines.push(line);
    }
  }
  flush();

  return { preamble: preambleLines.join("\n").trimEnd(), entries };
}

function composeLog(preamble: string, entries: ParsedEntry[]): string {
  const parts: string[] = [];
  if (preamble.length > 0) {
    parts.push(preamble);
    parts.push("");
  }
  for (const e of entries) {
    parts.push(e.text);
    parts.push("");
  }
  return parts.join("\n").trimEnd() + "\n";
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
