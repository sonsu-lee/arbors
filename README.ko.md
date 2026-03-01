# copse

[English](./README.md) | [日本語](./README.ja.md)

git worktree를 편하게 쓰기 위한 CLI 도구.

브랜치마다 별도의 디렉토리를 만들어서, **stash/switch 없이** 여러 브랜치를 동시에 작업할 수 있다. worktree 생성 시 exclude 파일 복사, 의존성 설치까지 자동으로 처리한다.

## Install

```sh
git clone git@github.com:sungsulee/copse.git
cd copse
pnpm install && pnpm build
npm link
```

Shell integration (worktree 전환 후 자동 `cd`):

```sh
# ~/.zshrc
source /path/to/copse/shell/copse-wrapper.zsh

# ~/.bashrc
source /path/to/copse/shell/copse-wrapper.sh
```

## Workflows

### 새 기능 개발

```sh
# main 기준으로 새 브랜치 + worktree 생성
copse add -c feature/login --base main

# 자동으로 다음을 수행:
#   1. git fetch origin main
#   2. ~/copse/{repo}/feature-login 에 worktree 생성
#   3. .git/info/exclude에 있는 파일들 복사 (.env 등)
#   4. pnpm install (lockfile 기준 자동 감지)

cd ~/copse/my-project/feature-login
# 작업 시작
```

작업이 끝나면:

```sh
copse remove feature/login
# 커밋되지 않은 변경사항이 있으면 삭제를 거부한다
```

### 동료의 PR 코드리뷰

원격 브랜치를 로컬 worktree로 바로 체크아웃:

```sh
# origin에 있는 브랜치를 자동으로 fetch + worktree 생성
copse add feature/payment

# 이미 로컬에 있는 브랜치라면 그대로 worktree만 생성
# → 로컬 우선, 없으면 origin에서 가져옴
```

리뷰가 끝나면:

```sh
copse remove feature/payment
```

### 동시에 여러 브랜치 작업

```sh
copse add -c feature/auth --base main
copse add -c fix/header-bug --base main

copse list
# feature/auth    ~/copse/my-project/feature-auth
# fix/header-bug  ~/copse/my-project/fix-header-bug

# 각 디렉토리에서 독립적으로 작업. stash 불필요.
```

## Commands

```
copse add <branch>                     기존 브랜치 체크아웃 (로컬 → 원격 자동)
copse add -c <branch> [--base <branch>]  새 브랜치 + worktree 생성
copse remove <branch>                  worktree 삭제 (안전 검사 포함)
copse list [--plain]                   관리 중인 worktree 목록
copse excluded                         exclude 패턴 확인
copse config                           현재 설정 확인
```

## Configuration

`~/.copse/config.json` (글로벌) 또는 `.copse/config.json` (프로젝트별 우선):

```json
{
  "runtime": "node",
  "language": "ko",
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
