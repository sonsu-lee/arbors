# arbors

[한국어](./README.ko.md) | [日本語](./README.ja.md)

A git worktree manager CLI. Create a separate directory for each branch and work on multiple branches simultaneously — no stash or switch needed. Automatically copies gitignored files, installs dependencies, and runs hooks when creating worktrees.

## Install

```sh
npm install -g arbors
```

Or build from source:

```sh
git clone https://github.com/sonsu-lee/arbors.git
cd arbors
pnpm install && pnpm build
npm link
```

Requires Node >= 20. Bun is also supported.

## Quick Start

```sh
# Create a new feature branch + worktree from main
arbors add -c feature/login main

# Check out a colleague's remote branch for review
arbors add feature/payment

# Interactive fuzzy search across all worktrees
arbors
```

## Commands

### `arbors` (no arguments, TTY)

Opens an interactive TUI with fuzzy search to browse and switch between worktrees.

### `arbors add <branch>`

Check out an existing branch as a new worktree. Tries local branches first, falls back to remote.

```sh
arbors add feature/payment
```

### `arbors add -c <branch> [<start-point>]`

Create a new branch and worktree. The optional start-point defaults to the current HEAD.

```sh
arbors add -c feature/login main
arbors add -c fix/header           # branches from HEAD
```

### `arbors add -C <branch> [<start-point>]`

Force create — resets the branch if it already exists.

```sh
arbors add -C feature/login main
```

### `arbors switch <branch>`

Switch to an existing worktree (changes directory via shell integration).

```sh
arbors switch feature/login
```

### `arbors remove <branch...> [-f]`

Remove one or more worktrees. Alias: `arbors -r`. Refuses to delete if there are uncommitted changes unless `-f` is passed.

```sh
arbors remove feature/login
arbors remove feature/login fix/header    # batch removal
arbors remove feature/login -f            # force remove
```

### `arbors list [--porcelain]`

List all managed worktrees. Use `--porcelain` for machine-readable output.

```sh
arbors list
arbors list --porcelain
```

### `arbors run <branch> -- <command...>`

Run a command in the context of a worktree without switching to it.

```sh
arbors run feature/login -- pnpm test
arbors run fix/header -- git status
```

### `arbors status [--porcelain]`

Show information about the current worktree.

```sh
arbors status
arbors status --porcelain
```

### `arbors prune [-n]`

Clean stale registry entries. Use `-n` / `--dry-run` to preview without deleting.

```sh
arbors prune
arbors prune -n          # dry run
```

### `arbors prune --merged [-n] [-f]`

Remove worktrees whose branches have been merged via PR. Requires the `gh` CLI.

```sh
arbors prune --merged
arbors prune --merged -n   # dry run
arbors prune --merged -f   # force remove even with uncommitted changes
```

### `arbors config`

Manage configuration values.

```sh
arbors config                            # show all config
arbors config worktreeDir                # get a single value
arbors config language ko                # set project-level value
arbors config language ko --global       # set global value
arbors config --unset language           # remove a value
```

### `arbors excluded`

Show the current exclude patterns used when copying gitignored files.

### `arbors doctor`

Run environment diagnostics (git version, runtime, shell integration, etc.).

### `arbors completion bash|zsh`

Output shell completion script.

```sh
# zsh
arbors completion zsh > ~/.zsh/completions/_arbors

# bash
arbors completion bash >> ~/.bashrc
```

## Configuration

### Config Files

- **Global:** `~/.arbors/config.json`
- **Project:** `.arbors/config.json` (takes precedence over global)

```json
{
  "runtime": "node",
  "language": "en",
  "packageManager": "auto",
  "worktreeDir": "~/arbors/{repo}",
  "excludeFromCopy": [
    "node_modules",
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    ".turbo",
    ".cache",
    "coverage",
    "*.log"
  ],
  "hooks": {
    "postCreate": "npm run setup"
  }
}
```

| Key               | Values                                | Default                         |
| ----------------- | ------------------------------------- | ------------------------------- |
| `runtime`         | `"node"`, `"bun"`                     | `"node"`                        |
| `language`        | `"en"`, `"ko"`, `"ja"`                | `"en"`                          |
| `packageManager`  | `"auto"`, `"pnpm"`, `"yarn"`, `"npm"` | `"auto"`                        |
| `worktreeDir`     | string (`{repo}` placeholder)         | `"~/arbors/{repo}"`             |
| `excludeFromCopy` | `string[]`                            | `["node_modules", "dist", ...]` |
| `hooks`           | `object`                              | `{}`                            |

