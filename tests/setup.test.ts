import { describe, test, expect, vi } from "vitest";
import { runSetup } from "../src/project/setup";
import type { RuntimeAdapter } from "../src/runtime/adapter";

const createMockAdapter = (
  existingFiles: string[],
  execLog: { cmd: string[]; cwd?: string }[] = [],
): RuntimeAdapter => ({
  exec: vi.fn(async (cmd: string, args: string[], options?: { cwd?: string }) => {
    execLog.push({ cmd: [cmd, ...args], cwd: options?.cwd });
    return { stdout: "", stderr: "", exitCode: 0 };
  }),
  glob: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(async (path: string) => existingFiles.some((f) => path.endsWith(f))),
  copy: vi.fn(),
  mkdir: vi.fn(),
});

describe("runSetup", () => {
  test("should detect and run pnpm install in worktree cwd", async () => {
    // Given: a project with pnpm-lock.yaml
    const execLog: { cmd: string[]; cwd?: string }[] = [];
    const adapter = createMockAdapter(["pnpm-lock.yaml"], execLog);

    // When: setup runs with auto detection
    const result = await runSetup(adapter, "/project");

    // Then: pnpm install is executed in the worktree directory
    expect(result.packageManager).toBe("pnpm");
    const pnpmCall = execLog.find((c) => c.cmd[0] === "pnpm");
    expect(pnpmCall?.cmd).toEqual(["pnpm", "install"]);
    expect(pnpmCall?.cwd).toBe("/project");
  });

  test("should use config-specified package manager over auto-detect", async () => {
    // Given: a project with pnpm lock but config says yarn
    const execLog: { cmd: string[]; cwd?: string }[] = [];
    const adapter = createMockAdapter(["pnpm-lock.yaml"], execLog);

    // When: setup runs with yarn override
    const result = await runSetup(adapter, "/project", "yarn");

    // Then: yarn is used instead of pnpm
    expect(result.packageManager).toBe("yarn");
    const yarnCall = execLog.find((c) => c.cmd[0] === "yarn");
    expect(yarnCall?.cmd).toEqual(["yarn", "install"]);
    expect(yarnCall?.cwd).toBe("/project");
  });

  test("should detect and run mise install before package manager", async () => {
    // Given: a project with mise.toml and pnpm-lock.yaml
    const execLog: { cmd: string[]; cwd?: string }[] = [];
    const adapter = createMockAdapter(["mise.toml", "pnpm-lock.yaml"], execLog);

    // When: setup runs
    const result = await runSetup(adapter, "/project");

    // Then: mise runs first, then pnpm, both in worktree cwd
    expect(result.runtimeManager).toBe("mise");
    expect(result.packageManager).toBe("pnpm");
    const miseIndex = execLog.findIndex((c) => c.cmd[0] === "mise");
    const pnpmIndex = execLog.findIndex((c) => c.cmd[0] === "pnpm");
    expect(miseIndex).toBeLessThan(pnpmIndex);
    expect(execLog[miseIndex].cwd).toBe("/project");
    expect(execLog[pnpmIndex].cwd).toBe("/project");
  });

  test("should skip package manager when no lock file and auto mode", async () => {
    // Given: a project with no lock files
    const execLog: { cmd: string[]; cwd?: string }[] = [];
    const adapter = createMockAdapter([], execLog);

    // When: setup runs
    const result = await runSetup(adapter, "/project");

    // Then: no package manager is detected or run
    expect(result.packageManager).toBeNull();
    expect(execLog).toHaveLength(0);
  });

  test("should detect nvm and source nvm.sh before nvm install", async () => {
    // Given: a project with .nvmrc
    const execLog: { cmd: string[]; cwd?: string }[] = [];
    const adapter = createMockAdapter([".nvmrc"], execLog);

    // When: setup runs
    const result = await runSetup(adapter, "/project");

    // Then: nvm is detected and invoked via bash -c in worktree cwd
    expect(result.runtimeManager).toBe("nvm");
    expect(execLog[0].cmd[0]).toBe("bash");
    expect(execLog[0].cmd[1]).toBe("-c");
    expect(execLog[0].cwd).toBe("/project");
  });
});
