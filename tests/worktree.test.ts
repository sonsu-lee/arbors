import { describe, it, expect, vi } from "vitest";
import {
  getWorktreeRoot,
  getMainRepoRoot,
  getRepoName,
  getDefaultBranch,
  listWorktrees,
  branchExists,
  remoteBranchExists,
  createWorktree,
  checkoutWorktree,
  checkoutRemoteWorktree,
  removeWorktree,
} from "../src/git/worktree.js";
import type { RuntimeAdapter } from "../src/runtime/adapter.js";

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

describe("getWorktreeRoot", () => {
  it("should return the current worktree root path", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: "/home/user/project", stderr: "", exitCode: 0 })),
    });

    const root = await getWorktreeRoot(adapter);
    expect(root).toBe("/home/user/project");
  });

  it("should throw when not in a git repository", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: "", stderr: "fatal", exitCode: 128 })),
    });

    await expect(getWorktreeRoot(adapter)).rejects.toThrow("Not a git repository");
  });
});

describe("getMainRepoRoot", () => {
  it("should return the main worktree path", async () => {
    const porcelainOutput = [
      "worktree /home/user/project",
      "HEAD abc1234",
      "branch refs/heads/main",
      "",
      "worktree /home/user/arbors/project/feature-x",
      "HEAD def5678",
      "branch refs/heads/feature/x",
    ].join("\n");

    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: porcelainOutput, stderr: "", exitCode: 0 })),
    });

    const root = await getMainRepoRoot(adapter);
    expect(root).toBe("/home/user/project");
  });

  it("should throw when not in a git repository", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: "", stderr: "error", exitCode: 1 })),
    });

    await expect(getMainRepoRoot(adapter)).rejects.toThrow("Not a git repository");
  });
});

describe("getRepoName", () => {
  it("should return the basename of the main repo root", async () => {
    const porcelainOutput = [
      "worktree /home/user/my-project",
      "HEAD abc1234",
      "branch refs/heads/main",
    ].join("\n");

    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: porcelainOutput, stderr: "", exitCode: 0 })),
    });

    const name = await getRepoName(adapter);
    expect(name).toBe("my-project");
  });
});

describe("getDefaultBranch", () => {
  it("should return branch from symbolic ref when available", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: "refs/remotes/origin/main", stderr: "", exitCode: 0 })),
    });

    const branch = await getDefaultBranch(adapter);
    expect(branch).toBe("main");
  });

  it("should fallback to main when symbolic ref fails and main exists", async () => {
    const execFn = vi.fn(async (_cmd: string, args?: string[]) => {
      if (args?.[0] === "symbolic-ref") return { stdout: "", stderr: "", exitCode: 1 };
      if (args?.[0] === "rev-parse") return { stdout: "", stderr: "", exitCode: 0 };
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    const adapter = createMockAdapter({ exec: execFn });
    const branch = await getDefaultBranch(adapter);
    expect(branch).toBe("main");
  });

  it("should fallback to master when neither symbolic ref nor main exists", async () => {
    const execFn = vi.fn(async (_cmd: string, args?: string[]) => {
      if (args?.[0] === "symbolic-ref") return { stdout: "", stderr: "", exitCode: 1 };
      if (args?.[0] === "rev-parse") return { stdout: "", stderr: "", exitCode: 1 };
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    const adapter = createMockAdapter({ exec: execFn });
    const branch = await getDefaultBranch(adapter);
    expect(branch).toBe("master");
  });
});

describe("listWorktrees", () => {
  it("should parse porcelain output into worktree list", async () => {
    const porcelainOutput = [
      "worktree /home/user/project",
      "HEAD abc1234",
      "branch refs/heads/main",
      "",
      "worktree /home/user/arbors/project/feature-login",
      "HEAD def5678",
      "branch refs/heads/feature/login",
    ].join("\n");

    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: porcelainOutput, stderr: "", exitCode: 0 })),
    });

    const worktrees = await listWorktrees(adapter);
    expect(worktrees).toEqual([
      { path: "/home/user/project", branch: "main", isMain: true },
      { path: "/home/user/arbors/project/feature-login", branch: "feature/login", isMain: false },
    ]);
  });

  it("should return empty array on git command failure", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: "", stderr: "error", exitCode: 1 })),
    });

    const worktrees = await listWorktrees(adapter);
    expect(worktrees).toEqual([]);
  });
});