### Environment Variables

Environment variables take the highest precedence, overriding both project and global config.

| Variable                 | Overrides        |
| ------------------------ | ---------------- |
| `ARBORS_RUNTIME`         | `runtime`        |
| `ARBORS_LANGUAGE`        | `language`       |
| `ARBORS_WORKTREE_DIR`    | `worktreeDir`    |
| `ARBORS_PACKAGE_MANAGER` | `packageManager` |

### .arborsinclude

A per-repo allowlist for files to copy into new worktrees. Place `.arborsinclude` in the repository root.

- One pattern per line
- `#` comments
- Gitignore-style globs
- Include patterns override `excludeFromCopy` blocklist

```
# Copy environment templates
.env.local
.env.development

# Copy IDE settings
.vscode/settings.json
```

## Hooks

Hooks run at specific points in the worktree lifecycle.

| Hook         | When                      | Failure behavior             |
| ------------ | ------------------------- | ---------------------------- |
| `postCreate` | After worktree creation   | Logged, does not block       |
| `preRemove`  | Before worktree removal   | Blocks removal (unless `-f`) |
| `postRemove` | After worktree removal    | Logged, does not block       |
| `postSwitch` | After switching worktrees | Logged, does not block       |

### Config-based hooks

Define hooks inline in `config.json`:

```json
{
  "hooks": {
    "postCreate": "npm run setup",
    "preRemove": "npm run cleanup"
  }
}
```

### File-based hooks

Place executable scripts in `.arbors/hooks/`:

```
.arbors/hooks/postCreate.sh
.arbors/hooks/preRemove.js
.arbors/hooks/postSwitch.ts
```

### Hook environment variables

The following environment variables are available inside hooks:

| Variable               | Description                         |
| ---------------------- | ----------------------------------- |
| `ARBORS_REPO_ROOT`     | Path to the main repository         |
| `ARBORS_WORKTREE_PATH` | Path to the worktree being acted on |
| `ARBORS_BRANCH`        | Branch name                         |

Use `--no-hooks` to skip all hooks.

## Shell Integration

Shell integration is **required** for `arbors switch` and auto `cd` after `arbors add`. Without it, these commands will print the worktree path but won't change directory.

```sh
# ~/.zshrc
source /path/to/arbors/shell/arbors-wrapper.zsh

# ~/.bashrc
source /path/to/arbors/shell/arbors-wrapper.sh
```

The wrapper captures arbors's `__ARBORS_CD__` output and runs `cd` in the parent shell.

## Flags Reference

| Flag             | Short | Description                       |
| ---------------- | ----- | --------------------------------- |
| `--create`       | `-c`  | Create a new branch               |
| `--force-create` | `-C`  | Force create (reset if exists)    |
| `--force`        | `-f`  | Force operation                   |
| `--dry-run`      | `-n`  | Preview without executing         |
| `--quiet`        | `-q`  | Suppress output                   |
| `--porcelain`    |       | Machine-readable output           |
| `--merged`       |       | Target merged PR branches (prune) |
| `--global`       |       | Apply to global config            |
| `--unset`        |       | Remove a config value             |
| `--no-copy`      |       | Skip copying gitignored files     |
| `--no-install`   |       | Skip dependency installation      |
| `--no-hooks`     |       | Skip hook execution               |

## Interactive TUI

Running `arbors` with no arguments in a TTY opens an interactive interface powered by Ink (React). Features:

- Fuzzy search across all worktrees (powered by Fuse.js)
- Keyboard navigation to switch between worktrees
- Visual status indicators

## Programmatic API

arbors exports a programmatic API for use in other tools:

```ts
import { createWorktree } from "arbors";
```

## Technical Details

- TypeScript, ESM only
- CoW (copy-on-write) file copying on APFS, Btrfs, and XFS
- i18n: English, Korean, Japanese
- Ink (React TUI), tsup bundler, vitest tests

## License

MIT
