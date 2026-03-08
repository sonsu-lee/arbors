import { join } from "node:path";
import type { RuntimeAdapter } from "../runtime/adapter";

type PackageManager = "pnpm" | "yarn" | "npm" | null;
type RuntimeManager = "mise" | "nvm" | null;

const LOCK_FILE_MAP: [string, PackageManager][] = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

const RUNTIME_MANAGER_MAP: [string, RuntimeManager][] = [
  ["mise.toml", "mise"],
  [".mise.toml", "mise"],
  [".nvmrc", "nvm"],
];

const detectFile = async <T>(
  adapter: RuntimeAdapter,
  cwd: string,
  entries: [string, T][],
): Promise<T | null> => {
  const results = await Promise.all(
    entries.map(async ([file, value]) => ({
      value,
      exists: await adapter.exists(join(cwd, file)),
    })),
  );

  return results.find((r) => r.exists)?.value ?? null;
};

export const detectPackageManager = async (
  adapter: RuntimeAdapter,
  cwd: string,
): Promise<PackageManager> => detectFile(adapter, cwd, LOCK_FILE_MAP);

export const detectRuntimeManager = async (
  adapter: RuntimeAdapter,
  cwd: string,
): Promise<RuntimeManager> => detectFile(adapter, cwd, RUNTIME_MANAGER_MAP);

const PM_INSTALL_ARGS: Record<string, string[]> = {
  pnpm: ["install"],
  yarn: ["install"],
  npm: ["install"],
};

const RM_INSTALL_ARGS: Record<string, [string, string[]]> = {
  mise: ["mise", ["install"]],
  nvm: ["bash", ["-c", "source ~/.nvm/nvm.sh && nvm install"]],
};

export const runSetup = async (
  adapter: RuntimeAdapter,
  cwd: string,
  configPm?: "auto" | "pnpm" | "yarn" | "npm",
): Promise<{ packageManager: string | null; runtimeManager: string | null }> => {
  const rm = await detectRuntimeManager(adapter, cwd);

  if (rm) {
    const [cmd, args] = RM_INSTALL_ARGS[rm];
    await adapter.exec(cmd, args);
  }

  const pm = configPm && configPm !== "auto" ? configPm : await detectPackageManager(adapter, cwd);

  if (pm) {
    await adapter.exec(pm, PM_INSTALL_ARGS[pm]);
  }

  return { packageManager: pm, runtimeManager: rm };
};
