# arbors

[English](./README.md) | [한국어](./README.ko.md)

git worktreeを簡単に扱うためのCLIツール。

ブランチごとに別ディレクトリを作成し、**stash/switchなしで**複数ブランチを同時に作業できる。worktree作成時にgitignoreファイルのコピーと依存関係のインストールを自動で行う。

## インストール

```sh
npm install -g arbors
```

ソースからビルドする場合：

```sh
git clone git@github.com:sonsu-lee/arbors.git
cd arbors
pnpm install && pnpm build
npm link
```

### シェル統合

`arbors switch`および`arbors add`後の自動`cd`に**必須**：

```sh
# ~/.zshrc
source /path/to/arbors/shell/arbors-wrapper.zsh

# ~/.bashrc
source /path/to/arbors/shell/arbors-wrapper.sh
```

wrapperがarborsの`__ARBORS_CD__`出力をパースし、親シェルで`cd`を実行する。なければ`switch`と`add`はパスを表示するだけでディレクトリ移動しない。

## ワークフロー

### 新機能開発

```sh
# mainを基準に新しいブランチ + worktreeを作成
arbors add -c feature/login main

# 自動で以下を実行:
#   1. git fetch origin main
#   2. ~/arbors/{repo}/feature-login にworktreeを作成
#   3. .gitignoreに一致するファイルをコピー（.envなど）
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
arbors add -c feature/auth main
arbors add -c fix/header-bug main

arbors list
# feature/auth    ~/arbors/my-project/feature-auth
# fix/header-bug  ~/arbors/my-project/fix-header-bug

# 各ディレクトリで独立して作業。stash不要。
```

### インタラクティブTUI

引数なしで実行するとファジー検索付きのTUIが起動する：

```sh
arbors
# ワークツリー一覧からインタラクティブに選択・切り替え
```

### ワークツリーでコマンド実行

```sh
arbors run feature/auth -- pnpm test
```

### マージ済みワークツリーの一括削除

```sh
# マージ済みPRのワークツリーを確認（dry-run）
arbors prune --merged -n

# 実際に削除
arbors prune --merged
```

`gh` CLIが必要。

## コマンド

### ワークツリー管理

```
arbors                                      インタラクティブTUI（ファジー検索）
arbors add <branch>                         既存ブランチをチェックアウト（ローカル → リモート自動）
arbors add -c <branch> [<start-point>]      新しいブランチ + worktree作成
arbors add -C <branch> [<start-point>]      強制作成（既存時リセット）
arbors switch <branch>                      既存worktreeに移動
arbors remove <branch...> [-f]              worktree削除（複数指定可、-r短縮形あり）
arbors list [--porcelain]                   管理中のworktree一覧
arbors run <branch> -- <command...>         指定worktreeでコマンド実行
arbors status [--porcelain]                 現在のworktree情報
arbors prune [-n]                           古いレジストリエントリの整理
arbors prune --merged [-n] [-f]             マージ済みPRのworktree削除（gh必要）
```

### 設定

```
arbors config                               全設定表示
arbors config <key>                         値の取得
arbors config <key> <value> [--global]      値の設定
arbors config --unset <key>                 値の削除
```

### ユーティリティ

```
arbors excluded                             除外パターン表示
arbors doctor                               環境診断
arbors completion bash|zsh                  シェル補完スクリプト出力
```

## フラグ

| フラグ            | 説明                                        |
| ----------------- | ------------------------------------------- |
| `-c`              | 新しいブランチを作成                        |
| `-C`              | 強制作成（既存ブランチをリセット）          |
| `-f`, `--force`   | 強制実行（未コミット変更の無視など）        |
| `-n`, `--dry-run` | 実際には実行せず、何が行われるかを表示      |
| `-q`, `--quiet`   | 出力を抑制                                  |
| `--porcelain`     | スクリプト向けの機械可読出力                |
| `--merged`        | `prune`でマージ済みワークツリーを対象にする |
| `--global`        | `config`でグローバル設定を操作              |
| `--unset`         | `config`で設定値を削除                      |
| `--no-copy`       | gitignoreファイルのコピーをスキップ         |
| `--no-install`    | 依存関係のインストールをスキップ            |
| `--no-hooks`      | フックの実行をスキップ                      |

