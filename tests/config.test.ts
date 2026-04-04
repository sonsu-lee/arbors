import { describe, test, expect } from "vitest";
import { mergeConfig, loadConfig } from "../src/config";
import type { ArborConfig } from "../src/config";

describe("mergeConfig", () => {
  test("should override base values with override values", () => {
    // Given: a base config and an override with different runtime
    const base = { runtime: "bun", language: "ko" } as ArborConfig;
    const override = { runtime: "node" } as Partial<ArborConfig>;

    // When: merged
    const result = mergeConfig(base, override);

    // Then: override wins, base-only values preserved
    expect(result.runtime).toBe("node");
    expect(result.language).toBe("ko");
  });

  test("should not mutate the original base object", () => {
    // Given: a base config
    const base = { runtime: "bun", language: "en" } as ArborConfig;
    const original = structuredClone(base);

    // When: merged with an override
    mergeConfig(base, { runtime: "node" } as Partial<ArborConfig>);

    // Then: original is untouched
    expect(base).toEqual(original);
  });

  test("should return base when override is empty", () => {
    // Given: a base config and an empty override
    const base = { runtime: "node", language: "ja" } as ArborConfig;

    // When: merged with empty object
    const result = mergeConfig(base, {});

    // Then: result matches base
    expect(result).toEqual(base);
  });
});

describe("loadConfig", () => {
  const mockReadFile = (files: Record<string, string>) => async (path: string) => {
    if (Object.hasOwn(files, path)) return files[path];
    throw new Error(`File not found: ${path}`);
  };

  const mockExists = (files: Record<string, string>) => async (path: string) =>
    Object.hasOwn(files, path);

  test("should return defaults when no config files exist", async () => {
    // Given: no config files on disk
    const readFile = mockReadFile({});
    const exists = mockExists({});

    // When: config is loaded
    const config = await loadConfig(readFile, exists);

    // Then: all values are defaults
    expect(config.runtime).toBe("node");
    expect(config.language).toBe("en");
    expect(config.packageManager).toBe("auto");
    expect(config.excludeFromCopy).toEqual([
      "node_modules",
      "dist",
      "build",
      "out",
      ".next",
      ".nuxt",
      ".turbo",
      ".cache",
      "coverage",
      "*.log",
    ]);
  });

  test("should merge project config over global config", async () => {
    // Given: global sets runtime=bun, project sets runtime=node
    const home = process.env.HOME ?? "/tmp";
    const globalPath = `${home}/.arbors/config.json`;
    const projectPath = "/project/.arbors/config.json";

    const files: Record<string, string> = {
      [globalPath]: JSON.stringify({ runtime: "bun", language: "ko" }),
      [projectPath]: JSON.stringify({ runtime: "node" }),
    };

    const readFile = mockReadFile(files);
    const exists = mockExists(files);

    // When: config is loaded with a project root
    const config = await loadConfig(readFile, exists, "/project");

    // Then: project override wins, global-only values preserved
    expect(config.runtime).toBe("node");
    expect(config.language).toBe("ko");
  });

  test("should handle malformed config files gracefully", async () => {
    // Given: a global config with invalid JSON
    const home = process.env.HOME ?? "/tmp";
    const globalPath = `${home}/.arbors/config.json`;

    const files: Record<string, string> = {
      [globalPath]: "not valid json{{{",
    };

    const readFile = mockReadFile(files);
    const exists = mockExists(files);

    // When: config is loaded
    const config = await loadConfig(readFile, exists);

    // Then: falls back to defaults
    expect(config.runtime).toBe("node");
    expect(config.language).toBe("en");
  });
});
