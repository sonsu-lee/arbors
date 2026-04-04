import { describe, it, expect } from "vitest";
import { en } from "../src/i18n/en";

/**
 * parseArgs is defined inline in bin/arbors.ts and not exported.
 * We replicate the logic here to test the parsing behavior in isolation.
 */
const matchFlag = (arg: string, flags: Record<string, string>): boolean => {
  if (arg === "--porcelain") {
    flags.porcelain = "true";
    return true;
  }
  if (arg === "--plain") {
    flags.porcelain = "true";
    flags._plainDeprecated = "true";
    return true;
  }
  if (arg === "--create" || arg === "-c") {
    flags.create = "true";
    return true;
  }
  if (arg === "-C") {
    flags.create = "true";
    flags.forceCreate = "true";
    return true;
  }
  if (arg === "--force" || arg === "-f") {
    flags.force = "true";
    return true;
  }
  if (arg === "--help" || arg === "-h") {
    flags.help = "true";
    return true;
  }
  if (arg === "--version" || arg === "-v") {
    flags.version = "true";
    return true;
  }
  if (arg === "--no-copy") {
    flags.noCopy = "true";
    return true;
  }
  if (arg === "--no-install") {
    flags.noInstall = "true";
    return true;
  }
  if (arg === "--dry-run" || arg === "-n") {
    flags.dryRun = "true";
    return true;
  }
  if (arg === "--quiet" || arg === "-q") {
    flags.quiet = "true";
    return true;
  }
  if (arg === "--merged") {
    flags.merged = "true";
    return true;
  }
  if (arg === "--global") {
    flags.global = "true";
    return true;
  }
  if (arg === "--unset") {
    flags.unset = "true";
    return true;
  }
  return false;
};

const parseArgs = (argv: string[]) => {
  const args = argv.slice(2);

  const flags: Record<string, string> = {};
  const names: string[] = [];
  const rest: string[] = [];
  let command: string | undefined;
  let seenSeparator = false;

  for (const arg of args) {
    if (arg === "--") {
      seenSeparator = true;
      continue;
    }
    if (seenSeparator) {
      rest.push(arg);
      continue;
    }

    if (matchFlag(arg, flags)) continue;
    if (arg.startsWith("-")) continue;

    if (!command) {
      command = arg;
    } else {
      names.push(arg);
    }
  }

  return { command, names, flags, rest };
};

describe("parseArgs — multiple names", () => {
  it("should collect multiple branch names", () => {
    const { names } = parseArgs([
      "node",
      "arbors",
      "remove",
      "feature/a",
      "feature/b",
      "feature/c",
    ]);
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

  it("should collect start-point as second positional arg", () => {
    const { names, flags } = parseArgs(["node", "arbors", "add", "-c", "my-branch", "main"]);
    expect(names).toEqual(["my-branch", "main"]);
    expect(flags.create).toBe("true");
  });

  it("should handle -C flag for force create", () => {
    const { names, flags } = parseArgs(["node", "arbors", "add", "-C", "my-branch", "main"]);
    expect(names).toEqual(["my-branch", "main"]);
    expect(flags.create).toBe("true");
    expect(flags.forceCreate).toBe("true");
  });

  it("should map --plain to --porcelain with deprecation flag", () => {
    const { flags } = parseArgs(["node", "arbors", "list", "--plain"]);
    expect(flags.porcelain).toBe("true");
    expect(flags._plainDeprecated).toBe("true");
  });

  it("should support --porcelain directly", () => {
    const { flags } = parseArgs(["node", "arbors", "list", "--porcelain"]);
    expect(flags.porcelain).toBe("true");
    expect(flags._plainDeprecated).toBeUndefined();
  });

  it("should handle --force flag with multiple names", () => {
    const { names, flags } = parseArgs([
      "node",
      "arbors",
      "remove",
      "-f",
      "feature/a",
      "feature/b",
    ]);
    expect(names).toEqual(["feature/a", "feature/b"]);
    expect(flags.force).toBe("true");
  });

  it("should handle global flags before command", () => {
    const { command, flags } = parseArgs(["node", "arbors", "--version"]);
    expect(command).toBeUndefined();
    expect(flags.version).toBe("true");
  });

  it("should handle flags mixed with positional args", () => {
    const { command, names, flags } = parseArgs([
      "node",
      "arbors",
      "remove",
      "feature/a",
      "-f",
      "feature/b",
    ]);
    expect(command).toBe("remove");
    expect(names).toEqual(["feature/a", "feature/b"]);
    expect(flags.force).toBe("true");
  });

  it("should separate args after -- into rest", () => {
    const { command, names, rest } = parseArgs([
      "node",
      "arbors",
      "run",
      "feature",
      "--",
      "pnpm",
      "test",
    ]);
    expect(command).toBe("run");
    expect(names).toEqual(["feature"]);
    expect(rest).toEqual(["pnpm", "test"]);
  });

  it("should treat flags after -- as rest args", () => {
    const { flags, rest } = parseArgs([
      "node",
      "arbors",
      "run",
      "feature",
      "--",
      "git",
      "--version",
    ]);
    expect(flags.version).toBeUndefined();
    expect(rest).toEqual(["git", "--version"]);
  });

  it("should handle CI flags", () => {
    const { flags } = parseArgs([
      "node",
      "arbors",
      "add",
      "-c",
      "feature",
      "--no-copy",
      "--no-install",
      "-q",
    ]);
    expect(flags.create).toBe("true");
    expect(flags.noCopy).toBe("true");
    expect(flags.noInstall).toBe("true");
    expect(flags.quiet).toBe("true");
  });

  it("should handle prune flags", () => {
    const { command, flags } = parseArgs(["node", "arbors", "prune", "--merged", "-n"]);
    expect(command).toBe("prune");
    expect(flags.merged).toBe("true");
    expect(flags.dryRun).toBe("true");
  });

  it("should handle config get with key as positional", () => {
    const { command, names } = parseArgs(["node", "arbors", "config", "runtime"]);
    expect(command).toBe("config");
    expect(names).toEqual(["runtime"]);
  });

  it("should handle config set with key and value", () => {
    const { command, names } = parseArgs(["node", "arbors", "config", "language", "ko"]);
    expect(command).toBe("config");
    expect(names).toEqual(["language", "ko"]);
  });

  it("should handle config --global --unset flags", () => {
    const { command, names, flags } = parseArgs([
      "node",
      "arbors",
      "config",
      "--global",
      "--unset",
      "worktreeDir",
    ]);
    expect(command).toBe("config");
    expect(names).toEqual(["worktreeDir"]);
    expect(flags.global).toBe("true");
    expect(flags.unset).toBe("true");
  });

  it("should handle completion command", () => {
    const { command, names } = parseArgs(["node", "arbors", "completion", "zsh"]);
    expect(command).toBe("completion");
    expect(names).toEqual(["zsh"]);
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
