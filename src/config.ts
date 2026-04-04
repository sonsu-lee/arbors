import { homedir } from "node:os";
import { join, resolve } from "node:path";

export interface HooksConfig {
  postCreate?: string;
  preRemove?: string;
  postRemove?: string;
  postSwitch?: string;
}

export interface ArborConfig {
  runtime: "bun" | "node";
  language: "ko" | "en" | "ja";
  packageManager: "auto" | "pnpm" | "yarn" | "npm";
  excludeFromCopy: string[];
  worktreeDir: string;
  hooks: HooksConfig;
}

const DEFAULT_CONFIG: ArborConfig = {
  runtime: "node",
  language: "en",
  packageManager: "auto",
  excludeFromCopy: [
    "node_modules",
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    ".turbo",
    ".cache",
    "coverage",
    "*.log",
  ],
  worktreeDir: "~/arbors/{repo}",
  hooks: {},
} satisfies ArborConfig;

const GLOBAL_CONFIG_PATH = join(homedir(), ".arbors", "config.json");
const PROJECT_CONFIG_DIR = ".arbors";
const PROJECT_CONFIG_FILE = "config.json";

const mergeConfig = (base: ArborConfig, override: Partial<ArborConfig>): ArborConfig => {
  return { ...base, ...override };
};

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

const loadEnvOverrides = (): Partial<ArborConfig> => {
  const env: Partial<ArborConfig> = {};
  if (process.env.ARBORS_RUNTIME === "bun" || process.env.ARBORS_RUNTIME === "node") {
    env.runtime = process.env.ARBORS_RUNTIME;
  }
  if (
    process.env.ARBORS_LANGUAGE === "ko" ||
    process.env.ARBORS_LANGUAGE === "en" ||
    process.env.ARBORS_LANGUAGE === "ja"
  ) {
    env.language = process.env.ARBORS_LANGUAGE;
  }
  if (process.env.ARBORS_WORKTREE_DIR) {
    env.worktreeDir = process.env.ARBORS_WORKTREE_DIR;
  }
  if (
    process.env.ARBORS_PACKAGE_MANAGER === "auto" ||
    process.env.ARBORS_PACKAGE_MANAGER === "pnpm" ||
    process.env.ARBORS_PACKAGE_MANAGER === "yarn" ||
    process.env.ARBORS_PACKAGE_MANAGER === "npm"
  ) {
    env.packageManager = process.env.ARBORS_PACKAGE_MANAGER;
  }
  return env;
};

export const loadConfig = async (
  readFile: (path: string) => Promise<string>,
  exists: (path: string) => Promise<boolean>,
  projectRoot?: string,
): Promise<ArborConfig> => {
  const globalOverride = await readJsonFile(readFile, exists, GLOBAL_CONFIG_PATH);
  let merged = mergeConfig(DEFAULT_CONFIG, globalOverride);

  if (projectRoot) {
    const projectConfigPath = resolve(projectRoot, PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE);
    const projectOverride = await readJsonFile(readFile, exists, projectConfigPath);
    merged = mergeConfig(merged, projectOverride);
  }

  // Env vars have highest precedence
  return mergeConfig(merged, loadEnvOverrides());
};

export const getGlobalConfigPath = (): string => GLOBAL_CONFIG_PATH;

export const getProjectConfigPath = (projectRoot: string): string =>
  resolve(projectRoot, PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE);

export { DEFAULT_CONFIG, mergeConfig };
