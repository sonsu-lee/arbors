# arbors

[한국어](./README.ko.md) | [English](./README.md)

git worktreeを簡単に扱うためのCLIツール。

ブランチごとに別ディレクトリを作成し、**stash/switchなしで**複数ブランチを同時に作業できる。worktree作成時にexcludeファイルのコピーと依存関係のインストールを自動で行う。

## Install

```sh
git clone git@github.com:sungsulee/arbors.git
cd arbors
pnpm install && pnpm build
npm link
```

Shell integration（`arbors switch`および`arbors add`後の自動`cd`に**必須**）：

```sh
# ~/.zshrc
source /path/to/arbors/shell/arbors-wrapper.zsh

# ~/.bashrc
source /path/to/arbors/shell/arbors-wrapper.sh
```

wrapperがarborsの`__ARBORS_CD__`出力をパースし、親シェルで`cd`を実行する。なければ`switch`と`add`はパスを表示するだけでディレクトリ移動しない。

## Workflows

### 新機能開発

```sh
# mainを基準に新しいブランチ + worktreeを作成
arbors add -c feature/login --base main

# 自動で以下を実行:
#   1. git fetch origin main
#   2. ~/arbors/{repo}/feature-login にworktreeを作成
#   3. .git/info/excludeに記載されたファイルをコピー（.envなど）
#   4. pnpm install（lockfileから自動検出）

cd ~/arbors/my-project/feature-login
# 作業開始
```

作業が終わったら：

```sh
arbors remove feature/login
# コミットされていない変更がある場合は削除を拒否する
```

### 同僚のPRコードレビュー

リモートブランチをローカルworktreeとしてチェックアウト：

```sh
# originから自動でfetch + worktree作成
arbors add feature/payment

# ローカルに既にあるブランチならworktreeのみ作成
# → ローカル優先、なければoriginから取得
```

レビューが終わったら：

```sh
arbors remove feature/payment
```

### 複数ブランチの同時作業

```sh
arbors add -c feature/auth --base main
arbors add -c fix/header-bug --base main

arbors list
# feature/auth    ~/arbors/my-project/feature-auth
# fix/header-bug  ~/arbors/my-project/fix-header-bug

# 各ディレクトリで独立して作業。stash不要。
```

## Commands

```
arbors add <branch>                     既存ブランチをチェックアウト（ローカル → リモート自動）
arbors add -c <branch> [--base <branch>]  新しいブランチ + worktree作成
arbors switch <branch>                  既存worktreeに移動
arbors remove <branch>                  worktree削除（安全チェック付き）
arbors list [--plain]                   管理中のworktree一覧
arbors excluded                         excludeパターン確認
arbors config                           現在の設定確認
```

## Configuration

`~/.arbors/config.json`（グローバル）または `.arbors/config.json`（プロジェクト別、優先）：

```json
{
  "runtime": "node",
  "language": "ja",
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
