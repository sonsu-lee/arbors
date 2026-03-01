import { describe, it, expect, vi } from "vitest";
import { getExcludePatterns, findExcludedEntries, copyExcludedFiles } from "../src/git/exclude.js";
import type { RuntimeAdapter } from "../src/runtime/adapter.js";

const createMockAdapter = (overrides: Partial<RuntimeAdapter> = {}): RuntimeAdapter => ({
  exec: vi.fn(async () => ({ stdout: "/repo", stderr: "", exitCode: 0 })),
  glob: vi.fn(async () => []),
  readFile: vi.fn(async () => ""),
  writeFile: vi.fn(),
  exists: vi.fn(async () => true),
  copy: vi.fn(),
  mkdir: vi.fn(),
  ...overrides,
});

describe("getExcludePatterns", () => {
  it("should parse patterns from exclude file", async () => {
    // Given: an exclude file with patterns, comments, and blank lines
    const adapter = createMockAdapter({
      readFile: vi.fn(async () => "# comment\n.env\n\nnode_modules\n# another comment\n.secret\n"),
    });

    // When: patterns are extracted
    const patterns = await getExcludePatterns(adapter);

    // Then: only non-empty, non-comment lines are returned
    expect(patterns).toEqual([".env", "node_modules", ".secret"]);
  });

  it("should return empty array when exclude file does not exist", async () => {
    // Given: no exclude file
    const adapter = createMockAdapter({
      exists: vi.fn(async () => false),
    });

    // When: patterns are extracted
    const patterns = await getExcludePatterns(adapter);

    // Then: empty array
    expect(patterns).toEqual([]);
  });

  it("should trim whitespace from patterns", async () => {
    // Given: patterns with extra whitespace
    const adapter = createMockAdapter({
      readFile: vi.fn(async () => "  .env  \n  node_modules  \n"),
    });

    // When: patterns are extracted
    const patterns = await getExcludePatterns(adapter);

    // Then: patterns are trimmed
    expect(patterns).toEqual([".env", "node_modules"]);
  });
});

describe("findExcludedEntries", () => {
  it("should glob each pattern and deduplicate results", async () => {
    // Given: patterns that match overlapping entries
    const adapter = createMockAdapter({
      glob: vi.fn(async (pattern: string) => {
        if (pattern === ".env") return [".env"];
        if (pattern === ".env*") return [".env", ".env.local"];
        return [];
      }),
    });

    // When: excluded entries are found
    const entries = await findExcludedEntries(adapter, [".env", ".env*"]);

    // Then: duplicates are removed and sorted
    expect(entries).toEqual([".env", ".env.local"]);
  });

  it("should strip leading slashes from patterns", async () => {
    // Given: a pattern with a leading slash
    const globFn = vi.fn(async () => ["secret.key"]);
    const adapter = createMockAdapter({ glob: globFn });

    // When: excluded entries are found
    await findExcludedEntries(adapter, ["/secret.key"]);

    // Then: glob is called without the leading slash
    expect(globFn).toHaveBeenCalledWith("secret.key", "/repo");
  });
});

describe("copyExcludedFiles", () => {
  it("should copy each excluded file to the worktree", async () => {
    // Given: exclude patterns that match two files
    const copyFn = vi.fn();
    const mkdirFn = vi.fn();
    const adapter = createMockAdapter({
      readFile: vi.fn(async () => ".env\n"),
      glob: vi.fn(async () => [".env"]),
      copy: copyFn,
      mkdir: mkdirFn,
    });

    // When: excluded files are copied
    const copied = await copyExcludedFiles(adapter, "/worktree");

    // Then: files are copied from repo root to worktree
    expect(copied).toEqual([".env"]);
    expect(copyFn).toHaveBeenCalledWith("/repo/.env", "/worktree/.env");
  });

  it("should return empty array when no exclude patterns exist", async () => {
    // Given: no patterns in exclude file
    const adapter = createMockAdapter({
      readFile: vi.fn(async () => ""),
    });

    // When: copy is attempted
    const copied = await copyExcludedFiles(adapter, "/worktree");

    // Then: nothing is copied
    expect(copied).toEqual([]);
  });
});
