# arbors

[English](./README.md) | [日本語](./README.ja.md)

git worktree를 편하게 쓰기 위한 CLI 도구.

브랜치마다 별도의 디렉토리를 만들어서, **stash/switch 없이** 여러 브랜치를 동시에 작업할 수 있다. worktree 생성 시 gitignore 파일 복사, 의존성 설치까지 자동으로 처리한다.

## 설치

```sh
npm install -g arbors
```

또는 소스에서 빌드:

```sh
git clone git@github.com:sonsu-lee/arbors.git
cd arbors
pnpm install && pnpm build
npm link
```

### 쉘 통합

`arbors switch`와 `arbors add` 후 자동 `cd`에 **필수**:

```sh
# ~/.zshrc
source /path/to/arbors/shell/arbors-wrapper.zsh

# ~/.bashrc
source /path/to/arbors/shell/arbors-wrapper.sh
```

wrapper가 arbors의 `__ARBORS_CD__` 출력을 파싱해서 부모 shell에서 `cd`를 실행한다. 없으면 `switch`와 `add`가 경로만 출력하고 디렉토리 이동은 하지 않는다.

### 쉘 자동완성

```sh
# ~/.zshrc
source <(arbors completion zsh)

# ~/.bashrc
source <(arbors completion bash)
```

## 사용법

### 인터랙티브 모드

인자 없이 TTY에서 실행하면 퍼지 검색 TUI가 뜬다:

```sh
arbors
```

기존 워크트리를 검색하고 선택해서 바로 이동할 수 있다.

### 새 기능 개발

```sh
# main 기준으로 새 브랜치 + worktree 생성
arbors add -c feature/login main

# 자동으로 다음을 수행:
#   1. git fetch origin main
#   2. ~/arbors/{repo}/feature-login 에 worktree 생성
#   3. .gitignore에 매칭되는 파일들 복사 (.env 등)
#   4. pnpm install (lockfile 기준 자동 감지)

cd ~/arbors/my-project/feature-login
# 작업 시작
```

작업이 끝나면:

```sh
arbors remove feature/login
# 커밋되지 않은 변경사항이 있으면 삭제를 거부한다
```

### 동료의 PR 코드리뷰

원격 브랜치를 로컬 worktree로 바로 체크아웃:

```sh
# origin에 있는 브랜치를 자동으로 fetch + worktree 생성
arbors add feature/payment

# 이미 로컬에 있는 브랜치라면 그대로 worktree만 생성
# → 로컬 우선, 없으면 origin에서 가져옴
```

리뷰가 끝나면:

```sh
arbors remove feature/payment
```

### 동시에 여러 브랜치 작업

```sh
arbors add -c feature/auth main
arbors add -c fix/header-bug main

arbors list
# feature/auth    ~/arbors/my-project/feature-auth
# fix/header-bug  ~/arbors/my-project/fix-header-bug

# 각 디렉토리에서 독립적으로 작업. stash 불필요.
```

### 워크트리에서 명령 실행

디렉토리를 이동하지 않고 특정 워크트리에서 명령을 실행:

```sh
arbors run feature/login -- pnpm test
arbors run fix/header-bug -- git status
```

### 병합된 PR 정리

GitHub CLI(`gh`)가 설치되어 있으면 병합된 PR의 워크트리를 한번에 정리:

```sh
arbors prune --merged        # 병합된 PR 워크트리 제거
arbors prune --merged -n     # dry-run: 삭제 대상만 확인
arbors prune --merged -f     # 강제 제거 (변경사항 무시)
```

## 명령어

### 워크트리 관리

```
arbors                                  인터랙티브 TUI (퍼지 검색)
arbors add <branch>                     기존 브랜치 체크아웃 (로컬 → 리모트 자동)
arbors add -c <branch> [<start-point>]  새 브랜치 + worktree 생성
arbors add -C <branch> [<start-point>]  강제 생성 (브랜치 존재 시 리셋)
arbors switch <branch>                  기존 worktree로 이동
arbors remove <branch...> [-f]          worktree 삭제 (여러 개 동시 가능)
arbors list [--porcelain]               관리 중인 worktree 목록
arbors run <branch> -- <command...>     특정 worktree에서 명령 실행
arbors status [--porcelain]             현재 worktree 정보
arbors prune [-n]                       stale 레지스트리 정리
arbors prune --merged [-n] [-f]         병합된 PR worktree 제거 (gh 필요)
```

`remove`는 `-r`로도 사용 가능.

### 설정

```
arbors config                           전체 설정 출력
arbors config <key>                     값 조회
arbors config <key> <value> [--global]  값 설정
arbors config --unset <key>             값 삭제
```

### 유틸리티

```
arbors excluded                         제외 패턴 출력
arbors doctor                           환경 진단 (git, node, 패키지 매니저 등)
arbors completion bash|zsh              쉘 자동완성 스크립트 출력
```

