import { describe, it, expect, vi } from "vitest";
import { matchesPattern, getIgnoredFiles, copyIgnoredFiles } from "../src/git/exclude.js";
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

describe("matchesPattern", () => {
  it("should match basename when pattern has no slash", () => {
    expect(matchesPattern(".env", ".env*")).toBe(true);
    expect(matchesPattern(".env.local", ".env*")).toBe(true);
    expect(matchesPattern("frontend/apps/company/.env.development.local", ".env*")).toBe(true);
  });

  it("should not match unrelated files", () => {
    expect(matchesPattern("README.md", ".env*")).toBe(false);
    expect(matchesPattern("package.json", ".env*")).toBe(false);
  });

  it("should match full path when pattern contains slash", () => {
    expect(matchesPattern("frontend/apps/company/.env.local", "frontend/**/.env*")).toBe(true);
    expect(matchesPattern("backend/.env", "frontend/**/.env*")).toBe(false);
  });

  it("should handle exact name match without wildcard", () => {
    expect(matchesPattern(".env", ".env")).toBe(true);
    expect(matchesPattern("apps/.env", ".env")).toBe(true);
    expect(matchesPattern(".env.local", ".env")).toBe(false);
  });
});

describe("getIgnoredFiles", () => {
  it("should parse git ls-files output", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async (_cmd: string, args?: string[]) => {
        if (args?.[0] === "ls-files") {
          return { stdout: ".env\n.env.local\nfrontend/.env.development.local\n", stderr: "", exitCode: 0 };
        }
        return { stdout: "/repo", stderr: "", exitCode: 0 };
      }),
    });

    const files = await getIgnoredFiles(adapter);
    expect(files).toEqual([".env", ".env.local", "frontend/.env.development.local"]);
  });

  it("should return empty array on git command failure", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async (_cmd: string, args?: string[]) => {
        if (args?.[0] === "ls-files") {
          return { stdout: "", stderr: "error", exitCode: 1 };
        }
        return { stdout: "/repo", stderr: "", exitCode: 0 };
      }),
    });

    const files = await getIgnoredFiles(adapter);
    expect(files).toEqual([]);
  });
});

describe("copyIgnoredFiles", () => {
  it("should copy only files matching allowlist patterns", async () => {
    const copyFn = vi.fn();
    const adapter = createMockAdapter({
      exec: vi.fn(async (_cmd: string, args?: string[]) => {
        if (args?.[0] === "ls-files") {
          return {
            stdout: ".env\n.env.local\nnode_modules/.bin/tsc\ndist/index.js\nfrontend/.env.development.local\n",
            stderr: "",
            exitCode: 0,
          };
        }
        return { stdout: "/repo", stderr: "", exitCode: 0 };
      }),
      copy: copyFn,
    });

    const copied = await copyIgnoredFiles(adapter, "/worktree", [".env*"]);

    expect(copied).toEqual([".env", ".env.local", "frontend/.env.development.local"]);
    expect(copyFn).toHaveBeenCalledTimes(3);
    expect(copyFn).toHaveBeenCalledWith("/repo/.env", "/worktree/.env");
    expect(copyFn).toHaveBeenCalledWith("/repo/.env.local", "/worktree/.env.local");
    expect(copyFn).toHaveBeenCalledWith(
      "/repo/frontend/.env.development.local",
      "/worktree/frontend/.env.development.local",
    );
  });

  it("should return empty array when patterns list is empty", async () => {
    const adapter = createMockAdapter();
    const copied = await copyIgnoredFiles(adapter, "/worktree", []);
    expect(copied).toEqual([]);
  });

  it("should skip non-copyable entries", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async (_cmd: string, args?: string[]) => {
        if (args?.[0] === "ls-files") {
          return { stdout: ".env\n.env.local\n", stderr: "", exitCode: 0 };
        }
        return { stdout: "/repo", stderr: "", exitCode: 0 };
      }),
      copy: vi.fn(async (src: string) => {
        if (src === "/repo/.env.local") throw new Error("socket");
      }),
    });

    const copied = await copyIgnoredFiles(adapter, "/worktree", [".env*"]);
    expect(copied).toEqual([".env"]);
  });
});
