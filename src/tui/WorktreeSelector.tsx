import React from "react";
import { Text } from "ink";
import { FuzzyList } from "./FuzzyList.js";
import type { FuzzyListItem } from "./FuzzyList.js";
import type { WorktreeInfo } from "../git/worktree.js";
import type { Messages } from "../i18n/en.js";

interface WorktreeSelectorProps {
  worktrees: WorktreeInfo[];
  branchPrefix: string;
  onSelect: (worktree: WorktreeInfo) => void;
  onCreate: () => void;
  onDelete: (worktree: WorktreeInfo) => void;
  onCancel: () => void;
  messages: Messages;
}

export const WorktreeSelector: React.FC<WorktreeSelectorProps> = ({
  worktrees,
  branchPrefix,
  onSelect,
  onCancel,
  messages,
}) => {
  if (worktrees.length === 0) {
    return <Text>{messages.noWorktrees}</Text>;
  }

  const items: FuzzyListItem[] = worktrees.map((wt) => ({
    label: wt.branch.replace(`${branchPrefix}/`, ""),
    value: wt.path,
  }));

  const handleSelect = (item: FuzzyListItem) => {
    const worktree = worktrees.find((wt) => wt.path === item.value);
    if (worktree) onSelect(worktree);
  };

  return (
    <FuzzyList
      items={items}
      onSelect={handleSelect}
      onCancel={onCancel}
      title={messages.selectWorktree}
      helpText={messages.helpWorktree}
    />
  );
};
