# Changelog

## [2.0.0](https://github.com/sonsu-lee/arbors/compare/arbors-v1.0.0...arbors-v2.0.0) (2026-04-05)


### ⚠ BREAKING CHANGES

* --base flag removed in favor of positional start-point argument. Use `arbors add -c feature main` instead of `arbors add -c feature --base main`.

### Features

* add .remember, .superset in gitignore ([474ded0](https://github.com/sonsu-lee/arbors/commit/474ded0dc59bd8d14e0ff2bfa677bd5e0a575521))
* add animated spinner for long-running CLI operations ([d0fe5bd](https://github.com/sonsu-lee/arbors/commit/d0fe5bd65fc524bd0bdd2d53d41d4a7f5e180926))
* add config get/set/unset and shell completion ([96eee9d](https://github.com/sonsu-lee/arbors/commit/96eee9d9ea21d509739dd99baf3b533d8617cb0b))
* add CoW file copying and interactive TUI mode ([1df36e3](https://github.com/sonsu-lee/arbors/commit/1df36e3ff4b1c80cc81d396cb2b217487c277eea))
* add cwd option to RuntimeAdapter.exec ([b59f1b4](https://github.com/sonsu-lee/arbors/commit/b59f1b4583f3455dd6d0e9f059fae0d7d0494938))
* add env var config, hooks, .arborsinclude, and doctor ([29b139a](https://github.com/sonsu-lee/arbors/commit/29b139a07b3771e9d079c91b5b4115df7ca242a9))
* add run, status, prune commands and CI flags ([e0061b2](https://github.com/sonsu-lee/arbors/commit/e0061b2080cc4d0e52cef3dd35b480e4f968ac56))
* detect main repo context from linked worktrees ([63c3350](https://github.com/sonsu-lee/arbors/commit/63c335060f14aa9f848ad11d2246e4a7ff1a6380))
* dynamic version from package.json and i18n message expansion ([2660487](https://github.com/sonsu-lee/arbors/commit/2660487dc59aa34aeacdaa2ecd11041fd1c35fb8))
* expose programmatic API via package exports ([ea11ff9](https://github.com/sonsu-lee/arbors/commit/ea11ff968666711353d9e1df235634ff22b9f84e))
* redesign CLI with git-style patterns ([5a444af](https://github.com/sonsu-lee/arbors/commit/5a444afdd627ed824d13ae2c9f424acdb91fde0f))
* redesign CLI with git-style patterns ([#24](https://github.com/sonsu-lee/arbors/issues/24), [#25](https://github.com/sonsu-lee/arbors/issues/25), [#27](https://github.com/sonsu-lee/arbors/issues/27)) ([582eacc](https://github.com/sonsu-lee/arbors/commit/582eaccdd179f4ef2aff8c478cf0c8295625c5bb))
* support batch worktree removal with multiple branch arguments ([9049ded](https://github.com/sonsu-lee/arbors/commit/9049dedbf8bcf2267eede19f1dff9c21e0ca848c))


### Bug Fixes

* add repository url to package.json for npm provenance ([56fef0e](https://github.com/sonsu-lee/arbors/commit/56fef0eab839e514d51edbf9897203d53377c798))
* correct onlyBuiltDependencies format in pnpm-workspace.yaml ([518bc14](https://github.com/sonsu-lee/arbors/commit/518bc144abff5e1e7b756605556f7ebfd663a5e6))
* disable code splitting so createRequire shim applies to all bundle code ([0003968](https://github.com/sonsu-lee/arbors/commit/000396820c1c09b99520c39efb615c6a67933afb))
* handle detached worktree removal ([f81c580](https://github.com/sonsu-lee/arbors/commit/f81c580b7ee81a5ddc64843e1d854d4798945542)), closes [#20](https://github.com/sonsu-lee/arbors/issues/20)
* inject createRequire shim to support CJS dynamic requires in ESM bundle ([3e2ef10](https://github.com/sonsu-lee/arbors/commit/3e2ef1044865807a965924a110ca48607fa4a2af)), closes [#15](https://github.com/sonsu-lee/arbors/issues/15)
* pass project root to loadConfig for project-level config ([067aa06](https://github.com/sonsu-lee/arbors/commit/067aa065aa897d10fe5a815d3d95730cd377571a))
* run pnpm build in bundle test beforeAll for CI compatibility ([d28732a](https://github.com/sonsu-lee/arbors/commit/d28732a0c936f585c81802043e10adcaa153e5b7))
* skip copying gitignored files whose source does not exist ([f5c4f52](https://github.com/sonsu-lee/arbors/commit/f5c4f52925df88aa12e191e9fed33237815365a6)), closes [#18](https://github.com/sonsu-lee/arbors/issues/18)

## [1.0.0](https://github.com/sonsu-lee/arbors/compare/arbors-v0.1.1...arbors-v1.0.0) (2026-03-05)


### ⚠ BREAKING CHANGES

* switch from copyPatterns allowlist to excludeFromCopy blocklist

### feat\

* switch from copyPatterns allowlist to excludeFromCopy blocklist ([12e9477](https://github.com/sonsu-lee/arbors/commit/12e9477fdcc741569071cb9f6ef15c9a59d00da1))


### Features

* add --force flag to remove command ([edff20c](https://github.com/sonsu-lee/arbors/commit/edff20c7ef801c356d0bcc58059f86578fdd93d3))
* add --force flag to remove command ([d96aea6](https://github.com/sonsu-lee/arbors/commit/d96aea6b63f6e6f7b98a72a3008b4cd4e5040ac2))
* add -r shorthand for remove command ([3e09008](https://github.com/sonsu-lee/arbors/commit/3e09008d3583fbf9694b85b9256da783eac020f2))


### Bug Fixes

* **ci:** use PAT for release-please to trigger CI on release PRs ([8a3cc06](https://github.com/sonsu-lee/arbors/commit/8a3cc068b1d8e90d31fa868da6a8ee4ac7380ac1))
* show actual git branch names in arbors list ([580194e](https://github.com/sonsu-lee/arbors/commit/580194e4a3eeeef8340edfd63371e8049ea8d5e7))
* use spawn instead of execFile to remove stdout buffer limit ([61fe1a0](https://github.com/sonsu-lee/arbors/commit/61fe1a0d4d1469414b5140c5c6c15848d5d2e5ec))
