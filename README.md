# arbors

[한국어](./README.ko.md) | [日本語](./README.ja.md)

A CLI tool for managing git worktrees.

Create a separate directory for each branch and work on multiple branches simultaneously — no stash or switch needed. Automatically copies exclude files and installs dependencies when creating worktrees.

## Install

```sh
git clone git@github.com:sungsulee/arbors.git
cd arbors
pnpm install && pnpm build
npm link
```

Shell integration (auto `cd` after worktree selection):

```sh
# ~/.zshrc
source /path/to/arbors/shell/arbors-wrapper.zsh

# ~/.bashrc
source /path/to/arbors/shell/arbors-wrapper.sh
```

## Workflows

### New feature development

```sh
# Create a new branch + worktree based on main
arbors add -c feature/login --base main

# This automatically:
#   1. git fetch origin main
#   2. Creates worktree at ~/arbors/{repo}/feature-login
#   3. Copies files listed in .git/info/exclude (.env, etc.)
#   4. Runs pnpm install (auto-detects from lockfile)

cd ~/arbors/my-project/feature-login
# Start working
```

When done:

```sh
arbors remove feature/login
# Refuses to delete if there are uncommitted changes
```

### Code reviewing a colleague's PR

Check out a remote branch as a local worktree:

```sh
# Automatically fetches from origin and creates worktree
arbors add feature/payment

# If the branch already exists locally, just creates the worktree
# → Tries local first, falls back to origin
```

When review is done:

```sh
arbors remove feature/payment
```

### Working on multiple branches at once

```sh
arbors add -c feature/auth --base main
arbors add -c fix/header-bug --base main

arbors list
# feature/auth    ~/arbors/my-project/feature-auth
# fix/header-bug  ~/arbors/my-project/fix-header-bug

# Work independently in each directory. No stashing needed.
```

## Commands

```
arbors add <branch>                     Checkout existing branch (local → remote auto)
arbors add -c <branch> [--base <branch>]  Create new branch + worktree
arbors remove <branch>                  Remove worktree (with safety checks)
arbors list [--plain]                   List managed worktrees
arbors excluded                         Show exclude patterns
arbors config                           Show current config
```

## Configuration

`~/.arbors/config.json` (global) or `.arbors/config.json` (per-project, takes precedence):

```json
{
  "runtime": "node",
  "language": "en",
  "packageManager": "auto",
  "copyExcludes": true,
  "copySkip": ["node_modules"],
  "worktreeDir": "~/arbors/{repo}"
}
```

| Key              | Values                                | Default             |
| ---------------- | ------------------------------------- | ------------------- |
| `runtime`        | `"node"`, `"bun"`                     | `"node"`            |
| `language`       | `"en"`, `"ko"`, `"ja"`               | `"en"`              |
| `packageManager` | `"auto"`, `"pnpm"`, `"yarn"`, `"npm"` | `"auto"`            |
| `copyExcludes`   | `true`, `false`                       | `true`              |
| `copySkip`       | `string[]`                            | `["node_modules"]`  |
| `worktreeDir`    | string (`{repo}` placeholder)         | `"~/arbors/{repo}"` |

## Development

```sh
pnpm test       # vitest
pnpm lint       # oxlint
pnpm format     # oxfmt
pnpm build      # tsup
pnpm typecheck  # tsc --noEmit
```

## License

MIT
