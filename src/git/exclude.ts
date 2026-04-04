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

export const loadIncludePatterns = async (
  adapter: RuntimeAdapter,
  repoRoot: string,
): Promise<string[]> => {
  const includePath = join(repoRoot, ".arborsinclude");
  try {
    if (!(await adapter.exists(includePath))) return [];
    const content = await adapter.readFile(includePath);
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
};

export const copyIgnoredFiles = async (
  adapter: RuntimeAdapter,
  worktreePath: string,
  excludePatterns: string[],
): Promise<string[]> => {
  const repoRoot = await getMainRepoRoot(adapter);
  const allIgnored = await getIgnoredFiles(adapter);

  // Load .arborsinclude patterns (explicit allowlist)
  const includePatterns = await loadIncludePatterns(adapter, repoRoot);

  const entries = allIgnored.filter((f) => {
    // If file matches an include pattern, always copy it (include wins over exclude)
    if (includePatterns.some((p) => matchesPattern(f, p))) {
      return true;
    }
    // Otherwise, apply exclude blocklist
    return !excludePatterns.some((p) => matchesPattern(f, p));
  });

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
