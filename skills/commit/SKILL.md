---
name: commit
description: Use when creating git commits. Guides conventional commit message format for this project. Trigger on "commit", "git commit", "write commit message".
---

# Commit Rules

Conventional Commits. English only. Subject line is sufficient for most changes.

## Format

type: concise summary

Optional body (only when subject alone can't explain):
- bullet points with -
- one line per point

## Types

| Type     | When                          | Release impact |
|----------|-------------------------------|----------------|
| feat     | New feature                   | minor bump     |
| fix      | Bug fix                       | patch bump     |
| docs     | Documentation only            | no release     |
| chore    | Maintenance, deps, config     | no release     |
| test     | Adding/updating tests         | no release     |
| refactor | Code change, no behavior diff | no release     |
| ci       | CI/CD changes                 | no release     |

## Breaking Changes

Add BREAKING CHANGE in commit body or ! after type -> triggers major bump.

feat!: remove --plain flag from list command

## Examples

feat: add fuzzy search to switch command
fix: prevent branch name with consecutive dots
test: add config merge edge cases
refactor: extract branch validation to safety module
docs: update shell integration instructions

## Rules

- No Co-Authored-By lines
- Subject: imperative mood, lowercase, no period
- Body: only when subject is insufficient
- One logical change per commit
