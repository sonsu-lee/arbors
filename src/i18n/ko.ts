import type { Messages } from "./en";

export const ko: Messages = {
  selectProject: "프로젝트를 선택하세요:",
  noProjects: "등록된 프로젝트가 없습니다. git 저장소에서 arbors를 먼저 실행하세요.",
  recentProjects: "최근 프로젝트",

  selectWorktree: "워크트리를 선택하세요:",
  noWorktrees: "워크트리가 없습니다.",
  createNew: "새 워크트리 생성",

  creating: "워크트리 생성 중...",
  removing: "워크트리 삭제 중...",
  copying: "무시된 파일 복사 중...",
  installing: "의존성 설치 중...",

  created: "워크트리 생성 완료",
  removed: "워크트리 삭제 완료",
  copied: "무시된 파일 복사 완료",
  installed: "의존성 설치 완료",
  resultsFound: (count: number) => `${count}개 결과`,

  notGitRepo: "git 저장소가 아닙니다.",
  worktreeExists: "워크트리가 이미 존재합니다.",
  worktreeNotFound: "워크트리를 찾을 수 없습니다.",
  uncommittedChanges: "커밋되지 않은 변경사항이 있습니다. 커밋하거나 스태시하세요.",
  cannotDeleteMain: "메인 워크트리는 삭제할 수 없습니다.",
  cannotRemoveCurrent: "현재 위치한 워크트리는 삭제할 수 없습니다.",
  forceRemoving: "커밋되지 않은 변경사항을 무시하고 워크트리를 강제 삭제합니다...",
  removeSummary: (removed, failed) => `결과: ${removed}개 삭제, ${failed}개 실패`,
  invalidName: "올바르지 않은 워크트리 이름입니다.",
  switching: "워크트리 이동 중...",
  switched: "워크트리로 이동 완료",

  helpFooter: "Tab: 자동완성 | Enter: 선택 | Esc: 취소",
  helpWorktree: "Ctrl+B: 새 브랜치 | Ctrl+X: 삭제 | Esc: 뒤로",

  configSaved: "설정이 저장되었습니다.",
  configCurrent: "현재 설정:",

  version: "arbors v0.1.0",
  usage: "사용법: arbors [명령어] [옵션]",
  commands: "명령어:",
  options: "옵션:",
} as const;
