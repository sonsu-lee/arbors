import { homedir } from "node:os";
import { join } from "node:path";
import type { RuntimeAdapter } from "../runtime/adapter.js";

export interface ProjectEntry {
  name: string;
  path: string;
  lastAccessed: string;
}

interface RegistryData {
  projects: ProjectEntry[];
}

const DB_PATH = join(homedir(), ".arbor", "db.json");

const readRegistry = async (adapter: RuntimeAdapter): Promise<RegistryData> => {
  if (!(await adapter.exists(DB_PATH))) return { projects: [] };

  try {
    const content = await adapter.readFile(DB_PATH);
    return JSON.parse(content) as RegistryData;
  } catch {
    return { projects: [] };
  }
};

const writeRegistry = async (adapter: RuntimeAdapter, data: RegistryData): Promise<void> => {
  await adapter.writeFile(DB_PATH, JSON.stringify(data, null, 2));
};

export const getProjects = async (adapter: RuntimeAdapter): Promise<ProjectEntry[]> =>
  (await readRegistry(adapter)).projects.toSorted(
    (a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime(),
  );

export const registerProject = async (
  adapter: RuntimeAdapter,
  name: string,
  path: string,
): Promise<void> => {
  const data = await readRegistry(adapter);
  const now = new Date().toISOString();

  const existing = data.projects.findIndex((p) => p.path === path);

  if (existing !== -1) {
    data.projects[existing] = { ...data.projects[existing], lastAccessed: now };
  } else {
    data.projects.push({ name, path, lastAccessed: now });
  }

  await writeRegistry(adapter, data);
};

export const touchProject = async (adapter: RuntimeAdapter, path: string): Promise<void> => {
  const data = await readRegistry(adapter);
  const entry = data.projects.find((p) => p.path === path);

  if (entry) {
    entry.lastAccessed = new Date().toISOString();
    await writeRegistry(adapter, data);
  }
};

export const removeProject = async (adapter: RuntimeAdapter, path: string): Promise<void> => {
  const data = await readRegistry(adapter);
  data.projects = data.projects.filter((p) => p.path !== path);
  await writeRegistry(adapter, data);
};
