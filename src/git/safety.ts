import type { RuntimeAdapter } from "../runtime/adapter.js";
import { getWorktreeRoot, listWorktrees } from "./worktree.js";

const VALID_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._\/-]*$/;

export const validateWorktreeName = (name: string): boolean =>
  VALID_NAME_PATTERN.test(name) && !name.includes("..");

export const hasUncommittedChanges = async (
  adapter: RuntimeAdapter,
  worktreePath: string,
): Promise<boolean> => {
  const result = await adapter.exec("git", ["-C", worktreePath, "status", "--porcelain"]);

  return result.exitCode === 0 && result.stdout.length > 0;
};

export const isMainWorktree = async (
  adapter: RuntimeAdapter,
  worktreePath: string,
): Promise<boolean> => {
  const worktrees = await listWorktrees(adapter);
  const target = worktrees.find((wt) => wt.path === worktreePath);
  return target?.isMain ?? false;
};

export const isCurrentWorktree = async (
  adapter: RuntimeAdapter,
  worktreePath: string,
): Promise<boolean> => {
  const cwd = await getWorktreeRoot(adapter);
  return cwd === worktreePath;
};

export const canSafelyRemove = async (
  adapter: RuntimeAdapter,
  worktreePath: string,
): Promise<{ safe: boolean; reason?: string }> => {
  if (await isMainWorktree(adapter, worktreePath)) {
    return { safe: false, reason: "cannotDeleteMain" };
  }

  if (await hasUncommittedChanges(adapter, worktreePath)) {
    return { safe: false, reason: "uncommittedChanges" };
  }

  return { safe: true };
};
