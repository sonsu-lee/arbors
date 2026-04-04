import { defineConfig } from "tsup";

const stubDevtools = {
  name: "stub-devtools",
  // biome-ignore lint: esbuild plugin typing
  setup(build: any) {
    build.onResolve({ filter: /^react-devtools-core$/ }, (args: any) => ({
      path: args.path,
      namespace: "stub-devtools",
    }));
    build.onLoad({ filter: /.*/, namespace: "stub-devtools" }, () => ({
      contents: "export default {}",
    }));
  },
};

export default defineConfig([
  // CLI entry (with shebang + createRequire)
  {
    entry: ["bin/arbors.ts"],
    format: "esm",
    target: "node20",
    outDir: "dist",
    clean: true,
    sourcemap: true,
    noExternal: [/.*/],
    splitting: false,
    esbuildPlugins: [stubDevtools],
    banner: {
      js: [
        "#!/usr/bin/env node",
        'import { createRequire as __arbors_createRequire } from "node:module";',
        "var require = __arbors_createRequire(import.meta.url);",
      ].join("\n"),
    },
  },
  // Library entry (no shebang, with dts)
  {
    entry: ["src/index.ts"],
    format: "esm",
    target: "node20",
    outDir: "dist",
    dts: true,
    sourcemap: true,
    noExternal: [/.*/],
    splitting: false,
    esbuildPlugins: [stubDevtools],
  },
]);
