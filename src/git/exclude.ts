import { join } from "node:path";
import type { RuntimeAdapter } from "../runtime/adapter.js";
import { getRepoRoot } from "./worktree.js";

export const getExcludePatterns = async (adapter: RuntimeAdapter): Promise<string[]> => {
  const repoRoot = await getRepoRoot(adapter);
  const excludePath = join(repoRoot, ".git", "info", "exclude");

  if (!(await adapter.exists(excludePath))) return [];

  const content = await adapter.readFile(excludePath);

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
};

export const findExcludedEntries = async (
  adapter: RuntimeAdapter,
  patterns: string[],
): Promise<string[]> => {
  const repoRoot = await getRepoRoot(adapter);
  const cleaned = patterns.map((p) => p.replace(/^\//, ""));

  const groups = await Promise.all(
    cleaned.map((pattern) => adapter.glob(pattern, repoRoot)),
  );

  return [...new Set(groups.flat())].sort();
};

export const copyExcludedFiles = async (
  adapter: RuntimeAdapter,
  worktreePath: string,
  skipPatterns: string[] = [],
): Promise<string[]> => {
  const patterns = await getExcludePatterns(adapter);
  if (patterns.length === 0) return [];

  const repoRoot = await getRepoRoot(adapter);
  const allEntries = await findExcludedEntries(adapter, patterns);
  const entries = allEntries.filter(
    (e) => !skipPatterns.some((s) => e === s || e.startsWith(`${s}/`)),
  );

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
