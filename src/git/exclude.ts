import { dirname, join } from "node:path";
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

export const findExcludedFiles = async (
  adapter: RuntimeAdapter,
  patterns: string[],
): Promise<string[]> => {
  const repoRoot = await getRepoRoot(adapter);

  const cleaned = patterns.map((p) => p.replace(/^\//, ""));
  const expanded = cleaned.flatMap((p) => [p, `${p}/**`]);

  const fileGroups = await Promise.all(
    expanded.map((pattern) => adapter.glob(pattern, repoRoot)),
  );

  return [...new Set(fileGroups.flat())].sort();
};

export const copyExcludedFiles = async (
  adapter: RuntimeAdapter,
  worktreePath: string,
): Promise<string[]> => {
  const patterns = await getExcludePatterns(adapter);
  if (patterns.length === 0) return [];

  const repoRoot = await getRepoRoot(adapter);
  const files = await findExcludedFiles(adapter, patterns);

  const copied: string[] = [];

  await Promise.all(
    files.map(async (file) => {
      const src = join(repoRoot, file);
      const dest = join(worktreePath, file);
      try {
        await adapter.mkdir(dirname(dest));
        await adapter.copyFile(src, dest);
        copied.push(file);
      } catch {
        // Skip non-copyable files (sockets, pipes, etc.)
      }
    }),
  );

  return copied;
};
