import type { Messages } from "./en.js";

export const ja: Messages = {
  selectProject: "プロジェクトを選択してください:",
  noProjects: "登録されたプロジェクトがありません。gitリポジトリでarborsを先に実行してください。",
  recentProjects: "最近のプロジェクト",

  selectWorktree: "ワークツリーを選択してください:",
  noWorktrees: "ワークツリーがありません。",
  createNew: "新しいワークツリーを作成",

  creating: "ワークツリーを作成中...",
  removing: "ワークツリーを削除中...",
  copying: "無視ファイルをコピー中...",
  installing: "依存関係をインストール中...",

  created: "ワークツリーを作成しました",
  removed: "ワークツリーを削除しました",
  copied: "無視ファイルをコピーしました",
  installed: "依存関係をインストールしました",
  resultsFound: (count: number) => `${count}件の結果`,

  notGitRepo: "gitリポジトリではありません。",
  worktreeExists: "ワークツリーはすでに存在します。",
  worktreeNotFound: "ワークツリーが見つかりません。",
  uncommittedChanges: "コミットされていない変更があります。コミットまたはスタッシュしてください。",
  cannotDeleteMain: "メインワークツリーは削除できません。",
  cannotRemoveCurrent: "現在いるワークツリーは削除できません。",
  forceRemoving: "コミットされていない変更を無視してワークツリーを強制削除します...",
  invalidName: "無効なワークツリー名です。",
  switching: "ワークツリーに移動中...",
  switched: "ワークツリーに移動しました",

  helpFooter: "Tab: 補完 | Enter: 選択 | Esc: キャンセル",
  helpWorktree: "Ctrl+B: 新ブランチ | Ctrl+X: 削除 | Esc: 戻る",

  configSaved: "設定を保存しました。",
  configCurrent: "現在の設定:",

  version: "arbors v0.1.0",
  usage: "使い方: arbors [コマンド] [オプション]",
  commands: "コマンド:",
  options: "オプション:",
} as const;
