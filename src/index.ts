// Public API for programmatic usage
export { loadConfig, getGlobalConfigPath, getProjectConfigPath } from "./config";
export type { ArborConfig, HooksConfig } from "./config";

export {
  createWorktree,
  checkoutWorktree,
  checkoutRemoteWorktree,
  removeWorktree,
  listWorktrees,
  getMainRepoRoot,
  getWorktreeRoot,
  getRepoName,
  getDefaultBranch,
  branchExists,
  remoteBranchExists,
} from "./git/worktree";
export type { WorktreeInfo } from "./git/worktree";

export {
  copyIgnoredFiles,
  getIgnoredFiles,
  matchesPattern,
  loadIncludePatterns,
} from "./git/exclude";

export { validateWorktreeName, hasUncommittedChanges, canSafelyRemove } from "./git/safety";

export {
  registerProject,
  registerWorktree,
  unregisterWorktree,
  getProjects,
  getWorktrees,
} from "./project/registry";

export { runSetup, detectPackageManager, detectRuntimeManager } from "./project/setup";

export { createAdapter } from "./runtime/index";
export type { RuntimeAdapter, ExecResult } from "./runtime/adapter";

export { runHook } from "./hooks";
export type { HookName, HookContext } from "./hooks";
