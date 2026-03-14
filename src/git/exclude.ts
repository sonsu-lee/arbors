import { basename, join } from "node:path";
import type { RuntimeAdapter } from "../runtime/adapter";
import { getMainRepoRoot } from "./worktree";

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
  if (pattern.includes("/")) {
    // Match against full path
    return patternToRegex(pattern).test(filepath);
  }
  // Match against basename and each path segment (gitignore convention)
  const regex = patternToRegex(pattern);
  return regex.test(basename(filepath)) || filepath.split("/").some((seg) => regex.test(seg));
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
  excludePatterns: string[],
): Promise<string[]> => {
  const repoRoot = await getMainRepoRoot(adapter);
  const allIgnored = await getIgnoredFiles(adapter);
  const entries = allIgnored.filter((f) => !excludePatterns.some((p) => matchesPattern(f, p)));

  const copied: string[] = [];

  await Promise.all(
    entries.map(async (entry) => {
      const src = join(repoRoot, entry);
      const dest = join(worktreePath, entry);
      try {
        if (!(await adapter.exists(src))) return;
        await adapter.copy(src, dest);
        copied.push(entry);
      } catch {
        // Skip non-copyable entries (sockets, pipes, etc.)
      }
    }),
  );

  return copied;
};
