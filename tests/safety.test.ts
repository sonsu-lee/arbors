import { describe, it, expect } from "vitest";
import { validateWorktreeName } from "../src/git/safety.js";

describe("validateWorktreeName", () => {
  it("should accept valid alphanumeric names", () => {
    // Given: valid worktree names
    const names = ["feature-auth", "fix.login", "release_1.0", "v2"];

    // When/Then: all should be valid
    names.forEach((name) => {
      expect(validateWorktreeName(name)).toBe(true);
    });
  });

  it("should reject names starting with special characters", () => {
    // Given: names starting with dot, dash, or underscore
    const names = [".hidden", "-flag", "_private"];

    // When/Then: all should be invalid
    names.forEach((name) => {
      expect(validateWorktreeName(name)).toBe(false);
    });
  });

  it("should reject empty strings", () => {
    // Given: an empty string
    // When: validated
    // Then: should be invalid
    expect(validateWorktreeName("")).toBe(false);
  });

  it("should reject names with path traversal", () => {
    // Given: a name containing ".."
    // When: validated
    // Then: should be invalid
    expect(validateWorktreeName("foo..bar")).toBe(false);
  });

  it("should reject names with spaces or special chars", () => {
    // Given: names with spaces or slashes
    const names = ["has space", "has/slash", "has@at"];

    // When/Then: all should be invalid
    names.forEach((name) => {
      expect(validateWorktreeName(name)).toBe(false);
    });
  });
});
