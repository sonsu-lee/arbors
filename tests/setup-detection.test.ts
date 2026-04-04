import { describe, test, expect, vi } from "vitest";
import { detectPackageManager, detectRuntimeManager } from "../src/project/setup";
import type { RuntimeAdapter } from "../src/runtime/adapter";

const createMockAdapter = (existingFiles: string[]): RuntimeAdapter => ({
  exec: vi.fn(),
  glob: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(async (path: string) => existingFiles.some((f) => path.endsWith(f))),
  copy: vi.fn(),
  mkdir: vi.fn(),
});

describe("detectPackageManager", () => {
  test("should detect pnpm from lock file", async () => {
    // Given: a directory with pnpm-lock.yaml
    const adapter = createMockAdapter(["pnpm-lock.yaml"]);

    // When: package manager is detected
    const result = await detectPackageManager(adapter, "/project");

    // Then: pnpm is detected
    expect(result).toBe("pnpm");
  });

  test("should detect yarn from lock file", async () => {
    // Given: a directory with yarn.lock
    const adapter = createMockAdapter(["yarn.lock"]);

    // When: detected
    const result = await detectPackageManager(adapter, "/project");

    // Then: yarn
    expect(result).toBe("yarn");
  });

  test("should detect npm from lock file", async () => {
    // Given: a directory with package-lock.json
    const adapter = createMockAdapter(["package-lock.json"]);

    // When: detected
    const result = await detectPackageManager(adapter, "/project");

    // Then: npm
    expect(result).toBe("npm");
  });

  test("should return null when no lock file found", async () => {
    // Given: a directory with no lock files
    const adapter = createMockAdapter([]);

    // When: detected
    const result = await detectPackageManager(adapter, "/project");

    // Then: null
    expect(result).toBeNull();
  });

  test("should prioritize pnpm over yarn when both exist", async () => {
    // Given: a directory with both pnpm and yarn lock files
    const adapter = createMockAdapter(["pnpm-lock.yaml", "yarn.lock"]);

    // When: detected
    const result = await detectPackageManager(adapter, "/project");

    // Then: pnpm wins (first in priority order)
    expect(result).toBe("pnpm");
  });
});

describe("detectRuntimeManager", () => {
  test("should detect mise from mise.toml", async () => {
    // Given: a directory with mise.toml
    const adapter = createMockAdapter(["mise.toml"]);

    // When: detected
    const result = await detectRuntimeManager(adapter, "/project");

    // Then: mise
    expect(result).toBe("mise");
  });

  test("should detect nvm from .nvmrc", async () => {
    // Given: a directory with .nvmrc
    const adapter = createMockAdapter([".nvmrc"]);

    // When: detected
    const result = await detectRuntimeManager(adapter, "/project");

    // Then: nvm
    expect(result).toBe("nvm");
  });

  test("should return null when no runtime manager found", async () => {
    // Given: a directory with no runtime config files
    const adapter = createMockAdapter([]);

    // When: detected
    const result = await detectRuntimeManager(adapter, "/project");

    // Then: null
    expect(result).toBeNull();
  });
});
