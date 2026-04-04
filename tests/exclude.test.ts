import { describe, test, expect, vi } from "vitest";
import { matchesPattern, getIgnoredFiles, copyIgnoredFiles } from "../src/git/exclude";
import type { RuntimeAdapter } from "../src/runtime/adapter";

const MAIN_PORCELAIN = "worktree /repo\nHEAD abc\nbranch refs/heads/main";

const createMockAdapter = (overrides: Partial<RuntimeAdapter> = {}): RuntimeAdapter => ({
  exec: vi.fn(async () => ({ stdout: MAIN_PORCELAIN, stderr: "", exitCode: 0 })),
  glob: vi.fn(async () => []),
  readFile: vi.fn(async () => ""),
  writeFile: vi.fn(),
  exists: vi.fn(async () => true),
  copy: vi.fn(),
  mkdir: vi.fn(),
  ...overrides,
});

describe("matchesPattern", () => {
  test("should match basename when pattern has no slash", () => {
    expect(matchesPattern(".env", ".env*")).toBe(true);
    expect(matchesPattern(".env.local", ".env*")).toBe(true);
    expect(matchesPattern("frontend/apps/company/.env.development.local", ".env*")).toBe(true);
  });

  test("should not match unrelated files", () => {
    expect(matchesPattern("README.md", ".env*")).toBe(false);
    expect(matchesPattern("package.json", ".env*")).toBe(false);
  });

  test("should match full path when pattern contains slash", () => {
    expect(matchesPattern("frontend/apps/company/.env.local", "frontend/**/.env*")).toBe(true);
    expect(matchesPattern("backend/.env", "frontend/**/.env*")).toBe(false);
  });

  test("should handle exact name match without wildcard", () => {
    expect(matchesPattern(".env", ".env")).toBe(true);
    expect(matchesPattern("apps/.env", ".env")).toBe(true);
    expect(matchesPattern(".env.local", ".env")).toBe(false);
  });
});

describe("getIgnoredFiles", () => {
  test("should parse git ls-files output", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async (_cmd: string, args?: string[]) => {
        if (args?.[0] === "ls-files") {
          return {
            stdout: ".env\n.env.local\nfrontend/.env.development.local\n",
            stderr: "",
            exitCode: 0,
          };
        }
        return { stdout: MAIN_PORCELAIN, stderr: "", exitCode: 0 };
      }),
    });

    const files = await getIgnoredFiles(adapter);
    expect(files).toEqual([".env", ".env.local", "frontend/.env.development.local"]);
  });

  test("should return empty array on git command failure", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async (_cmd: string, args?: string[]) => {
        if (args?.[0] === "ls-files") {
          return { stdout: "", stderr: "error", exitCode: 1 };
        }
        return { stdout: MAIN_PORCELAIN, stderr: "", exitCode: 0 };
      }),
    });

    const files = await getIgnoredFiles(adapter);
    expect(files).toEqual([]);
  });
});

describe("copyIgnoredFiles", () => {
  test("should copy all ignored files except those matching exclude patterns", async () => {
    const copyFn = vi.fn();
    const adapter = createMockAdapter({
      exec: vi.fn(async (_cmd: string, args?: string[]) => {
        if (args?.[0] === "ls-files") {
          return {
            stdout:
              ".env\n.env.local\nnode_modules/.bin/tsc\ndist/index.js\nfrontend/.env.development.local\n.claude/settings.json\nCLAUDE.md\n",
            stderr: "",
            exitCode: 0,
          };
        }
        return { stdout: MAIN_PORCELAIN, stderr: "", exitCode: 0 };
      }),
      copy: copyFn,
    });

    const copied = await copyIgnoredFiles(adapter, "/worktree", ["node_modules", "dist"]);

    expect(copied).toHaveLength(5);
    expect(copied).toEqual(
      expect.arrayContaining([
        ".env",
        ".env.local",
        "frontend/.env.development.local",
        ".claude/settings.json",
        "CLAUDE.md",
      ]),
    );
    expect(copyFn).toHaveBeenCalledTimes(5);
    expect(copyFn).not.toHaveBeenCalledWith(
      "/repo/node_modules/.bin/tsc",
      "/worktree/node_modules/.bin/tsc",
    );
    expect(copyFn).not.toHaveBeenCalledWith("/repo/dist/index.js", "/worktree/dist/index.js");
  });

  test("should copy all files when exclude list is empty", async () => {
    const copyFn = vi.fn();
    const adapter = createMockAdapter({
      exec: vi.fn(async (_cmd: string, args?: string[]) => {
        if (args?.[0] === "ls-files") {
          return { stdout: ".env\nCLAUDE.md\n", stderr: "", exitCode: 0 };
        }
        return { stdout: MAIN_PORCELAIN, stderr: "", exitCode: 0 };
      }),
      copy: copyFn,
    });

    const copied = await copyIgnoredFiles(adapter, "/worktree", []);
    expect(copied).toEqual([".env", "CLAUDE.md"]);
    expect(copyFn).toHaveBeenCalledTimes(2);
  });

  test("should skip non-copyable entries", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async (_cmd: string, args?: string[]) => {
        if (args?.[0] === "ls-files") {
          return { stdout: ".env\n.env.local\n", stderr: "", exitCode: 0 };
        }
        return { stdout: MAIN_PORCELAIN, stderr: "", exitCode: 0 };
      }),
      copy: vi.fn(async (src: string) => {
        if (src === "/repo/.env.local") throw new Error("socket");
      }),
    });

    const copied = await copyIgnoredFiles(adapter, "/worktree", []);
    expect(copied).toEqual([".env"]);
  });

  test("should skip entries whose source does not exist", async () => {
    const copyFn = vi.fn();
    const adapter = createMockAdapter({
      exec: vi.fn(async (_cmd: string, args?: string[]) => {
        if (args?.[0] === "ls-files") {
          return { stdout: "backend/.env\n.env\n", stderr: "", exitCode: 0 };
        }
        return { stdout: MAIN_PORCELAIN, stderr: "", exitCode: 0 };
      }),
      exists: vi.fn(async (path: string) => !path.includes("backend/")),
      copy: copyFn,
    });

    const copied = await copyIgnoredFiles(adapter, "/worktree", []);

    expect(copied).toEqual([".env"]);
    expect(copyFn).toHaveBeenCalledTimes(1);
    expect(copyFn).not.toHaveBeenCalledWith("/repo/backend/.env", "/worktree/backend/.env");
  });
});
