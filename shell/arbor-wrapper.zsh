#!/usr/bin/env zsh
# Shell wrapper for arbor — captures __ARBOR_CD__ output and runs cd
# Source this file in .zshrc: source /path/to/arbor-wrapper.zsh

arbor() {
  local output
  output=$(command arbor "$@" 2>&1)
  local exit_code=$?

  local cd_path
  cd_path=$(echo "$output" | grep '^__ARBOR_CD__:' | head -1 | cut -d: -f2-)

  # Print non-protocol lines
  echo "$output" | grep -v '^__ARBOR_CD__:'

  if [[ -n "$cd_path" ]] && [[ -d "$cd_path" ]]; then
    cd "$cd_path" || return 1
  fi

  return $exit_code
}
