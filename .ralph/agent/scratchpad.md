# Cross-Platform Rho Implementation — Scratchpad

## Plan Overview

10 steps from specs/cross-platform/plan.md. Steps 1-2 are git mv operations, 3-5 create new skills, 6 is the critical install.sh rewrite, 7-8 are script updates, 9-10 are docs and verification.

## Task IDs

- Step 1: task-1770266933-6351 (ready)
- Step 2: task-1770266936-6723 (blocked by step 1)
- Step 3: task-1770266941-4ac7 (blocked by step 2)
- Step 4: task-1770266941-7a2e (blocked by step 2)
- Step 5: task-1770266941-9e3a (blocked by step 2)
- Step 6: task-1770266947-c69c (blocked by steps 3-5)
- Step 7: task-1770266947-ef25 (blocked by step 5)
- Step 8: task-1770266947-150b (blocked by steps 3-4)
- Step 9: task-1770266947-3a21 (after steps 6-8 logically)
- Step 10: task-1770266947-5b3c (final verification)

## Key Decisions

- Use `git mv` for all moves so git tracks renames
- Individual file symlinks (Option A from design) for extensions
- Generic skill names: drop termux- prefix, platform is implicit
- Config at ~/.config/rho/config, shell-sourceable
- BIN_DIR: $PREFIX/bin on Termux, ~/.local/bin elsewhere

## Current State

- Step 1 DONE: platforms/ structure created, all Android files git mv'd
  - Git shows all as renames (R), not delete+add
  - Core extensions/: brain, brave-search, memory-viewer, moltbook-viewer, rho, usage-bars
  - Core skills/: code-assist, pdd, rho-validate, update-pi
  - Android-specific: tasker.ts, tasker-xml, all termux-* skills, stt scripts, bootstrap.sh
  - Empty platforms/macos/skills/ and platforms/linux/skills/ created
  - Committed: f749896
- Step 2 is now unblocked: rename termux-* to generic names

## Step 2 Complete

- All 10 termux-* skills renamed to generic names via `git mv`
- All tracked as renames (50-98% similarity) in git
- Frontmatter name/description updated in each SKILL.md
- tasker-xml left unchanged (Android-only, no generic equivalent)
- No name conflicts with core skills/
- Committed: 7e46112
- Steps 3, 4, 5 are now unblocked

## Step 3 Complete

- Created 4 macOS platform skills: notification, clipboard, open-url, tts
- Format matches existing Android skills (YAML frontmatter with name/description)
- macOS commands: osascript (notification), pbcopy/pbpaste (clipboard), open (open-url), say (tts)
- No naming conflicts with core skills/
- Committed: 9e44f18
- Step 8 (platform setup.sh) still needs Step 4 (Linux skills) to unblock

## Step 4 Complete

- Created 4 Linux platform skills: notification, clipboard, open-url, tts
- Covers X11 + Wayland (clipboard), install for Debian/Ubuntu/Arch/Fedora
- Headless/SSH caveats noted for notification, clipboard, open-url
- No naming conflicts with core skills/
- Committed: 7dfa7b7
- Step 8 (platform setup.sh) now unblocked (needed Steps 3 + 4)

## Step 5 Complete

- Created Android open-url skill at platforms/android/skills/open-url/SKILL.md
- Covers termux-open-url, termux-open, am start, monkey
- Includes common app package table and intent examples
- Verified commands exist on device (monkey at /system/bin/monkey, not in $PATH)
- No naming conflicts with core skills/
- Committed: 627b5ea
- Steps 6 and 7 now unblocked (needed Steps 3, 4, 5 all done)

## Step 6 Complete

- Rewrote install.sh with full OS-aware cross-platform logic
- Functions: detect_platform, check_dependencies, cleanup_old, install_extensions, install_skills, install_scripts, write_config, bootstrap_templates, bootstrap_brain, run_platform_setup
- Key fix: cleanup_old handles both old-style directory symlinks AND new-style individual symlinks
- Tested on Termux: 7 extensions (6 core + tasker.ts), 16 skills (4 core + 12 Android)
- Idempotent: running twice produces identical results
- Config written to ~/.config/rho/config with RHO_DIR and RHO_PLATFORM
- Brain untouched, templates skipped when existing
- --force flag works for AGENTS.md overwrite
- Committed: f411329
- Steps 7, 8, 9, 10 are next (7 and 8 can proceed in parallel)

## Step 7 Complete

