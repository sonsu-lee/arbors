import { spawn } from "node:child_process";
import { cp, glob, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RuntimeAdapter } from "./adapter";

export const createNodeAdapter = (): RuntimeAdapter => ({
  async exec(cmd, args, options) {
    return new Promise((resolve) => {
      const proc = spawn(cmd, args, {
        stdio: ["ignore", "pipe", "pipe"],
        cwd: options?.cwd,
        env: options?.env ? { ...process.env, ...options.env } : undefined,
      });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk;
      });
      proc.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk;
      });
      proc.on("close", (code) => {
        resolve({ stdout: stdout.trimEnd(), stderr: stderr.trimEnd(), exitCode: code ?? 1 });
      });
    });
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

  async copy(src, dest) {
    await mkdir(dirname(dest), { recursive: true });
    await cp(src, dest, { recursive: true });
  },

  async mkdir(path) {
    await mkdir(path, { recursive: true });
  },
});
