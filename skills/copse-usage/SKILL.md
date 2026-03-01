---
name: copse-usage
description: This skill should be used when the user asks to "create a worktree", "switch worktree", "manage worktrees", "use copse", "set up copse", "install copse", "configure copse", "remove worktree", "list worktrees", "delete worktree", or mentions git worktree management with copse. Also trigger when the user asks about copse's project structure, how copse works internally, how to develop or contribute to copse, or troubleshoot copse issues.
---

# copse — Git Worktree Manager

copse is a CLI/TUI tool for managing git worktrees. It handles worktree creation, `.git/info/exclude` file copying, package manager auto-detection, dependency installation, and project registry tracking.

## Quick Reference

```sh
copse add <branch>                     # Checkout existing branch (local → remote auto)
copse add -c <branch> [--base <base>]  # Create new branch + worktree
copse remove <branch>                  # Remove worktree (safety checks first)
copse list [--plain]                   # List copse-managed worktrees
copse excluded                         # Show .git/info/exclude patterns
copse config                           # Show current configuration
```

## Installation & Setup

Build and link globally:

```sh
cd <copse-repo>
pnpm install && pnpm build
npm link
```

Shell integration is required for auto-cd — a child process (node) cannot change the parent shell's cwd, so the wrapper script captures copse's `__COPSE_CD__:<path>` protocol output and runs `cd` in the parent shell.

```sh
# ~/.zshrc
source /path/to/copse/shell/copse-wrapper.zsh

# ~/.bashrc
source /path/to/copse/shell/copse-wrapper.sh
```

## How `copse add` Works

The `add` command handles both new and existing branches via the `-c` flag:

### With `-c` (create new branch)

`copse add -c <branch> [--base <base>]`

1. Validate branch name against `/^[a-zA-Z0-9][a-zA-Z0-9._\/-]*$/` (slashes allowed, no `..`)
2. Check if branch already exists — error if so
3. Run `git fetch origin <base>` then `git worktree add -b <branch> ~/copse/{repo}/<dir> origin/<base>` (dir = branch with `/` → `-`)
4. Copy files matching `.git/info/exclude` patterns (if `copyExcludes: true`)
5. Detect runtime manager (mise.toml → `mise install`, .nvmrc → `nvm install`)
6. Detect package manager (pnpm-lock.yaml → pnpm, yarn.lock → yarn, package-lock.json → npm) and run install
7. Register in `~/.copse/db.json` (project + worktree tracking)

### Without `-c` (checkout existing branch)

`copse add <branch>`

1. Validate branch name
2. If local branch exists → `git worktree add ~/copse/{repo}/<dir> <branch>`
3. Else if remote branch exists → `git fetch origin <branch>`, then create worktree from `origin/<branch>`
4. Else → error with hint to use `copse add -c`
5. Copy excluded files, install deps, register in db (same as above)

## Safety

- `copse remove` refuses to delete worktrees with uncommitted changes (`git status --porcelain`)
- Cannot remove the main worktree
- Name validation allows slashes (`feature/login`) but prevents path traversal (`..`) and unsafe characters
- Branch deletion (`git branch -D <branch>`) happens after worktree removal
- Branch existence is checked before creation to prevent overwriting

## Configuration

Global: `~/.copse/config.json` — Project override: `.copse/config.json` (in repo root, takes precedence)

| Key              | Values                                 | Default             |
| ---------------- | -------------------------------------- | ------------------- |
| `runtime`        | `"node"`, `"bun"`                      | `"node"`            |
| `language`       | `"en"`, `"ko"`, `"ja"`                 | `"en"`              |
| `packageManager` | `"auto"`, `"pnpm"`, `"yarn"`, `"npm"` | `"auto"`            |
| `copyExcludes`   | `true`, `false`                        | `true`              |
| `copySkip`       | `string[]`                             | `["node_modules"]`  |
| `worktreeDir`    | string with `{repo}` placeholder       | `"~/copse/{repo}"`  |

## Data Files

- `~/.copse/config.json` — Global configuration
- `~/.copse/db.json` — Project registry + worktree tracking (projects and worktrees per project)
- `.copse/config.json` — Per-project config override
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
│   ├── registry.ts        # ~/.copse/db.json read/write, project + worktree CRUD
│   └── setup.ts           # Package manager & runtime manager detection and install
├── runtime/
│   ├── adapter.ts         # RuntimeAdapter interface (exec, glob, readFile, etc.)
│   ├── node.ts            # Node.js implementation
│   ├── bun.ts             # Bun implementation
│   └── index.ts           # Factory: createAdapter(runtime)
└── i18n/                  # en, ko, ja message catalogs
bin/copse.ts               # CLI entry point (parseArgs, command dispatch)
shell/copse-wrapper.{zsh,sh}  # Shell wrappers for auto-cd
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
