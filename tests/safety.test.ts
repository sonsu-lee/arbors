import { describe, test, expect, vi } from "vitest";
import { validateWorktreeName, isCurrentWorktree } from "../src/git/safety";
import type { RuntimeAdapter } from "../src/runtime/adapter";

const createMockAdapter = (overrides: Partial<RuntimeAdapter> = {}): RuntimeAdapter => ({
  exec: vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 })),
  glob: vi.fn(async () => []),
  readFile: vi.fn(async () => ""),
  writeFile: vi.fn(),
  exists: vi.fn(async () => true),
  copy: vi.fn(),
  mkdir: vi.fn(),
  ...overrides,
});

describe("validateWorktreeName", () => {
  test("should accept valid alphanumeric names", () => {
    // Given: valid worktree names
    const names = ["feature-auth", "fix.login", "release_1.0", "v2"];

    // When/Then: all should be valid
    names.forEach((name) => {
      expect(validateWorktreeName(name)).toBe(true);
    });
  });

  test("should reject names starting with special characters", () => {
    // Given: names starting with dot, dash, or underscore
    const names = [".hidden", "-flag", "_private"];

    // When/Then: all should be invalid
    names.forEach((name) => {
      expect(validateWorktreeName(name)).toBe(false);
    });
  });

  test("should reject empty strings", () => {
    // Given: an empty string
    // When: validated
    // Then: should be invalid
    expect(validateWorktreeName("")).toBe(false);
  });

  test("should reject names with path traversal", () => {
    // Given: a name containing ".."
    // When: validated
    // Then: should be invalid
    expect(validateWorktreeName("foo..bar")).toBe(false);
  });

  test("should accept names with slashes for branch conventions", () => {
    // Given: names with slashes (feature/xxx, fix/xxx patterns)
    const names = ["feature/login", "fix/ACD-123", "release/1.0"];

    // When/Then: all should be valid
    names.forEach((name) => {
      expect(validateWorktreeName(name)).toBe(true);
    });
  });

  test("should reject names with spaces or special chars", () => {
    // Given: names with spaces or special characters
    const names = ["has space", "has@at"];

    // When/Then: all should be invalid
    names.forEach((name) => {
      expect(validateWorktreeName(name)).toBe(false);
    });
  });
});

describe("isCurrentWorktree", () => {
  test("should return true when cwd matches worktree path", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({
        stdout: "/home/user/arbors/project/feature-x",
        stderr: "",
        exitCode: 0,
      })),
    });

    expect(await isCurrentWorktree(adapter, "/home/user/arbors/project/feature-x")).toBe(true);
  });

  test("should return false when cwd differs from worktree path", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({
        stdout: "/home/user/project",
        stderr: "",
        exitCode: 0,
      })),
    });

    expect(await isCurrentWorktree(adapter, "/home/user/arbors/project/feature-x")).toBe(false);
  });
});
