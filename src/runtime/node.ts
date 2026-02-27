import { execFile } from "node:child_process";
import { copyFile, glob, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";
import type { RuntimeAdapter } from "./adapter.js";

const execFileAsync = promisify(execFile);

export const createNodeAdapter = (): RuntimeAdapter => ({
  async exec(cmd, args) {
    try {
      const { stdout, stderr } = await execFileAsync(cmd, args);
      return { stdout: stdout.trimEnd(), stderr: stderr.trimEnd(), exitCode: 0 };
    } catch (error: unknown) {
      const err = error as { stdout?: string; stderr?: string; code?: number };
      return {
        stdout: (err.stdout ?? "").trimEnd(),
        stderr: (err.stderr ?? "").trimEnd(),
        exitCode: err.code ?? 1,
      };
    }
  },

  async glob(pattern, cwd) {
    const matches: string[] = [];
    for await (const entry of glob(pattern, { cwd })) {
      matches.push(entry);
    }
    return matches.sort();
  },

  async readFile(path) {
    return readFile(path, "utf-8");
  },

  async writeFile(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf-8");
  },

  async exists(path) {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  },

  async copyFile(src, dest) {
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(src, dest);
  },

  async mkdir(path) {
    await mkdir(path, { recursive: true });
  },
});
