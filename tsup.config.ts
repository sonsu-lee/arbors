import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["bin/arbors.ts"],
  format: "esm",
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: [/.*/],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
