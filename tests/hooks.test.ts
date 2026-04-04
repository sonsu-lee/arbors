import { describe, test, expect, vi } from "vitest";
import { runHook } from "../src/hooks";
import type { RuntimeAdapter } from "../src/runtime/adapter";

const createMockAdapter = (overrides?: Partial<RuntimeAdapter>): RuntimeAdapter => ({
  exec: vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 })),
  glob: vi.fn(async () => []),
  readFile: vi.fn(async () => ""),
  writeFile: vi.fn(),
  exists: vi.fn(async () => false),
  copy: vi.fn(),
  mkdir: vi.fn(),
  ...overrides,
});

describe("runHook", () => {
  const context = {
    repoRoot: "/repo",
    worktreePath: "/worktrees/feature",
    branch: "feature",
  };

  test("should return true when no hook is configured", async () => {
    const adapter = createMockAdapter();
    const result = await runHook(adapter, "postCreate", context);
    expect(result).toBe(true);
  });

  test("should execute config-based hook command", async () => {
    const execMock = vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 }));
    const adapter = createMockAdapter({ exec: execMock });

    const result = await runHook(adapter, "postCreate", context, {
      postCreate: "npm run setup",
    });

    expect(result).toBe(true);
    expect(execMock).toHaveBeenCalledWith(
      "npm",
      ["run", "setup"],
      expect.objectContaining({ cwd: "/worktrees/feature" }),
    );
  });

  test("should return false when hook command fails", async () => {
    const adapter = createMockAdapter({
      exec: vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 1 })),
    });

    const result = await runHook(adapter, "preRemove", context, {
      preRemove: "npm test",
    });

    expect(result).toBe(false);
  });

  test("should pass environment variables to hook", async () => {
    const execMock = vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 }));
    const adapter = createMockAdapter({ exec: execMock });

    await runHook(adapter, "postCreate", context, { postCreate: "echo hello" });

    const callEnv = (execMock.mock.calls[0] as unknown[])[2] as
      | { env?: Record<string, string> }
      | undefined;
    expect(callEnv?.env).toMatchObject({
      ARBORS_REPO_ROOT: "/repo",
      ARBORS_WORKTREE_PATH: "/worktrees/feature",
      ARBORS_BRANCH: "feature",
    });
  });

  test("should check .arbors/hooks/ directory when no config hook", async () => {
    const existsMock = vi.fn(async (path: string) => path === "/repo/.arbors/hooks/postCreate.sh");
    const execMock = vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 }));
    const adapter = createMockAdapter({ exists: existsMock, exec: execMock });

    const result = await runHook(adapter, "postCreate", context);

    expect(result).toBe(true);
    expect(execMock).toHaveBeenCalledWith(
      "/repo/.arbors/hooks/postCreate.sh",
      [],
      expect.objectContaining({ cwd: "/worktrees/feature" }),
    );
  });

  test("should use node for .js hook files", async () => {
    const existsMock = vi.fn(async (path: string) => path === "/repo/.arbors/hooks/postCreate.js");
    const execMock = vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 }));
    const adapter = createMockAdapter({ exists: existsMock, exec: execMock });

    await runHook(adapter, "postCreate", context);

    expect(execMock).toHaveBeenCalledWith(
      "node",
      ["/repo/.arbors/hooks/postCreate.js"],
      expect.objectContaining({ cwd: "/worktrees/feature" }),
    );
  });
});