### 플래그

| 플래그            | 설명                                       |
| ----------------- | ------------------------------------------ |
| `-c`              | 새 브랜치 생성                             |
| `-C`              | 새 브랜치 강제 생성 (존재 시 리셋)         |
| `-f`, `--force`   | 강제 실행 (안전 검사 건너뜀)               |
| `-n`, `--dry-run` | 실제 실행 없이 결과 미리보기               |
| `-q`, `--quiet`   | 출력 최소화                                |
| `--porcelain`     | 스크립트 파싱용 출력 형식                  |
| `--merged`        | 병합된 PR 워크트리 대상 (`prune`에서 사용) |
| `--global`        | 전역 설정에 저장 (`config`에서 사용)       |
| `--unset`         | 설정값 삭제 (`config`에서 사용)            |
| `--no-copy`       | gitignore 파일 복사 건너뜀                 |
| `--no-install`    | 의존성 설치 건너뜀                         |
| `--no-hooks`      | 훅 실행 건너뜀                             |

## 설정

`~/.arbors/config.json` (전역) 또는 `.arbors/config.json` (프로젝트별, 우선 적용):

```json
{
  "runtime": "node",
  "language": "ko",
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

| 키                | 값                                                      | 기본값                          |
| ----------------- | ------------------------------------------------------- | ------------------------------- |
| `runtime`         | `"node"`, `"bun"`                                       | `"node"`                        |
| `language`        | `"en"`, `"ko"`, `"ja"`                                  | `"en"`                          |
| `packageManager`  | `"auto"`, `"pnpm"`, `"yarn"`, `"npm"`                   | `"auto"`                        |
| `excludeFromCopy` | `string[]`                                              | `["node_modules", "dist", ...]` |
| `worktreeDir`     | string (`{repo}` 플레이스홀더 사용 가능)                | `"~/arbors/{repo}"`             |
| `hooks`           | `{ postCreate?, preRemove?, postRemove?, postSwitch? }` | `undefined`                     |

### 환경변수

설정 파일 대신 환경변수로도 지정할 수 있다:

| 환경변수                 | 대응 설정        |
| ------------------------ | ---------------- |
| `ARBORS_RUNTIME`         | `runtime`        |
| `ARBORS_LANGUAGE`        | `language`       |
| `ARBORS_WORKTREE_DIR`    | `worktreeDir`    |
| `ARBORS_PACKAGE_MANAGER` | `packageManager` |

## 훅

워크트리 생명주기에 맞춰 커스텀 스크립트를 실행할 수 있다.

### 훅 종류

| 훅           | 시점             |
| ------------ | ---------------- |
| `postCreate` | 워크트리 생성 후 |
| `preRemove`  | 워크트리 삭제 전 |
| `postRemove` | 워크트리 삭제 후 |
| `postSwitch` | 워크트리 전환 후 |

### 설정 방법

**config에 직접 지정:**

```json
{
  "hooks": {
    "postCreate": "pnpm run setup",
    "preRemove": "pnpm run cleanup"
  }
}
```

**`.arbors/hooks/` 디렉토리에 스크립트 파일로:**

```
.arbors/hooks/postCreate
.arbors/hooks/preRemove
.arbors/hooks/postRemove
.arbors/hooks/postSwitch
```

### 훅에서 사용 가능한 환경변수

| 환경변수               | 설명                  |
| ---------------------- | --------------------- |
| `ARBORS_REPO_ROOT`     | 메인 저장소 루트 경로 |
| `ARBORS_WORKTREE_PATH` | 대상 워크트리 경로    |
| `ARBORS_BRANCH`        | 대상 브랜치 이름      |

## .arborsinclude

레포 루트에 `.arborsinclude` 파일을 만들면 `excludeFromCopy`에 포함된 패턴이라도 해당 파일을 강제로 복사한다.

```
# .arborsinclude
# excludeFromCopy보다 우선 적용
.env.example
dist/config.json
```

`excludeFromCopy`가 `dist`를 제외하더라도, `.arborsinclude`에 `dist/config.json`이 있으면 해당 파일은 복사된다.

## 프로그래매틱 API

CLI 외에 Node.js에서 직접 import해서 사용할 수 있다:

```ts
import { createWorktree } from "arbors";
```

## 기술 정보

- TypeScript, ESM only
- Node >= 20, Bun 지원
- Ink (React TUI) 기반 인터랙티브 모드
- APFS/Btrfs에서 CoW(Copy-on-Write) 파일 복사
- i18n: 영어, 한국어, 일본어

## 개발

```sh
pnpm test       # vitest
pnpm lint       # oxlint
pnpm format     # oxfmt
pnpm build      # tsup
pnpm typecheck  # tsc --noEmit
```

## 라이선스

MIT
