---
name: arbors-usage
description: Use when the user asks to create, switch, remove, list, or manage git worktrees with arbors. Also trigger when asking about arbors configuration, hooks, shell integration, or troubleshooting.
---

# arbors — Git Worktree Manager

CLI/TUI tool for managing git worktrees with auto dependency install, gitignored file copying, lifecycle hooks, and interactive fuzzy search.

## Commands

```sh
arbors                                  # Interactive TUI (TTY only)
arbors add <branch>                     # Checkout existing branch (local -> remote auto)
arbors add -c <branch> [<start-point>]  # Create new branch + worktree
arbors add -C <branch> [<start-point>]  # Force create (reset if exists)
arbors switch <branch>                  # Switch to existing worktree
arbors remove <branch...> [-f]          # Remove worktree(s), -r shorthand
arbors list [--porcelain]               # List managed worktrees
arbors run <branch> -- <command...>     # Run command in worktree context
arbors status [--porcelain]             # Current worktree info
arbors prune [-n]                       # Clean stale registry entries
arbors prune --merged [-n]              # Remove merged PR worktrees (requires gh)
arbors config [<key> [<value>]]         # Get/set/list config
arbors config --global <key> <value>    # Set global config
arbors config --unset <key>             # Remove config key
arbors excluded                         # Show exclude-from-copy patterns
arbors doctor                           # Environment health check
arbors completion bash|zsh              # Shell completion script
```

## Flags

| Flag            | Description                                   |
| --------------- | --------------------------------------------- |
| `-c`            | Create new branch (git switch -c)             |
| `-C`            | Force create, reset if exists (git switch -C) |
| `-f, --force`   | Force operation                               |
| `-n, --dry-run` | Preview without changes                       |
| `-q, --quiet`   | Minimal output                                |
| `--no-copy`     | Skip copying ignored files                    |
| `--no-install`  | Skip dependency installation                  |
| `--no-hooks`    | Skip lifecycle hooks                          |
| `--porcelain`   | Machine-readable stable output                |
| `--merged`      | Target merged PR worktrees                    |
| `--global`      | Use global config scope                       |
| `--unset`       | Remove a config key                           |

## Configuration

Global: `~/.arbors/config.json` | Project: `.arbors/config.json`

| Key             | Values                                                | Default                   |
| --------------- | ----------------------------------------------------- | ------------------------- |
| runtime         | node, bun                                             | node                      |
| language        | en, ko, ja                                            | en                        |
| packageManager  | auto, pnpm, yarn, npm                                 | auto                      |
| excludeFromCopy | string[]                                              | [node_modules, dist, ...] |
| worktreeDir     | string ({repo} placeholder)                           | ~/arbors/{repo}           |
| hooks           | { postCreate?, preRemove?, postRemove?, postSwitch? } | {}                        |

Environment variables (highest precedence): `ARBORS_RUNTIME`, `ARBORS_LANGUAGE`, `ARBORS_WORKTREE_DIR`, `ARBORS_PACKAGE_MANAGER`

## Hooks

Config-based:

```json
{ "hooks": { "postCreate": "npm run setup" } }
```

File-based: `.arbors/hooks/postCreate` (.sh, .js, .ts supported)

Hook env vars: `ARBORS_REPO_ROOT`, `ARBORS_WORKTREE_PATH`, `ARBORS_BRANCH`

preRemove blocks removal on failure (unless -f).

## .arborsinclude

Per-repo allowlist for files to copy. One pattern per line, # comments, gitignore-style globs. Include patterns override excludeFromCopy blocklist.

## Shell Integration

Required for cd after add/switch:

```sh
# ~/.zshrc
source /path/to/arbors/shell/arbors-wrapper.zsh

# ~/.bashrc
source /path/to/arbors/shell/arbors-wrapper.sh
```

## How add Works

1. Validate branch name
2. With `-c`: fetch base, create worktree + branch
3. Without `-c`: check local -> remote -> error with hint
4. Copy gitignored files (respecting excludeFromCopy + .arborsinclude)
5. Detect & run runtime manager (mise/nvm)
6. Detect & run package manager (pnpm/yarn/npm)
7. Register in ~/.arbors/db.json
8. Run postCreate hook

## Project Architecture

```
src/
  config.ts           Config loading + env var overrides
  hooks.ts            Lifecycle hook system
  index.ts            Public API exports
  git/
    worktree.ts       Core worktree operations
    safety.ts         Name validation, safety checks
    exclude.ts        Gitignored file copying + .arborsinclude
  project/
    registry.ts       ~/.arbors/db.json CRUD
    setup.ts          Package/runtime manager detection
  runtime/
    adapter.ts        RuntimeAdapter interface
    node.ts           Node.js implementation (CoW copy)
    bun.ts            Bun implementation
  i18n/               en, ko, ja message catalogs
  tui/                React Ink TUI components
bin/arbors.ts         CLI entry point
shell/                Shell wrappers for auto-cd
```

## Development

```sh
pnpm test       # vitest
pnpm lint       # oxlint
pnpm format     # oxfmt
pnpm build      # tsup (CLI + library)
pnpm typecheck  # tsc --noEmit
```

Programmatic API: `import { createWorktree } from 'arbors'`
