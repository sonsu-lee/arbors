import { describe, it, expect } from "vitest";
import { en } from "../src/i18n/en";

/**
 * parseArgs is defined inline in bin/arbors.ts and not exported.
 * We replicate the logic here to test the parsing behavior in isolation.
 */
const parseArgs = (argv: string[]) => {
  const args = argv.slice(2);
  const command = args[0];

  const flags = args.reduce<Record<string, string>>((acc, arg, i) => {
    if (arg.startsWith("--") && args[i + 1] && !args[i + 1].startsWith("-")) {
      acc[arg.slice(2)] = args[i + 1];
    }
    if (arg === "--plain") acc.plain = "true";
    if (arg === "--create" || arg === "-c") acc.create = "true";
    if (arg === "--force" || arg === "-f") acc.force = "true";
    if (arg === "--help" || arg === "-h") acc.help = "true";
    if (arg === "--version" || arg === "-v") acc.version = "true";
    return acc;
  }, {});

  const names = args.slice(1).filter((a) => !a.startsWith("-") && !Object.values(flags).includes(a));

  return { command, names, flags };
};

describe("parseArgs — multiple names", () => {
  it("should collect multiple branch names", () => {
    const { names } = parseArgs(["node", "arbors", "remove", "feature/a", "feature/b", "feature/c"]);
    expect(names).toEqual(["feature/a", "feature/b", "feature/c"]);
  });

  it("should return single name in array for backward compat", () => {
    const { names } = parseArgs(["node", "arbors", "remove", "feature/a"]);
    expect(names).toEqual(["feature/a"]);
  });

  it("should return empty array when no names provided", () => {
    const { names } = parseArgs(["node", "arbors", "remove"]);
    expect(names).toEqual([]);
  });

  it("should exclude flag values from names", () => {
    const { names, flags } = parseArgs(["node", "arbors", "add", "-c", "my-branch", "--base", "main"]);
    expect(names).toEqual(["my-branch"]);
    expect(flags.base).toBe("main");
  });

  it("should handle --force flag with multiple names", () => {
    const { names, flags } = parseArgs(["node", "arbors", "remove", "-f", "feature/a", "feature/b"]);
    expect(names).toEqual(["feature/a", "feature/b"]);
    expect(flags.force).toBe("true");
  });
});

describe("removeSummary i18n", () => {
  it("should format English summary", () => {
    expect(en.removeSummary(2, 1)).toBe("Summary: 2 removed, 1 failed");
  });

  it("should format zero failures", () => {
    expect(en.removeSummary(3, 0)).toBe("Summary: 3 removed, 0 failed");
  });
});