## 設定

`~/.arbors/config.json`（グローバル）または`.arbors/config.json`（プロジェクト別、優先）：

```json
{
  "runtime": "node",
  "language": "ja",
  "packageManager": "auto",
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
  "worktreeDir": "~/arbors/{repo}",
  "hooks": {
    "postCreate": "echo 'worktree created'",
    "postSwitch": "echo 'switched'"
  }
}
```

| キー              | 値                                    | デフォルト                      |
| ----------------- | ------------------------------------- | ------------------------------- |
| `runtime`         | `"node"`, `"bun"`                     | `"node"`                        |
| `language`        | `"en"`, `"ko"`, `"ja"`                | `"en"`                          |
| `packageManager`  | `"auto"`, `"pnpm"`, `"yarn"`, `"npm"` | `"auto"`                        |
| `excludeFromCopy` | `string[]`                            | `["node_modules", "dist", ...]` |
| `worktreeDir`     | string（`{repo}`プレースホルダー）    | `"~/arbors/{repo}"`             |
| `hooks`           | object                                | `{}`                            |

### 環境変数

設定ファイルの代わりに環境変数でも指定できる：

| 環境変数                 | 対応する設定キー |
| ------------------------ | ---------------- |
| `ARBORS_RUNTIME`         | `runtime`        |
| `ARBORS_LANGUAGE`        | `language`       |
| `ARBORS_WORKTREE_DIR`    | `worktreeDir`    |
| `ARBORS_PACKAGE_MANAGER` | `packageManager` |

## フック

worktreeのライフサイクルイベントに応じてカスタムスクリプトを実行できる。

### 利用可能なフック

| フック       | タイミング         |
| ------------ | ------------------ |
| `postCreate` | worktree作成後     |
| `preRemove`  | worktree削除前     |
| `postRemove` | worktree削除後     |
| `postSwitch` | worktree切り替え後 |

### 設定方法

**設定ファイルで指定：**

```json
{
  "hooks": {
    "postCreate": "pnpm run setup",
    "postSwitch": "echo 'switched to $ARBORS_BRANCH'"
  }
}
```

**ディレクトリベース：**

`.arbors/hooks/`ディレクトリに実行可能なスクリプトを配置：

```
.arbors/hooks/postCreate
.arbors/hooks/preRemove
.arbors/hooks/postRemove
.arbors/hooks/postSwitch
```

### フック環境変数

フック実行時に以下の環境変数が設定される：

| 変数                   | 説明                   |
| ---------------------- | ---------------------- |
| `ARBORS_REPO_ROOT`     | リポジトリのルートパス |
| `ARBORS_WORKTREE_PATH` | 対象worktreeのパス     |
| `ARBORS_BRANCH`        | 対象ブランチ名         |

## .arborsinclude

リポジトリのルートに`.arborsinclude`ファイルを作成すると、worktree作成時にコピーするファイルを明示的に指定できる。`excludeFromCopy`より優先される。

```
# .arborsinclude
.env
.env.local
config/local.json
```

## プログラマティックAPI

CLIだけでなく、Node.jsモジュールとしてインポートして使用することもできる：

```ts
import { createWorktree } from "arbors";
```

## 技術仕様

- TypeScript, ESM only
- Node.js >= 20, Bun対応
- CoW（Copy-on-Write）ファイルコピー（APFS/Btrfs）
- i18n: 英語、韓国語、日本語

## 開発

```sh
pnpm test       # vitest
pnpm lint       # oxlint
pnpm format     # oxfmt
pnpm build      # tsup
pnpm typecheck  # tsc --noEmit
```

## ライセンス

MIT
