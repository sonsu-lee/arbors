import { homedir } from "node:os";
import { join, resolve } from "node:path";

export interface ArborConfig {
  runtime: "bun" | "node";
  language: "ko" | "en" | "ja";
  packageManager: "auto" | "pnpm" | "yarn" | "npm";
  copyExcludes: boolean;
  worktreeDir: string;
}

const DEFAULT_CONFIG: ArborConfig = {
  runtime: "node",
  language: "en",
  packageManager: "auto",
  copyExcludes: true,
  worktreeDir: "../{repo}-arbor",
} satisfies ArborConfig;

const GLOBAL_CONFIG_PATH = join(homedir(), ".arbor", "config.json");
const PROJECT_CONFIG_DIR = ".arbor";
const PROJECT_CONFIG_FILE = "config.json";

const mergeConfig = (base: ArborConfig, override: Partial<ArborConfig>): ArborConfig => ({
  ...base,
  ...override,
});

const readJsonFile = async (
  readFile: (path: string) => Promise<string>,
  exists: (path: string) => Promise<boolean>,
  path: string,
): Promise<Partial<ArborConfig>> => {
  if (!(await exists(path))) return {};

  try {
    const content = await readFile(path);
    return JSON.parse(content) as Partial<ArborConfig>;
  } catch {
    return {};
  }
};

export const loadConfig = async (
  readFile: (path: string) => Promise<string>,
  exists: (path: string) => Promise<boolean>,
  projectRoot?: string,
): Promise<ArborConfig> => {
  const globalOverride = await readJsonFile(readFile, exists, GLOBAL_CONFIG_PATH);
  const merged = mergeConfig(DEFAULT_CONFIG, globalOverride);

  if (!projectRoot) return merged;

  const projectConfigPath = resolve(projectRoot, PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE);
  const projectOverride = await readJsonFile(readFile, exists, projectConfigPath);

  return mergeConfig(merged, projectOverride);
};

export const getGlobalConfigPath = (): string => GLOBAL_CONFIG_PATH;

export const getProjectConfigPath = (projectRoot: string): string =>
  resolve(projectRoot, PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE);

export { DEFAULT_CONFIG, mergeConfig };
