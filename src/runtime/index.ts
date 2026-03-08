import type { RuntimeAdapter } from "./adapter";

export type { ExecResult, RuntimeAdapter } from "./adapter";

const isBun = (): boolean => Object.hasOwn(process.versions, "bun");

export const createAdapter = async (runtime?: "bun" | "node"): Promise<RuntimeAdapter> => {
  const resolved = runtime ?? (isBun() ? "bun" : "node");

  if (resolved === "bun") {
    const { createBunAdapter } = await import("./bun.js");
    return createBunAdapter();
  }

  const { createNodeAdapter } = await import("./node.js");
  return createNodeAdapter();
};
