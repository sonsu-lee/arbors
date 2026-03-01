import React, { useState, useEffect } from "react";
import { Box, Text, useApp } from "ink";
import { ProjectSelector } from "./ProjectSelector.js";
import { WorktreeSelector } from "./WorktreeSelector.js";
import type { ProjectEntry } from "../project/registry.js";
import type { WorktreeInfo } from "../git/worktree.js";
import type { Messages } from "../i18n/en.js";
import type { RuntimeAdapter } from "../runtime/adapter.js";

type AppState =
  | { phase: "project"; projects: ProjectEntry[] }
  | { phase: "worktree"; project: ProjectEntry; worktrees: WorktreeInfo[] }
  | { phase: "result"; message: string };

interface AppProps {
  adapter: RuntimeAdapter;
  messages: Messages;
  projects: ProjectEntry[];
  listWorktrees: (adapter: RuntimeAdapter) => Promise<WorktreeInfo[]>;
}

export const App: React.FC<AppProps> = ({ adapter, messages, projects, listWorktrees }) => {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>({ phase: "project", projects });

  const handleProjectSelect = async (project: ProjectEntry) => {
    const worktrees = await listWorktrees(adapter);
    const managedWorktrees = worktrees.filter((wt) => !wt.isMain);
    setState({ phase: "worktree", project, worktrees: managedWorktrees });
  };

  const handleWorktreeSelect = (worktree: WorktreeInfo) => {
    setState({ phase: "result", message: worktree.path });
  };

  const handleWorktreeCreate = () => {
    setState({ phase: "result", message: "create" });
  };

  const handleWorktreeDelete = (_worktree: WorktreeInfo) => {
    // Deletion flow handled by parent process
  };

  const handleBack = () => {
    setState({ phase: "project", projects });
  };

  // Auto-exit after result is displayed
  const resultMessage = state.phase === "result" ? state.message : null;
  useEffect(() => {
    if (resultMessage) {
      // Print the selected path for shell wrapper to capture
      console.log(`__ARBOR_CD__:${resultMessage}`);
      exit();
    }
  }, [resultMessage, exit]);

  if (state.phase === "project") {
    return (
      <ProjectSelector
        projects={state.projects}
        onSelect={handleProjectSelect}
        onCancel={() => exit()}
        messages={messages}
      />
    );
  }

  if (state.phase === "worktree") {
    return (
      <WorktreeSelector
        worktrees={state.worktrees}
        onSelect={handleWorktreeSelect}
        onCreate={handleWorktreeCreate}
        onDelete={handleWorktreeDelete}
        onCancel={handleBack}
        messages={messages}
      />
    );
  }

  return (
    <Box>
      <Text dimColor>{state.message}</Text>
    </Box>
  );
};
