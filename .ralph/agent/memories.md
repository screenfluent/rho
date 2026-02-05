# Memories

## Patterns

## Decisions

## Fixes

### mem-1770268126-f6db
> install_skills() must check for SKILL.md existence before symlinking -- empty dirs in skills/ get symlinked as broken skills otherwise. cleanup_old() must use find -type l to delete symlinks, not glob */ which skips broken symlinks.
<!-- tags: install, symlinks, skills | created: 2026-02-05 -->

### mem-1770267798-fa35
> cleanup_old() in install.sh must use -L check and rm -f for symlinks, not rm -rf with trailing slash. The glob */  causes rm -rf to follow symlinks and delete actual repo files.
<!-- tags: install, symlinks, bug | created: 2026-02-05 -->

## Context
