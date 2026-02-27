import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import Fuse from "fuse.js";

export interface FuzzyListItem {
  label: string;
  value: string;
  meta?: string;
}

interface FuzzyListProps {
  items: FuzzyListItem[];
  onSelect: (item: FuzzyListItem) => void;
  onCancel: () => void;
  title: string;
  helpText: string;
  maxResults?: number;
}

const MAX_VISIBLE = 10;

export const FuzzyList: React.FC<FuzzyListProps> = ({
  items,
  onSelect,
  onCancel,
  title,
  helpText,
  maxResults = MAX_VISIBLE,
}) => {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const fuse = useMemo(
    () => new Fuse(items, { keys: ["label", "value"], threshold: 0.4 }),
    [items],
  );

  const filtered = useMemo(() => {
    if (query === "") return items.slice(0, maxResults);
    return fuse
      .search(query)
      .slice(0, maxResults)
      .map((r) => r.item);
  }, [query, items, fuse, maxResults]);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return && filtered.length > 0) {
      onSelect(filtered[cursor]);
      return;
    }

    if (key.tab && filtered.length > 0) {
      setQuery(filtered[0].label);
      setCursor(0);
      return;
    }

    if (key.upArrow) {
      setCursor((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setCursor((prev) => Math.min(filtered.length - 1, prev + 1));
      return;
    }

    if (key.backspace || key.delete) {
      setQuery((prev) => prev.slice(0, -1));
      setCursor(0);
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setQuery((prev) => prev + input);
      setCursor(0);
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      <Box>
        <Text dimColor>{"> "}</Text>
        <Text>{query}</Text>
        <Text dimColor>{"█"}</Text>
      </Box>

      {filtered.length === 0 ? (
        <Text dimColor> No matches</Text>
      ) : (
        filtered.map((item, i) => (
          <Box key={item.value}>
            <Text color={i === cursor ? "cyan" : undefined}>{i === cursor ? "→ " : "  "}</Text>
            <Text bold={i === cursor}>{item.label}</Text>
            {item.meta ? <Text dimColor>{` (${item.meta})`}</Text> : null}
          </Box>
        ))
      )}

      <Box marginTop={1}>
        <Text dimColor>{helpText}</Text>
      </Box>
    </Box>
  );
};