- Updated all 5 rho scripts: rho, rho-daemon, rho-status, rho-stop, rho-trigger
- Shebangs changed from `#!/data/data/com.termux/files/usr/bin/bash` to `#!/usr/bin/env bash`
- All scripts source `~/.config/rho/config` at top with fallback defaults
- All `termux-*` commands guarded behind `RHO_PLATFORM=android` checks
- Hardcoded Termux paths replaced with `$(command -v tmux)` lookups
- `rho-status` now shows Platform and RHO_DIR info
- All pass `bash -n` syntax check
- Tested rho-status: works with config (shows android), without config (shows unknown/defaults)
- Committed: 393c1fd
- Steps 8, 9, 10 remaining

## Step 8 Complete

- Created platforms/macos/setup.sh: checks osascript, pbcopy/pbpaste, open, say (all built-in)
- Created platforms/linux/setup.sh: checks notify-send, clipboard (X11/Wayland-aware), xdg-open, TTS
  - Detects display server (XDG_SESSION_TYPE, WAYLAND_DISPLAY, DISPLAY, fallback headless)
  - Distro-aware install hints via install_hint() function (apt/pacman/dnf)
  - Checks both xclip and xsel for X11, wl-copy/wl-paste for Wayland
  - Checks espeak, espeak-ng, and spd-say for TTS
- Fixed critical bug in cleanup_old(): rm -rf on glob with trailing / followed symlinks and deleted actual repo SKILL.md files. Now uses -L check + rm -f for symlinks.
- Tested: both scripts pass bash -n, install.sh idempotent (no repo damage on repeated runs)
- Committed: 2ebdb79
- Steps 9 and 10 remaining

## Step 9 Complete

- Rewrote README.md for cross-platform support
- Three install paths: macOS/Linux (git clone + install.sh), Android (bootstrap one-liner), Android step-by-step
- Platform capabilities table with checkmarks for all skills by OS
- Extensions table with platform annotations
- Updated project structure to show platforms/ layout
- Added configuration section for ~/.config/rho/config
- Added "Adding a New Platform" contributing guide
- Bootstrap URL updated to platforms/android/bootstrap.sh
- All doc links verified (demo.gif, demo.md exist)
- Committed: 91f8a40
- Step 10 (verification) remaining

## Step 10 Complete

- Ran full Termux migration test: install.sh, verify symlinks, extensions, skills, config, brain
- Found and fixed two bugs:
  1. install_skills() symlinked empty dirs (code-assist, pdd, rho-validate) that were never in the repo
     Fix: added SKILL.md existence check before symlinking
  2. cleanup_old() glob `*/` missed broken symlinks (stale from prior installs)
     Fix: use `find -type l -delete` to catch all symlinks including broken ones
- Removed orphan empty dirs (code-assist, pdd, rho-validate) from skills/ -- they were never repo content
- All 8 acceptance criteria pass:
  - AC1: install.sh works on Termux ✓
  - AC2: rho-daemon starts with config ✓
  - AC3: All 6 core extensions present ✓
  - AC4: Platform skills (notification, clipboard, open-url) available ✓
  - AC5: Migration clean (re-run install.sh, idempotent) ✓
  - AC6: Tasker + Android-only skills only on Android ✓
  - AC7: README updated for all platforms ✓
  - AC8: No test/CI regressions ✓
- Additional verifications: no hardcoded Termux paths in scripts, portable shebangs, all syntax checks pass, platform setup.sh scripts valid
- Committed: 90c3df6
- ALL 10 STEPS COMPLETE

## Final Summary

Cross-platform implementation fully complete. 11 commits (f749896 → 90c3df6):
- platforms/ directory with android/, macos/, linux/ each having skills and setup
- 6 core extensions + 1 android-specific (tasker.ts)
- 1 core skill (update-pi) + 12 android platform skills + 4 macos + 4 linux
- install.sh detects OS and installs correct platform files
- All 5 rho scripts use portable shebangs and source ~/.config/rho/config
- README rewritten for 3 platforms
- Verified on Termux, idempotent, no hardcoded paths
- Ready for push when requested

## Validation (Step 10 re-validation)

FIXED: Removed 3 nonexistent core skills (code-assist, pdd, rho-validate) from README skills table and project structure tree. Committed: 582901d. All skill counts now match reality: 1 core (update-pi), 12 Android platform, 4 macOS, 4 Linux.

ALL STEPS COMPLETE AND VALIDATED. Ready for push when requested.

## Validator Pass (Final)

Exhaustive validation completed. All checks pass:
- 9 scripts: bash -n syntax OK
- 21 SKILL.md files: valid YAML frontmatter
- install.sh: idempotent, no hardcoded paths, correct platform detection
- 7 extensions (6 core + tasker.ts), 13 skills (1 core + 12 android)
- Config file, script sourcing, brain integrity, zero broken symlinks
- YAGNI: no dead code. KISS: minimal solution.
- All 8 acceptance criteria from design.md pass.
- 12 conventional commits, clean git history.
VERDICT: PASS. Ready for commit/push.
