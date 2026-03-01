# copse

[한국어](./README.ko.md) | [English](./README.md)

git worktreeを簡単に扱うためのCLIツール。

ブランチごとに別ディレクトリを作成し、**stash/switchなしで**複数ブランチを同時に作業できる。worktree作成時にexcludeファイルのコピーと依存関係のインストールを自動で行う。

## Install

```sh
git clone git@github.com:sungsulee/copse.git
cd copse
pnpm install && pnpm build
npm link
```

Shell integration（worktree切り替え後の自動`cd`）：

```sh
# ~/.zshrc
source /path/to/copse/shell/copse-wrapper.zsh

# ~/.bashrc
source /path/to/copse/shell/copse-wrapper.sh
```

## Workflows

### 新機能開発

```sh
# mainを基準に新しいブランチ + worktreeを作成
copse new feature/login --base main

# 自動で以下を実行:
#   1. git fetch origin main
#   2. ~/copse/{repo}/feature-login にworktreeを作成
#   3. .git/info/excludeに記載されたファイルをコピー（.envなど）
#   4. pnpm install（lockfileから自動検出）

cd ~/copse/my-project/feature-login
# 作業開始
```

作業が終わったら：

```sh
copse remove feature/login
# コミットされていない変更がある場合は削除を拒否する
```

### 同僚のPRコードレビュー

リモートブランチをローカルworktreeとしてチェックアウト：

```sh
# originから自動でfetch + worktree作成
copse add feature/payment

# ローカルに既にあるブランチならworktreeのみ作成
# → ローカル優先、なければoriginから取得
```

レビューが終わったら：

```sh
copse remove feature/payment
```

### 複数ブランチの同時作業

```sh
copse new feature/auth --base main
copse new fix/header-bug --base main

copse list
# feature/auth    ~/copse/my-project/feature-auth
# fix/header-bug  ~/copse/my-project/fix-header-bug

# 各ディレクトリで独立して作業。stash不要。
```

## Commands

```
copse new <branch> [--base <branch>]   新しいブランチ + worktree作成
copse add <branch>                     既存ブランチをチェックアウト（ローカル → リモート自動）
copse remove <branch>                  worktree削除（安全チェック付き）
copse list [--plain]                   管理中のworktree一覧
copse excluded                         excludeパターン確認
copse config                           現在の設定確認
```

## Configuration

`~/.copse/config.json`（グローバル）または `.copse/config.json`（プロジェクト別、優先）：

```json
{
  "runtime": "node",
  "language": "ja",
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