describe("branchExists", () => {
  it("should return true when branch exists", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: "abc123", stderr: "", exitCode: 0 })),
    });

    expect(await branchExists(adapter, "main")).toBe(true);
  });

  it("should return false when branch does not exist", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 1 })),
    });

    expect(await branchExists(adapter, "nonexistent")).toBe(false);
  });
});

describe("remoteBranchExists", () => {
  it("should return true when remote branch exists", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: "abc123\trefs/heads/feature", stderr: "", exitCode: 0 })),
    });

    expect(await remoteBranchExists(adapter, "feature")).toBe(true);
  });

  it("should return false when remote branch does not exist", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 })),
    });

    expect(await remoteBranchExists(adapter, "nonexistent")).toBe(false);
  });
});

const MAIN_PORCELAIN = "worktree /home/user/project\nHEAD abc\nbranch refs/heads/main";

describe("createWorktree", () => {
  it("should create a new branch worktree and unset upstream", async () => {
    const execFn = vi.fn(async (_cmd: string, args?: string[]) => {
      // getRepoName → getMainRepoRoot → listWorktrees
      if (args?.[0] === "worktree" && args?.[1] === "list") {
        return { stdout: MAIN_PORCELAIN, stderr: "", exitCode: 0 };
      }
      // getDefaultBranch
      if (args?.[0] === "symbolic-ref") {
        return { stdout: "refs/remotes/origin/main", stderr: "", exitCode: 0 };
      }
      // branchExists check
      if (args?.[0] === "rev-parse" && args?.[1] === "--verify") {
        return { stdout: "", stderr: "", exitCode: 1 };
      }
      // fetch, worktree add, unset-upstream
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    const adapter = createMockAdapter({ exec: execFn });
    const path = await createWorktree(adapter, "feature/login", "~/arbors/{repo}");

    // Should have called git branch --unset-upstream
    const unsetCall = execFn.mock.calls.find(
      (call) => call[1]?.[0] === "branch" && call[1]?.[1] === "--unset-upstream",
    );
    expect(unsetCall).toBeTruthy();
    expect(unsetCall?.[1]?.[2]).toBe("feature/login");

    expect(path).toContain("feature-login");
  });

  it("should throw when branch already exists", async () => {
    const execFn = vi.fn(async (_cmd: string, args?: string[]) => {
      if (args?.[0] === "worktree" && args?.[1] === "list") {
        return { stdout: MAIN_PORCELAIN, stderr: "", exitCode: 0 };
      }
      if (args?.[0] === "symbolic-ref") {
        return { stdout: "refs/remotes/origin/main", stderr: "", exitCode: 0 };
      }
      // branchExists returns true
      if (args?.[0] === "rev-parse" && args?.[1] === "--verify") {
        return { stdout: "abc123", stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    const adapter = createMockAdapter({ exec: execFn });
    await expect(createWorktree(adapter, "existing", "~/arbors/{repo}")).rejects.toThrow(
      "Branch 'existing' already exists",
    );
  });

  it("should use specified base branch", async () => {
    const execFn = vi.fn(async (_cmd: string, args?: string[]) => {
      if (args?.[0] === "worktree" && args?.[1] === "list") {
        return { stdout: MAIN_PORCELAIN, stderr: "", exitCode: 0 };
      }
      if (args?.[0] === "rev-parse" && args?.[1] === "--verify") {
        return { stdout: "", stderr: "", exitCode: 1 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    const adapter = createMockAdapter({ exec: execFn });
    await createWorktree(adapter, "hotfix", "~/arbors/{repo}", "develop");

    // Should fetch develop, not default branch
    const fetchCall = execFn.mock.calls.find((call) => call[1]?.[0] === "fetch");
    expect(fetchCall?.[1]).toEqual(["fetch", "origin", "develop"]);

    // Should use origin/develop as start point
    const addCall = execFn.mock.calls.find(
      (call) => call[1]?.[0] === "worktree" && call[1]?.[1] === "add",
    );
    expect(addCall?.[1]).toContain("origin/develop");
  });
});

describe("checkoutWorktree", () => {
  it("should return existing worktree without creating", async () => {
    const porcelainOutput = [
      "worktree /home/user/project",
      "HEAD abc1234",
      "branch refs/heads/main",
      "",
      "worktree /home/user/arbors/project/feature-login",
      "HEAD def5678",
      "branch refs/heads/feature/login",
    ].join("\n");

    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: porcelainOutput, stderr: "", exitCode: 0 })),
    });

    const result = await checkoutWorktree(adapter, "feature/login", "~/arbors/{repo}");
    expect(result).toEqual({
      path: "/home/user/arbors/project/feature-login",
      created: false,
    });
  });

  it("should create worktree when not already checked out", async () => {
    const execFn = vi.fn(async (_cmd: string, args?: string[]) => {
      if (args?.[0] === "worktree" && args?.[1] === "list") {
        return { stdout: MAIN_PORCELAIN, stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    const adapter = createMockAdapter({ exec: execFn });
    const result = await checkoutWorktree(adapter, "develop", "~/arbors/{repo}");

    expect(result.created).toBe(true);
    expect(result.path).toContain("develop");
  });
});

describe("checkoutRemoteWorktree", () => {
  it("should return existing worktree without fetching", async () => {
    const porcelainOutput = [
      "worktree /home/user/project",
      "HEAD abc1234",
      "branch refs/heads/main",
      "",
      "worktree /home/user/arbors/project/develop",
      "HEAD def5678",
      "branch refs/heads/develop",
    ].join("\n");

    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: porcelainOutput, stderr: "", exitCode: 0 })),
    });

    const result = await checkoutRemoteWorktree(adapter, "develop", "~/arbors/{repo}");
    expect(result).toEqual({
      path: "/home/user/arbors/project/develop",
      created: false,
    });
  });

  it("should fetch and create worktree for remote branch", async () => {
    const execFn = vi.fn(async (_cmd: string, args?: string[]) => {
      if (args?.[0] === "worktree" && args?.[1] === "list") {
        return { stdout: MAIN_PORCELAIN, stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    const adapter = createMockAdapter({ exec: execFn });
    const result = await checkoutRemoteWorktree(adapter, "feature/api", "~/arbors/{repo}");

    expect(result.created).toBe(true);

    // Should fetch the branch
    const fetchCall = execFn.mock.calls.find((call) => call[1]?.[0] === "fetch");
    expect(fetchCall?.[1]).toEqual(["fetch", "origin", "feature/api"]);

    // Should create with -b and origin/branch
    const addCall = execFn.mock.calls.find(
      (call) => call[1]?.[0] === "worktree" && call[1]?.[1] === "add",
    );
    expect(addCall?.[1]).toContain("-b");
    expect(addCall?.[1]).toContain("origin/feature/api");
  });
});

describe("removeWorktree", () => {
  it("should remove worktree and delete branch", async () => {
    const execFn = vi.fn(async (_cmd: string, _args?: string[]) => ({ stdout: "", stderr: "", exitCode: 0 }));
    const adapter = createMockAdapter({ exec: execFn });

    await removeWorktree(adapter, "/home/user/arbors/project/feature", "feature");

    // Should call git worktree remove
    const removeCall = execFn.mock.calls.find((call) => call[1]?.[0] === "worktree");
    expect(removeCall?.[1]).toEqual(["worktree", "remove", "--force", "/home/user/arbors/project/feature"]);

    // Should call git branch -D
    const branchCall = execFn.mock.calls.find((call) => call[1]?.[0] === "branch");
    expect(branchCall?.[1]).toEqual(["branch", "-D", "feature"]);
  });

  it("should throw when worktree removal fails", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: "", stderr: "removal failed", exitCode: 1 })),
    });

    await expect(removeWorktree(adapter, "/path", "branch")).rejects.toThrow("removal failed");
  });
});
