# copse

A git worktree manager. Fuzzy-search your projects, create and switch worktrees, auto-copy excluded files and install dependencies.

## Features

- Interactive TUI with fuzzy search for project and worktree selection
- CLI mode for scripting and automation
- Automatic `.git/info/exclude` file copying to new worktrees
- Project registry with recent history tracking
- Package manager auto-detection (pnpm, yarn, npm)
- Runtime manager detection (mise, nvm)
- Configurable Bun/Node runtime
- Shell integration for automatic `cd` into worktrees
- i18n support (English, Korean, Japanese)
- Refuses to delete worktrees with uncommitted changes or the main worktree

## Install

```sh
git clone git@github.com:<your-username>/copse.git
cd copse
pnpm install
pnpm build
```

### Global access

Option A: npm link

```sh
npm link
```

Option B: shell alias (no link needed)

```sh
# ~/.zshrc or ~/.bashrc
alias copse="node ~/path/to/copse/dist/copse.js"
```

### Update

```sh
git pull
pnpm install
pnpm build
```

## Usage

### CLI

```sh
# Create a new branch worktree (from main)
copse new feature/login --base main

# Checkout an existing branch (auto-detects local or remote)
copse add feature/login

# List worktrees
copse list

# Remove a worktree (with safety checks)
copse remove feature/login

# Show exclude patterns
copse excluded

# Show current config
copse config
```

### Interactive TUI

Run `copse` with no arguments to launch the TUI. Type to filter, arrow keys to navigate, Enter to select.

### Shell Integration

Add to your shell config for automatic `cd` after worktree selection:

```sh
# bash (~/.bashrc)
source /path/to/copse/shell/copse-wrapper.sh

# zsh (~/.zshrc)
source /path/to/copse/shell/copse-wrapper.zsh
```

## Configuration

Global config: `~/.copse/config.json`
Project override: `.copse/config.json`

```json
{
  "runtime": "node",
  "language": "en",
  "packageManager": "auto",
  "copyExcludes": true,
  "worktreeDir": "~/copse/{repo}"
}
```

| Key              | Values                                | Default             | Description                    |
| ---------------- | ------------------------------------- | ------------------- | ------------------------------ |
| `runtime`        | `"node"`, `"bun"`                     | `"node"`            | Runtime for shell commands     |
| `language`       | `"en"`, `"ko"`, `"ja"`                | `"en"`              | UI language                    |
| `packageManager` | `"auto"`, `"pnpm"`, `"yarn"`, `"npm"` | `"auto"`            | Package manager for `install`  |
| `copyExcludes`   | `true`, `false`                       | `true`              | Copy `.git/info/exclude` files |
| `worktreeDir`    | string                                | `"~/copse/{repo}"`  | Worktree parent directory      |

Project-level config overrides global settings.

## Development

```sh
pnpm test      # Run tests
pnpm lint      # Lint with oxlint
pnpm format    # Format with oxfmt
pnpm build     # Build with tsup
```

## License

MIT
