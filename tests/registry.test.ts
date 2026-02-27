import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProjects, registerProject, removeProject } from "../src/project/registry.js";
import type { RuntimeAdapter } from "../src/runtime/adapter.js";

const createMockAdapter = (): RuntimeAdapter & { files: Map<string, string> } => {
  const files = new Map<string, string>();

  return {
    files,
    exec: vi.fn(),
    glob: vi.fn(),
    readFile: vi.fn(async (path: string) => {
      const content = files.get(path);
      if (!content) throw new Error("Not found");
      return content;
    }),
    writeFile: vi.fn(async (path: string, content: string) => {
      files.set(path, content);
    }),
    exists: vi.fn(async (path: string) => files.has(path)),
    copyFile: vi.fn(),
    mkdir: vi.fn(),
  };
};

describe("Project Registry", () => {
  let adapter: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  it("should return empty list when no projects registered", async () => {
    // Given: an empty registry (no db.json)
    // When: projects are fetched
    const projects = await getProjects(adapter);

    // Then: empty array returned
    expect(projects).toEqual([]);
  });

  it("should register and retrieve a project", async () => {
    // Given: an empty registry
    // When: a project is registered
    await registerProject(adapter, "my-app", "/home/user/my-app");

    // Then: it appears in the project list
    const projects = await getProjects(adapter);
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("my-app");
    expect(projects[0].path).toBe("/home/user/my-app");
  });

  it("should update lastAccessed when registering an existing project", async () => {
    // Given: a registered project
    await registerProject(adapter, "my-app", "/home/user/my-app");
    const firstAccess = (await getProjects(adapter))[0].lastAccessed;

    // When: the same path is registered again after a delay
    await new Promise((r) => setTimeout(r, 10));
    await registerProject(adapter, "my-app", "/home/user/my-app");

    // Then: lastAccessed is updated
    const projects = await getProjects(adapter);
    expect(projects).toHaveLength(1);
    expect(projects[0].lastAccessed).not.toBe(firstAccess);
  });

  it("should sort projects by most recently accessed", async () => {
    // Given: two projects registered at different times
    await registerProject(adapter, "old-app", "/old");
    await new Promise((r) => setTimeout(r, 10));
    await registerProject(adapter, "new-app", "/new");

    // When: projects are fetched
    const projects = await getProjects(adapter);

    // Then: most recent first
    expect(projects[0].name).toBe("new-app");
    expect(projects[1].name).toBe("old-app");
  });

  it("should remove a project by path", async () => {
    // Given: a registered project
    await registerProject(adapter, "my-app", "/home/user/my-app");

    // When: removed by path
    await removeProject(adapter, "/home/user/my-app");

    // Then: no projects remain
    const projects = await getProjects(adapter);
    expect(projects).toEqual([]);
  });
});
