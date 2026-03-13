import { useEffect, useState } from "react";
import { Text, render } from "ink";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const INTERVAL = 80;

const Spinner = ({ label }: { label: string }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % FRAMES.length);
    }, INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <Text>
      <Text color="cyan">{FRAMES[index]}</Text>
      <Text dimColor> {label}</Text>
    </Text>
  );
};

export async function withSpinner<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!process.stdout.isTTY) {
    console.log(label);
    return fn();
  }

  const inst = render(<Spinner label={label} />, { patchConsole: false });

  try {
    return await fn();
  } finally {
    inst.clear();
    inst.unmount();
  }
}
