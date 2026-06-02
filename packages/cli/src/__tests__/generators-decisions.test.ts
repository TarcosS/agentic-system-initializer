import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { boundDecisionsLog, MAX_INLINE_ENTRIES } from "../generators/decisions.js";

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "decisions-test-"));
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

function writeLog(entries: Array<{ date: string; title: string; body?: string }>): void {
  const dir = join(workdir, ".agents", "memory");
  mkdirSync(dir, { recursive: true });
  const preamble = "# Decisions\n\nNewest first. Append above the previous entry.\n";
  const blocks = entries.map((e) => `## ${e.date} — ${e.title}\n\n${e.body ?? "..."}`);
  writeFileSync(join(dir, "decisions.md"), `${preamble}\n${blocks.join("\n\n")}\n`);
}

describe("boundDecisionsLog", () => {
  it("is a no-op when entry count is at or below the limit", () => {
    const entries = Array.from({ length: MAX_INLINE_ENTRIES }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      title: `entry ${i}`,
    }));
    writeLog(entries);

    const result = boundDecisionsLog(workdir);
    expect(result.kept).toBe(MAX_INLINE_ENTRIES);
    expect(result.archived).toBe(0);
    expect(result.archiveFiles).toEqual([]);
    expect(existsSync(join(workdir, ".agents", "memory", "decisions-archive"))).toBe(false);
  });

  it("archives older entries when the limit is exceeded", () => {
    const entries: Array<{ date: string; title: string; body: string }> = [];
    // Five 2026 + five 2025 + the overflow tail in 2024.
    for (let i = 0; i < 5; i++) {
      entries.push({ date: `2026-01-0${i + 1}`, title: `recent ${i}`, body: `body ${i}` });
    }
    for (let i = 0; i < MAX_INLINE_ENTRIES; i++) {
      entries.push({ date: `2024-12-${String((i % 28) + 1).padStart(2, "0")}`, title: `old ${i}`, body: `body o${i}` });
    }
    writeLog(entries);
    // Total = 5 + 20 = 25 → 5 archived
    const expectedArchived = entries.length - MAX_INLINE_ENTRIES;

    const result = boundDecisionsLog(workdir);
    expect(result.kept).toBe(MAX_INLINE_ENTRIES);
    expect(result.archived).toBe(expectedArchived);
    expect(result.archiveFiles.length).toBeGreaterThan(0);

    const live = readFileSync(join(workdir, ".agents", "memory", "decisions.md"), "utf-8");
    expect(live).toContain("recent 0");
    // The very oldest tail entries should be gone from the live file.
    expect(live).not.toContain(`old ${MAX_INLINE_ENTRIES - 1}`);

    const archived = readFileSync(
      join(workdir, ".agents", "memory", "decisions-archive", "2024.md"),
      "utf-8",
    );
    expect(archived).toContain("Decisions archive — 2024");
    expect(archived).toContain(`old ${MAX_INLINE_ENTRIES - 1}`);
  });

  it("appends to an existing yearly archive without re-writing the header", () => {
    const archiveDir = join(workdir, ".agents", "memory", "decisions-archive");
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(
      join(archiveDir, "2024.md"),
      "# Decisions archive — 2024\n\n## 2024-01-01 — seed\n\nseed body\n",
    );

    const entries: Array<{ date: string; title: string; body: string }> = [];
    for (let i = 0; i < MAX_INLINE_ENTRIES + 2; i++) {
      entries.push({ date: `2024-06-${String((i % 28) + 1).padStart(2, "0")}`, title: `entry ${i}`, body: `b${i}` });
    }
    writeLog(entries);

    boundDecisionsLog(workdir);

    const archived = readFileSync(join(archiveDir, "2024.md"), "utf-8");
    // Header must appear exactly once.
    const headerCount = archived.match(/Decisions archive — 2024/g)?.length ?? 0;
    expect(headerCount).toBe(1);
    expect(archived).toContain("seed body");
  });

  it("is idempotent on a bounded log (second run does nothing)", () => {
    const entries = Array.from({ length: MAX_INLINE_ENTRIES + 3 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      title: `e${i}`,
    }));
    writeLog(entries);

    const first = boundDecisionsLog(workdir);
    expect(first.archived).toBeGreaterThan(0);

    const second = boundDecisionsLog(workdir);
    expect(second.archived).toBe(0);
    expect(second.kept).toBe(MAX_INLINE_ENTRIES);
  });

  it("is a no-op when the log file is absent", () => {
    const result = boundDecisionsLog(workdir);
    expect(result).toEqual({ kept: 0, archived: 0, archiveFiles: [] });
  });
});
