import { describe, test, expect, beforeAll } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const DIST = resolve(import.meta.dirname, "..", "dist");
const ENTRY = resolve(DIST, "arbors.js");

let bundleContent: string;

beforeAll(async () => {
  execFileSync("pnpm", ["build"], {
    cwd: resolve(import.meta.dirname, ".."),
  });
  bundleContent = await readFile(ENTRY, "utf-8");
}, 30_000);

describe("bundle output", () => {
  test("should produce CLI and library entry files", async () => {
    const files = await readdir(DIST);
    const jsFiles = files.filter((f) => f.endsWith(".js") && !f.endsWith(".map")).sort();
    expect(jsFiles).toEqual(["arbors.js", "index.js"]);
  });

  test("should inject createRequire shim before __require helper", () => {
    const shimIndex = bundleContent.indexOf(
      "var require = __arbors_createRequire(import.meta.url)",
    );
    const requireHelperIndex = bundleContent.indexOf('typeof require !== "undefined"');

    expect(shimIndex).toBeGreaterThan(-1);
    expect(requireHelperIndex).toBeGreaterThan(-1);
    expect(shimIndex).toBeLessThan(requireHelperIndex);
  });

  test("should not contain external react-devtools-core import", () => {
    const hasExternalImport = /^import .* from ["']react-devtools-core["']/m.test(bundleContent);
    expect(hasExternalImport).toBe(false);
  });

  test("should execute without dynamic require errors", () => {
    const stdout = execFileSync("node", [ENTRY, "--version"], {
      encoding: "utf-8",
    });
    expect(stdout.trim()).toMatch(/^arbors v\d+\.\d+\.\d+$/);
  });

  test("should resolve Node built-in modules via createRequire", () => {
    const stdout = execFileSync("node", [ENTRY, "--help"], {
      encoding: "utf-8",
    });
    expect(stdout).toContain("Usage: arbors");
  });
});
