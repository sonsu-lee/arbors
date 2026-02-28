---
name: arbor-usage
description: This skill should be used when the user asks to "create a worktree", "switch worktree", "manage worktrees", "use arbor", "set up arbor", "install arbor", "configure arbor", "remove worktree", "list worktrees", "delete worktree", or mentions git worktree management with arbor. Also trigger when the user asks about arbor's project structure, how arbor works internally, how to develop or contribute to arbor, or troubleshoot arbor issues.
---

# arbor — Git Worktree Manager

arbor is a CLI/TUI tool for managing git worktrees. It handles worktree creation, `.git/info/exclude` file copying, package manager auto-detection, dependency installation, and project registry tracking.

## Quick Reference

```sh
arbor                              # Launch interactive TUI (fuzzy search)
arbor add <name> [--base <branch>] # Create worktree → branch arbor/<name>
arbor remove <name>                # Remove worktree (safety checks first)
arbor list [--plain]               # List arbor-managed worktrees
arbor excluded                     # Show .git/info/exclude patterns
arbor config                       # Show current configuration
```

## Installation & Setup

Build and link globally:

```sh
cd <arbor-repo>
pnpm install && pnpm build
npm link
```

Shell integration is required for auto-cd after worktree selection — without it, TUI selection works but the shell stays in the current directory. A child process (node) cannot change the parent shell's cwd, so the wrapper script captures arbor's `__ARBOR_CD__:<path>` protocol output and runs `cd` in the parent shell.

```sh
# ~/.zshrc
source /path/to/arbor/shell/arbor-wrapper.zsh

# ~/.bashrc
source /path/to/arbor/shell/arbor-wrapper.sh
```

## How `arbor add` Works

1. Validate name against `/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/` (no `..` allowed)
2. Run `git worktree add -b arbor/<name> ../{repo}-arbor/<name> <base>`
3. Copy files matching `.git/info/exclude` patterns to the new worktree (if `copyExcludes: true`)
4. Detect runtime manager (mise.toml → `mise install`, .nvmrc → `nvm install`)
5. Detect package manager (pnpm-lock.yaml → pnpm, yarn.lock → yarn, package-lock.json → npm) and run install
6. Register the project in `~/.arbor/db.json` with timestamp

## Safety

- `arbor remove` refuses to delete worktrees with uncommitted changes (`git status --porcelain`)
- Cannot remove the main worktree
- Name validation prevents path traversal and unsafe characters
- Branch deletion (`git branch -D arbor/<name>`) happens after worktree removal

## Configuration

Global: `~/.arbor/config.json` — Project override: `.arbor/config.json` (in repo root, takes precedence)

| Key              | Values                                 | Default             |
| ---------------- | -------------------------------------- | ------------------- |
| `runtime`        | `"node"`, `"bun"`                      | `"node"`            |
| `language`       | `"en"`, `"ko"`, `"ja"`                 | `"en"`              |
| `packageManager` | `"auto"`, `"pnpm"`, `"yarn"`, `"npm"` | `"auto"`            |
| `copyExcludes`   | `true`, `false`                        | `true`              |
| `worktreeDir`    | string with `{repo}` placeholder       | `"../{repo}-arbor"` |

## Data Files

- `~/.arbor/config.json` — Global configuration
- `~/.arbor/db.json` — Project registry (name, path, lastAccessed per project)
- `.arbor/config.json` — Per-project config override
- `.git/info/exclude` — Patterns for files to copy into new worktrees

## Project Architecture

For development and contribution context:

```
src/
├── config.ts              # Config loading (global → project merge)
├── git/
│   ├── worktree.ts        # Core: create/remove/list worktrees, detect default branch
│   ├── safety.ts          # Name validation, uncommitted changes check, main worktree guard
│   └── exclude.ts         # Parse .git/info/exclude, find matching files, copy to worktree
├── project/
│   ├── registry.ts        # ~/.arbor/db.json read/write, project CRUD
│   └── setup.ts           # Package manager & runtime manager detection and install
├── runtime/
│   ├── adapter.ts         # RuntimeAdapter interface (exec, glob, readFile, etc.)
│   ├── node.ts            # Node.js implementation
│   ├── bun.ts             # Bun implementation
│   └── index.ts           # Factory: createAdapter(runtime)
└── i18n/                  # en, ko, ja message catalogs
bin/arbor.ts               # CLI entry point (parseArgs, command dispatch)
shell/arbor-wrapper.{zsh,sh}  # Shell wrappers for auto-cd
```

Key pattern: all file/process operations go through `RuntimeAdapter`, enabling both Node and Bun runtimes.

### Development Commands

```sh
pnpm test       # vitest
pnpm lint       # oxlint
pnpm format     # oxfmt
pnpm build      # tsup
pnpm typecheck  # tsc --noEmit
```
