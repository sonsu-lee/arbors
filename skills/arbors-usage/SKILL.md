---
name: arbors-usage
description: This skill should be used when the user asks to "create a worktree", "switch worktree", "manage worktrees", "use arbors", "set up arbors", "install arbors", "configure arbors", "remove worktree", "list worktrees", "delete worktree", or mentions git worktree management with arbors. Also trigger when the user asks about arbors's project structure, how arbors works internally, how to develop or contribute to arbors, or troubleshoot arbors issues.
---

# arbors — Git Worktree Manager

arbors is a CLI/TUI tool for managing git worktrees. It handles worktree creation, `.git/info/exclude` file copying, package manager auto-detection, dependency installation, and project registry tracking.

## Quick Reference

```sh
arbors add <branch>                     # Checkout existing branch (local → remote auto)
arbors add -c <branch> [--base <base>]  # Create new branch + worktree
arbors switch <branch>                  # Switch to existing worktree
arbors remove <branch>                  # Remove worktree (safety checks first)
arbors list [--plain]                   # List arbors-managed worktrees
arbors excluded                         # Show .git/info/exclude patterns
arbors config                           # Show current configuration
```

## Installation & Setup

Build and link globally:

```sh
cd <arbors-repo>
pnpm install && pnpm build
npm link
```

Shell integration is **required** for `arbors switch` and auto-cd after `arbors add` — a child process (node) cannot change the parent shell's cwd, so the wrapper script captures arbors's `__ARBORS_CD__:<path>` protocol output and runs `cd` in the parent shell. Without the wrapper, these commands will print the path but won't change directory.

```sh
# ~/.zshrc
source /path/to/arbors/shell/arbors-wrapper.zsh

# ~/.bashrc
source /path/to/arbors/shell/arbors-wrapper.sh
```

## How `arbors add` Works

The `add` command handles both new and existing branches via the `-c` flag:

### With `-c` (create new branch)

`arbors add -c <branch> [--base <base>]`

1. Validate branch name against `/^[a-zA-Z0-9][a-zA-Z0-9._\/-]*$/` (slashes allowed, no `..`)
2. Check if branch already exists — error if so
3. Run `git fetch origin <base>` then `git worktree add -b <branch> ~/arbors/{repo}/<dir> origin/<base>` (dir = branch with `/` → `-`)
4. Copy files matching `.git/info/exclude` patterns (if `copyExcludes: true`)
5. Detect runtime manager (mise.toml → `mise install`, .nvmrc → `nvm install`)
6. Detect package manager (pnpm-lock.yaml → pnpm, yarn.lock → yarn, package-lock.json → npm) and run install
7. Register in `~/.arbors/db.json` (project + worktree tracking)

### Without `-c` (checkout existing branch)

`arbors add <branch>`

1. Validate branch name
2. If local branch exists → `git worktree add ~/arbors/{repo}/<dir> <branch>`
3. Else if remote branch exists → `git fetch origin <branch>`, then create worktree from `origin/<branch>`
4. Else → error with hint to use `arbors add -c`
5. Copy excluded files, install deps, register in db (same as above)

## How `arbors switch` Works

`arbors switch <branch>`

1. List all git worktrees via `git worktree list --porcelain`
2. Find worktree matching the given branch name
3. If found → print `__ARBORS_CD__:<path>` (shell wrapper picks this up to auto-cd)
4. If not found → error with `worktreeNotFound` message

Unlike `add`, `switch` does not create anything — it only navigates to an existing worktree.

## Safety

- `arbors remove` refuses to delete worktrees with uncommitted changes (`git status --porcelain`)
- Cannot remove the main worktree
- Name validation allows slashes (`feature/login`) but prevents path traversal (`..`) and unsafe characters
- Branch deletion (`git branch -D <branch>`) happens after worktree removal
- Branch existence is checked before creation to prevent overwriting

## Configuration

Global: `~/.arbors/config.json` — Project override: `.arbors/config.json` (in repo root, takes precedence)

| Key              | Values                                 | Default             |
| ---------------- | -------------------------------------- | ------------------- |
| `runtime`        | `"node"`, `"bun"`                      | `"node"`            |
| `language`       | `"en"`, `"ko"`, `"ja"`                 | `"en"`              |
| `packageManager` | `"auto"`, `"pnpm"`, `"yarn"`, `"npm"` | `"auto"`            |
| `copyExcludes`   | `true`, `false`                        | `true`              |
| `copySkip`       | `string[]`                             | `["node_modules"]`  |
| `worktreeDir`    | string with `{repo}` placeholder       | `"~/arbors/{repo}"` |

## Data Files

- `~/.arbors/config.json` — Global configuration
- `~/.arbors/db.json` — Project registry + worktree tracking (projects and worktrees per project)
- `.arbors/config.json` — Per-project config override
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
│   ├── registry.ts        # ~/.arbors/db.json read/write, project + worktree CRUD
│   └── setup.ts           # Package manager & runtime manager detection and install
├── runtime/
│   ├── adapter.ts         # RuntimeAdapter interface (exec, glob, readFile, etc.)
│   ├── node.ts            # Node.js implementation
│   ├── bun.ts             # Bun implementation
│   └── index.ts           # Factory: createAdapter(runtime)
└── i18n/                  # en, ko, ja message catalogs
bin/arbors.ts               # CLI entry point (parseArgs, command dispatch)
shell/arbors-wrapper.{zsh,sh}  # Shell wrappers for auto-cd
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
