# arbors

Git worktree manager CLI. Create/switch/remove worktrees with auto dependency install, gitignored file copying, and interactive fuzzy search.

## Tech Stack

- TypeScript (ESNext, bundler resolution)
- Ink (React TUI), tsup (bundler), vitest (test), oxlint/oxfmt (lint/format)
- pnpm, Node >=20

## Project Structure

src/config.ts            Config loading (global -> project merge)
src/git/worktree.ts      Core worktree operations
src/git/safety.ts        Name validation, safety checks
src/git/exclude.ts       Gitignored file copying via blocklist (excludeFromCopy)
src/project/registry.ts  ~/.arbors/db.json CRUD
src/project/setup.ts     Package manager & runtime detection
src/runtime/             RuntimeAdapter interface + Node/Bun implementations
src/i18n/                en, ko, ja message catalogs
bin/arbors.ts            CLI entry point
tests/                   vitest unit tests

## Dev Commands

pnpm test        vitest
pnpm lint        oxlint
pnpm format      oxfmt
pnpm build       tsup
pnpm typecheck   tsc --noEmit

## Commit Rules

Conventional commits, English only.
Types: feat, fix, docs, chore, test, refactor, ci
Details: see skills/commit/SKILL.md

## Release

Automated via release-please v4 on push to main. feat->minor, fix->patch, BREAKING CHANGE->major.
Details: see skills/release/SKILL.md

## Code Style

- Path alias: #/* -> ./src/*
- All file/process ops through RuntimeAdapter
- ESM only (type: "module")
- Strict TypeScript
