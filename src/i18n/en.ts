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
  invalidName: string;
  helpFooter: string;
  helpWorktree: string;
  configSaved: string;
  configCurrent: string;
  version: string;
  usage: string;
  commands: string;
  options: string;
}

export const en: Messages = {
  selectProject: "Select a project:",
  noProjects: "No projects registered. Run arbor in a git repository first.",
  recentProjects: "Recent projects",
  selectWorktree: "Select a worktree:",
  noWorktrees: "No worktrees found.",
  createNew: "Create new worktree",
  creating: "Creating worktree...",
  removing: "Removing worktree...",
  copying: "Copying excluded files...",
  installing: "Installing dependencies...",
  created: "Worktree created",
  removed: "Worktree removed",
  copied: "Excluded files copied",
  installed: "Dependencies installed",
  resultsFound: (count) => `${count} result${count === 1 ? "" : "s"} found`,
  notGitRepo: "Not a git repository.",
  worktreeExists: "Worktree already exists.",
  worktreeNotFound: "Worktree not found.",
  uncommittedChanges: "Worktree has uncommitted changes. Commit or stash them first.",
  cannotDeleteMain: "Cannot delete the main worktree.",
  invalidName: "Invalid worktree name.",
  helpFooter: "Tab: autocomplete | Enter: select | Esc: cancel",
  helpWorktree: "Ctrl+B: new branch | Ctrl+X: delete | Esc: back",
  configSaved: "Configuration saved.",
  configCurrent: "Current configuration:",
  version: "arbor v0.1.0",
  usage: "Usage: arbor [command] [options]",
  commands: "Commands:",
  options: "Options:",
};
