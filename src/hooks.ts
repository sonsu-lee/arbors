import { join } from "node:path";
import type { RuntimeAdapter } from "./runtime/adapter";

export type HookName = "postCreate" | "preRemove" | "postRemove" | "postSwitch";

export interface HookContext {
  repoRoot: string;
  worktreePath: string;
  branch: string;
}

export interface HooksConfig {
  postCreate?: string;
  preRemove?: string;
  postRemove?: string;
  postSwitch?: string;
}

/**
 * Run a lifecycle hook. Checks config.hooks first, then .arbors/hooks/ directory.
 * Returns true if hook succeeded or no hook found, false if hook failed.
 */
export const runHook = async (
  adapter: RuntimeAdapter,
  hookName: HookName,
  context: HookContext,
  hooksConfig?: HooksConfig,
): Promise<boolean> => {
  const env = {
    ARBORS_REPO_ROOT: context.repoRoot,
    ARBORS_WORKTREE_PATH: context.worktreePath,
    ARBORS_BRANCH: context.branch,
  };

  // Check config-based hook first
  const configCmd = hooksConfig?.[hookName];
  if (configCmd) {
    return executeHookCommand(adapter, configCmd, context.worktreePath, env);
  }

  // Check .arbors/hooks/ directory
  const hookDir = join(context.repoRoot, ".arbors", "hooks");
  const extensions = ["", ".sh", ".js", ".ts"];

  for (const ext of extensions) {
    const hookPath = join(hookDir, `${hookName}${ext}`);
    if (await adapter.exists(hookPath)) {
      if (ext === ".js" || ext === ".ts") {
        return executeHookCommand(adapter, `node ${hookPath}`, context.worktreePath, env);
      }
      return executeHookCommand(adapter, hookPath, context.worktreePath, env);
    }
  }

  // No hook found — success by default
  return true;
};

const executeHookCommand = async (
  adapter: RuntimeAdapter,
  command: string,
  cwd: string,
  env: Record<string, string>,
): Promise<boolean> => {
  // Split command into executable and args safely (no shell execution)
  const parts = command.split(/\s+/);
  const result = await adapter.exec(parts[0], parts.slice(1), { cwd, env });
  return result.exitCode === 0;
};
