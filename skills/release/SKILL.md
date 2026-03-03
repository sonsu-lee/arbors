---
name: release
description: Use when preparing a release, checking release status, or asking about versioning. Trigger on "release", "version bump", "publish", "npm publish", "release-please".
---

# Release Process

Automated via release-please v4 + GitHub Actions. No manual version bumping.

## How It Works

1. Push conventional commits to main
2. release-please creates/updates a "Release PR" with changelog + version bump
3. Merge the Release PR -> GitHub Release created -> npm publish triggered

## Version Bump Rules

| Commit type      | Version bump | Example        |
|------------------|-------------|----------------|
| fix:             | patch       | 0.1.1 -> 0.1.2 |
| feat:            | minor       | 0.1.1 -> 0.2.0 |
| BREAKING CHANGE  | major       | 0.1.1 -> 1.0.0 |
| docs/chore/test  | no release  | --             |

## What NOT to Do

- Don't manually edit package.json version
- Don't create git tags manually
- Don't run npm publish locally
- Don't merge Release PR without reviewing changelog

## Checking Release Status

- Open PRs with "release-please" label = pending release
- GitHub Actions "Release" workflow = publish status
