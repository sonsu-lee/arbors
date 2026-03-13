import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["bin/arbors.ts"],
  format: "esm",
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: [/.*/],
  esbuildPlugins: [
    {
      name: "external-devtools",
      setup(build) {
        build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
          external: true,
        }));
      },
    },
  ],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
