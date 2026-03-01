#!/usr/bin/env bash
# Shell wrapper for arbors — captures __ARBORS_CD__ output and runs cd
# Source this file in .bashrc: source /path/to/arbors-wrapper.sh

arbors() {
  local output
  output=$(command arbors "$@" 2>&1)
  local exit_code=$?

  local cd_path
  cd_path=$(echo "$output" | grep '^__ARBORS_CD__:' | head -1 | cut -d: -f2-)

  # Print non-protocol lines
  echo "$output" | grep -v '^__ARBORS_CD__:'

  if [ -n "$cd_path" ] && [ -d "$cd_path" ]; then
    cd "$cd_path" || return 1
  fi

  return $exit_code
}
