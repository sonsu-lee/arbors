import { describe, test, expect } from "vitest";
import { createAdapter } from "../src/runtime/index";

describe("createAdapter", () => {
  test("should return a node adapter when runtime is node", async () => {
    const adapter = await createAdapter("node");

    expect(adapter).toBeDefined();
    expect(adapter.exec).toBeTypeOf("function");
    expect(adapter.glob).toBeTypeOf("function");
    expect(adapter.readFile).toBeTypeOf("function");
    expect(adapter.writeFile).toBeTypeOf("function");
    expect(adapter.exists).toBeTypeOf("function");
    expect(adapter.copy).toBeTypeOf("function");
    expect(adapter.mkdir).toBeTypeOf("function");
  });

  test("should default to node adapter when not running in bun", async () => {
    // In vitest (Node.js), the default should be node
    const adapter = await createAdapter();

    expect(adapter).toBeDefined();
    expect(adapter.exec).toBeTypeOf("function");
  });
});
