import { basename, join } from "node:path";
import type { RuntimeAdapter } from "../runtime/adapter.js";
import { getRepoRoot } from "./worktree.js";

/**
 * Convert a glob-like pattern to a RegExp.
 * Supports `*` (any chars except `/`) and `**` (any chars including `/`).
 */
const patternToRegex = (pattern: string): RegExp => {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\0")
    .replace(/\*/g, "[^/]*")
    .replace(/\0/g, ".*");
  return new RegExp(`^${escaped}$`);
};

export const matchesPattern = (filepath: string, pattern: string): boolean => {
  // If pattern contains `/`, match against full path
  // Otherwise, match against basename (gitignore convention)
  const target = pattern.includes("/") ? filepath : basename(filepath);
  return patternToRegex(pattern).test(target);
};

export const getIgnoredFiles = async (adapter: RuntimeAdapter): Promise<string[]> => {
  const { stdout, exitCode } = await adapter.exec("git", [
    "ls-files",
    "--others",
    "--ignored",
    "--exclude-standard",
  ]);

  if (exitCode !== 0 || !stdout) return [];

  return stdout.split("\n").filter(Boolean);
};

export const copyIgnoredFiles = async (
  adapter: RuntimeAdapter,
  worktreePath: string,
  patterns: string[],
): Promise<string[]> => {
  if (patterns.length === 0) return [];

  const repoRoot = await getRepoRoot(adapter);
  const allIgnored = await getIgnoredFiles(adapter);
  const entries = allIgnored.filter((f) => patterns.some((p) => matchesPattern(f, p)));

  const copied: string[] = [];

  await Promise.all(
    entries.map(async (entry) => {
      const src = join(repoRoot, entry);
      const dest = join(worktreePath, entry);
      try {
        await adapter.copy(src, dest);
        copied.push(entry);
      } catch {
        // Skip non-copyable entries (sockets, pipes, etc.)
      }
    }),
  );

  return copied;
};
