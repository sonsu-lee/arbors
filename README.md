# copse

[한국어](./README.ko.md) | [日本語](./README.ja.md)

A CLI tool for managing git worktrees.

Create a separate directory for each branch and work on multiple branches simultaneously — no stash or switch needed. Automatically copies exclude files and installs dependencies when creating worktrees.

## Install

```sh
git clone git@github.com:sungsulee/copse.git
cd copse
pnpm install && pnpm build
npm link
```

Shell integration (auto `cd` after worktree selection):

```sh
# ~/.zshrc
source /path/to/copse/shell/copse-wrapper.zsh

# ~/.bashrc
source /path/to/copse/shell/copse-wrapper.sh
```

## Workflows

### New feature development

```sh
# Create a new branch + worktree based on main
copse new feature/login --base main

# This automatically:
#   1. git fetch origin main
#   2. Creates worktree at ~/copse/{repo}/feature-login
#   3. Copies files listed in .git/info/exclude (.env, etc.)
#   4. Runs pnpm install (auto-detects from lockfile)

cd ~/copse/my-project/feature-login
# Start working
```

When done:

```sh
copse remove feature/login
# Refuses to delete if there are uncommitted changes
```

### Code reviewing a colleague's PR

Check out a remote branch as a local worktree:

```sh
# Automatically fetches from origin and creates worktree
copse add feature/payment

# If the branch already exists locally, just creates the worktree
# → Tries local first, falls back to origin
```

When review is done:

```sh
copse remove feature/payment
```

### Working on multiple branches at once

```sh
copse new feature/auth --base main
copse new fix/header-bug --base main

copse list
# feature/auth    ~/copse/my-project/feature-auth
# fix/header-bug  ~/copse/my-project/fix-header-bug

# Work independently in each directory. No stashing needed.
```

## Commands

```
copse new <branch> [--base <branch>]   Create new branch + worktree
copse add <branch>                     Checkout existing branch (local → remote auto)
copse remove <branch>                  Remove worktree (with safety checks)
copse list [--plain]                   List managed worktrees
copse excluded                         Show exclude patterns
copse config                           Show current config
```

## Configuration

`~/.copse/config.json` (global) or `.copse/config.json` (per-project, takes precedence):

```json
{
  "runtime": "node",
  "language": "en",
  "packageManager": "auto",
  "copyExcludes": true,
  "copySkip": ["node_modules"],
  "worktreeDir": "~/copse/{repo}"
}
```

| Key              | Values                                | Default             |
| ---------------- | ------------------------------------- | ------------------- |
| `runtime`        | `"node"`, `"bun"`                     | `"node"`            |
| `language`       | `"en"`, `"ko"`, `"ja"`               | `"en"`              |
| `packageManager` | `"auto"`, `"pnpm"`, `"yarn"`, `"npm"` | `"auto"`            |
| `copyExcludes`   | `true`, `false`                       | `true`              |
| `copySkip`       | `string[]`                            | `["node_modules"]`  |
| `worktreeDir`    | string (`{repo}` placeholder)         | `"~/copse/{repo}"`  |

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
