import { dirname } from "node:path";
import type { RuntimeAdapter } from "./adapter.js";

export const createBunAdapter = (): RuntimeAdapter => ({
  async exec(cmd, args) {
    const proc = Bun.spawn([cmd, ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;
    return { stdout: stdout.trimEnd(), stderr: stderr.trimEnd(), exitCode };
  },

  async glob(pattern, cwd) {
    const bunGlob = new Bun.Glob(pattern);
    const matches: string[] = [];
    for await (const entry of bunGlob.scan({ cwd })) {
      matches.push(entry);
    }
    return matches.sort();
  },

  async readFile(path) {
    return Bun.file(path).text();
  },

  async writeFile(path, content) {
    await Bun.write(path, content);
  },

  async exists(path) {
    return Bun.file(path).exists();
  },

  async copy(src, dest) {
    const { cp, mkdir } = await import("node:fs/promises");
    await mkdir(dirname(dest), { recursive: true });
    await cp(src, dest, { recursive: true });
  },

  async mkdir(path) {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(path, { recursive: true });
  },
});
