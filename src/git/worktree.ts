import { homedir } from "node:os";
import { basename, resolve } from "node:path";
import type { RuntimeAdapter } from "../runtime/adapter.js";

export interface WorktreeInfo {
  path: string;
  branch: string;
  isMain: boolean;
}

export const getWorktreeRoot = async (adapter: RuntimeAdapter): Promise<string> => {
  const result = await adapter.exec("git", ["rev-parse", "--show-toplevel"]);
  if (result.exitCode !== 0) throw new Error("Not a git repository");
  return result.stdout;
};

export const getMainRepoRoot = async (adapter: RuntimeAdapter): Promise<string> => {
  const worktrees = await listWorktrees(adapter);
  if (worktrees.length === 0) throw new Error("Not a git repository");
  return worktrees[0].path;
};

export const getRepoName = async (adapter: RuntimeAdapter): Promise<string> => {
  const root = await getMainRepoRoot(adapter);
  return basename(root);
};

export const getDefaultBranch = async (adapter: RuntimeAdapter): Promise<string> => {
  const result = await adapter.exec("git", ["symbolic-ref", "refs/remotes/origin/HEAD"]);

  if (result.exitCode === 0) {
    return result.stdout.replace("refs/remotes/origin/", "");
  }

  const mainCheck = await adapter.exec("git", ["rev-parse", "--verify", "main"]);
  return mainCheck.exitCode === 0 ? "main" : "master";
};

const parseWorktreeBlock = (block: string, isFirst: boolean): WorktreeInfo | null => {
  const lines = block.split("\n");
  const pathLine = lines.find((l) => l.startsWith("worktree "));
  const branchLine = lines.find((l) => l.startsWith("branch "));

  if (!pathLine) return null;

  const path = pathLine.slice(9);
  const branch = branchLine?.slice(7).replace("refs/heads/", "") ?? "";

  return { path, branch, isMain: isFirst };
};

export const listWorktrees = async (adapter: RuntimeAdapter): Promise<WorktreeInfo[]> => {
  const result = await adapter.exec("git", ["worktree", "list", "--porcelain"]);
  if (result.exitCode !== 0) return [];

  return result.stdout
    .split("\n\n")
    .map((block: string, index: number) => parseWorktreeBlock(block, index === 0))
    .filter((wt): wt is WorktreeInfo => wt !== null);
};

export const branchExists = async (adapter: RuntimeAdapter, branchName: string): Promise<boolean> => {
  const result = await adapter.exec("git", ["rev-parse", "--verify", branchName]);
  return result.exitCode === 0;
};

export const remoteBranchExists = async (adapter: RuntimeAdapter, branchName: string): Promise<boolean> => {
  const result = await adapter.exec("git", ["ls-remote", "--heads", "origin", branchName]);
  return result.exitCode === 0 && result.stdout.length > 0;
};

const branchToDir = (branch: string): string => branch.replaceAll("/", "-");

const resolveWorktreeDir = (worktreeDir: string, repoName: string): string => {
  const expanded = worktreeDir.replace(/^~/, homedir()).replace("{repo}", repoName);
  return resolve(expanded);
};

export const createWorktree = async (
  adapter: RuntimeAdapter,
  branch: string,
  worktreeDir: string,
  baseBranch?: string,
): Promise<string> => {
  const repoName = await getRepoName(adapter);
  const base = baseBranch ?? (await getDefaultBranch(adapter));
  const worktreePath = resolve(resolveWorktreeDir(worktreeDir, repoName), branchToDir(branch));

  if (await branchExists(adapter, branch)) {
    throw new Error(`Branch '${branch}' already exists`);
  }

  await adapter.exec("git", ["fetch", "origin", base]);

  const result = await adapter.exec("git", [
    "worktree",
    "add",
    "-b",
    branch,
    worktreePath,
    `origin/${base}`,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to create worktree");
  }

  await adapter.exec("git", ["branch", "--unset-upstream", branch]);

  return worktreePath;
};

export interface CheckoutResult {
  path: string;
  created: boolean;
}

export const checkoutWorktree = async (
  adapter: RuntimeAdapter,
  branch: string,
  worktreeDir: string,
): Promise<CheckoutResult> => {
  const existing = (await listWorktrees(adapter)).find((wt) => wt.branch === branch);
  if (existing) return { path: existing.path, created: false };

  const repoName = await getRepoName(adapter);
  const worktreePath = resolve(resolveWorktreeDir(worktreeDir, repoName), branchToDir(branch));

  const result = await adapter.exec("git", ["worktree", "add", worktreePath, branch]);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to checkout worktree");
  }

  return { path: worktreePath, created: true };
};

export const checkoutRemoteWorktree = async (
  adapter: RuntimeAdapter,
  branch: string,
  worktreeDir: string,
): Promise<CheckoutResult> => {
  const existing = (await listWorktrees(adapter)).find((wt) => wt.branch === branch);
  if (existing) return { path: existing.path, created: false };

  await adapter.exec("git", ["fetch", "origin", branch]);

  const repoName = await getRepoName(adapter);
  const worktreePath = resolve(resolveWorktreeDir(worktreeDir, repoName), branchToDir(branch));

  const result = await adapter.exec("git", [
    "worktree",
    "add",
    "-b",
    branch,
    worktreePath,
    `origin/${branch}`,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to checkout remote worktree");
  }

  return { path: worktreePath, created: true };
};

export const removeWorktree = async (
  adapter: RuntimeAdapter,
  worktreePath: string,
  branch: string,
): Promise<void> => {
  const removeResult = await adapter.exec("git", ["worktree", "remove", "--force", worktreePath]);

  if (removeResult.exitCode !== 0) {
    throw new Error(removeResult.stderr || "Failed to remove worktree");
  }

  await adapter.exec("git", ["branch", "-D", branch]);
};
