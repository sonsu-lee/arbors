import React from "react";
import { Text } from "ink";
import { FuzzyList } from "./FuzzyList";
import type { FuzzyListItem } from "./FuzzyList";
import type { ProjectEntry } from "../project/registry";
import type { Messages } from "../i18n/en";

interface ProjectSelectorProps {
  projects: ProjectEntry[];
  onSelect: (project: ProjectEntry) => void;
  onCancel: () => void;
  messages: Messages;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  onSelect,
  onCancel,
  messages,
}) => {
  if (projects.length === 0) {
    return <Text>{messages.noProjects}</Text>;
  }

  const items: FuzzyListItem[] = projects.map((p) => ({
    label: p.name,
    value: p.path,
    meta: new Intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(p.lastAccessed)),
  }));

  const handleSelect = (item: FuzzyListItem) => {
    const project = projects.find((p) => p.path === item.value);
    if (project) onSelect(project);
  };

  return (
    <FuzzyList
      items={items}
      onSelect={handleSelect}
      onCancel={onCancel}
      title={messages.selectProject}
      helpText={messages.helpFooter}
    />
  );
};
