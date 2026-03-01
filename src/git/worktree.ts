import { basename, dirname, resolve } from "node:path";
import type { RuntimeAdapter } from "../runtime/adapter.js";

export interface WorktreeInfo {
  path: string;
  branch: string;
  isMain: boolean;
}

export const getRepoRoot = async (adapter: RuntimeAdapter): Promise<string> => {
  const result = await adapter.exec("git", ["rev-parse", "--show-toplevel"]);
  if (result.exitCode !== 0) throw new Error("Not a git repository");
  return result.stdout;
};

export const getRepoName = async (adapter: RuntimeAdapter): Promise<string> => {
  const root = await getRepoRoot(adapter);
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

const parseWorktreeBlock = (block: string, branchPrefix: string): WorktreeInfo | null => {
  const lines = block.split("\n");
  const pathLine = lines.find((l) => l.startsWith("worktree "));
  const branchLine = lines.find((l) => l.startsWith("branch "));

  if (!pathLine) return null;

  const path = pathLine.slice(9);
  const branch = branchLine?.slice(7).replace("refs/heads/", "") ?? "";
  const isMain = !lines.some((l) => l === "detached" || l.startsWith(`branch refs/heads/${branchPrefix}/`));

  return { path, branch, isMain };
};

export const listWorktrees = async (adapter: RuntimeAdapter, branchPrefix: string): Promise<WorktreeInfo[]> => {
  const result = await adapter.exec("git", ["worktree", "list", "--porcelain"]);
  if (result.exitCode !== 0) return [];

  return result.stdout
    .split("\n\n")
    .map((block: string) => parseWorktreeBlock(block, branchPrefix))
    .filter((wt): wt is WorktreeInfo => wt !== null);
};

export const createWorktree = async (
  adapter: RuntimeAdapter,
  name: string,
  branchPrefix: string,
  baseBranch?: string,
): Promise<string> => {
  const repoName = await getRepoName(adapter);
  const repoRoot = await getRepoRoot(adapter);
  const base = baseBranch ?? (await getDefaultBranch(adapter));
  const worktreePath = resolve(dirname(repoRoot), `${repoName}-arbor`, name);
  const branchName = `${branchPrefix}/${name}`;

  const result = await adapter.exec("git", [
    "worktree",
    "add",
    "-b",
    branchName,
    worktreePath,
    base,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to create worktree");
  }

  return worktreePath;
};

export const removeWorktree = async (adapter: RuntimeAdapter, name: string, branchPrefix: string): Promise<void> => {
  const repoName = await getRepoName(adapter);
  const repoRoot = await getRepoRoot(adapter);
  const worktreePath = resolve(dirname(repoRoot), `${repoName}-arbor`, name);
  const branchName = `${branchPrefix}/${name}`;

  const removeResult = await adapter.exec("git", ["worktree", "remove", "--force", worktreePath]);

  if (removeResult.exitCode !== 0) {
    throw new Error(removeResult.stderr || "Failed to remove worktree");
  }

  await adapter.exec("git", ["branch", "-D", branchName]);
};
