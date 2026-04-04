export interface Messages {
  selectProject: string;
  noProjects: string;
  recentProjects: string;
  selectWorktree: string;
  noWorktrees: string;
  createNew: string;
  creating: string;
  removing: string;
  copying: string;
  installing: string;
  created: string;
  removed: string;
  copied: string;
  installed: string;
  resultsFound: (count: number) => string;
  notGitRepo: string;
  worktreeExists: string;
  worktreeNotFound: string;
  uncommittedChanges: string;
  cannotDeleteMain: string;
  cannotRemoveCurrent: string;
  forceRemoving: string;
  removeSummary: (removed: number, failed: number) => string;
  invalidName: string;
  switching: string;
  switched: string;
  helpFooter: string;
  helpWorktree: string;
  configSaved: string;
  configCurrent: string;
  version: (v: string) => string;
  usage: string;
  commands: string;
  options: string;
  running: string;
  pruning: string;
  noStaleWorktrees: string;
  noMergedWorktrees: string;
  hookFailed: (name: string) => string;
  notInWorktree: string;
  deprecatedPlain: string;
  prunedStale: (branch: string) => string;
  wouldRemove: (branch: string, path: string) => string;
}

export const en: Messages = {
  selectProject: "Select a project:",
  noProjects: "No projects registered. Run arbors in a git repository first.",
  recentProjects: "Recent projects",
  selectWorktree: "Select a worktree:",
  noWorktrees: "No worktrees found.",
  createNew: "Create new worktree",
  creating: "Creating worktree...",
  removing: "Removing worktree...",
  copying: "Copying ignored files...",
  installing: "Installing dependencies...",
  created: "Worktree created",
  removed: "Worktree removed",
  copied: "Ignored files copied",
  installed: "Dependencies installed",
  resultsFound: (count) => `${count} result${count === 1 ? "" : "s"} found`,
  notGitRepo: "Not a git repository.",
  worktreeExists: "Worktree already exists.",
  worktreeNotFound: "Worktree not found.",
  uncommittedChanges: "Worktree has uncommitted changes. Commit or stash them first.",
  cannotDeleteMain: "Cannot delete the main worktree.",
  cannotRemoveCurrent: "Cannot remove the worktree you are currently in.",
  forceRemoving: "Force removing worktree with uncommitted changes...",
  removeSummary: (removed, failed) => `Summary: ${removed} removed, ${failed} failed`,
  invalidName: "Invalid worktree name.",
  switching: "Switching...",
  switched: "Switched to worktree",
  helpFooter: "Tab: autocomplete | Enter: select | Esc: cancel",
  helpWorktree: "Ctrl+B: new branch | Ctrl+X: delete | Esc: back",
  configSaved: "Configuration saved.",
  configCurrent: "Current configuration:",
  version: (v) => `arbors v${v}`,
  usage: "Usage: arbors [command] [options]",
  commands: "Commands:",
  options: "Options:",
  running: "Running command in worktree...",
  pruning: "Pruning stale worktrees...",
  noStaleWorktrees: "No stale worktrees found.",
  noMergedWorktrees: "No merged worktrees found.",
  hookFailed: (name) => `warning: ${name} hook failed`,
  notInWorktree: "Not inside a worktree.",
  deprecatedPlain: "--plain is deprecated, use --porcelain instead",
  prunedStale: (branch) => `Pruned stale entry: ${branch}`,
  wouldRemove: (branch, path) => `would remove: ${branch} (${path})`,
};
