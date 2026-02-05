# Vault Extension -- Phase 1 Planner Notes

## Context

- **Design doc:** `~/notes/projects/rho/design/vault.md` (read in full)
- **Reference impl:** `extensions/brain.ts` (~38KB, full extension with tool, command, events)
- **Target:** `extensions/vault.ts` (~300-500 LOC)
- **Vault location:** `~/.pi/vault/` (NOT `~/.rho/vault/` -- objective overrides design doc)
- **Test runner:** `npx tsx` available (node v24.13, tsx v4.21.0)
- **Existing tests:** Shell scripts with assert pattern in `tests/`

## Key Patterns from brain.ts

- Imports: `ExtensionAPI`, `ExtensionContext` from pi-coding-agent; `StringEnum` from pi-ai; `Type` from typebox
- Tool registration: `pi.registerTool({ name, label, description, parameters, async execute() })`
- Slash command: `pi.registerCommand("name", { description, handler })`
- File helpers: `ensureDir()`, `readJsonl()`, `appendJsonl()`, `writeJsonl()` -- vault needs equivalents for markdown
- Status widget: `ctx.ui.setStatus(id, text)`
- Events: `pi.on("session_start", ...)`, `pi.on("before_agent_start", ...)`

## Architecture Decisions

1. **Vault at `~/.pi/vault/`** per objective (design doc says `~/.rho/vault/` but objective overrides)
2. **In-memory graph** rebuilt on load + after each write mutation
3. **Frontmatter** parsed manually (YAML between `---` fences) -- no external YAML parser needed for simple key-value
4. **Wikilinks** extracted via regex `\[\[([^\]|]+)(?:\|[^\]]+)?\]\]`
5. **Verbatim trap guard** rejects writes missing frontmatter, connections section, or wikilinks (except log type)
6. **Tests** as a standalone TypeScript file run via `npx tsx` -- tests pure functions (parser, extractor, graph, guard)

## Task Breakdown

Three tasks, ordered by dependency:

### Task 1: Core types, parsers, graph builder, and test harness
- VaultNote interface + VaultGraph type
- parseFrontmatter() -- extract YAML fields
- extractWikilinks() -- regex extraction
- buildGraph() -- scan dir, parse all .md, compute backlinks
- ensureVaultDirs() -- create directory structure
- Test file: `tests/test-vault.ts` with tests for all pure functions

### Task 2: Extension skeleton + tool actions (capture, read, write with verbatim guard)
- export default function(pi) skeleton
- Ensure dirs on load
- Create _index.md and _inbox.md if missing
- Register vault tool with 5 actions
- capture: append to _inbox.md
- read: read note + backlinks from graph
- write: create/update note, validate with verbatim guard, place in correct dir
- Graph rebuild after write
- Add tests for capture, write, guard

### Task 3: Status/list actions + /vault slash command
- status: note counts by type, orphan count, inbox items, avg links
- list: filter by type and query
- /vault slash command with status dashboard
- Final integration verification

## Task 1 Complete (2026-02-05)

Implemented `extensions/vault-core.ts` with all pure functions separated from the extension
for testability. Created `tests/test-vault.ts` with 54 passing tests covering:
- parseFrontmatter (5 cases: valid, minimal, missing, single tag, empty tags)
- extractWikilinks (7 cases: single, multiple, display text, none, mixed, dedup, adjacent)
- buildGraph (16 assertions: 4 notes, links, backlinks, orphan detection, title extraction)
- ensureVaultDirs (7 assertions: root + 5 subdirs + idempotency)
- validateNote (11 assertions: valid, no frontmatter, no connections, no wikilinks, log exemption, patterns, references)

Key decision: split vault-core.ts from vault.ts so tests avoid pi-coding-agent import issues.

## Task 2 Complete (2026-02-05)

Implemented extension skeleton (`extensions/vault.ts`, 237 LOC) + new I/O functions in vault-core.ts.

New functions added to vault-core.ts:
- `typeToDir(type)` -- maps note type to subdirectory (concept->concepts, log->log, moc->"")
- `createDefaultFiles(vaultDir)` -- idempotent _index.md and _inbox.md creation
- `captureToInbox(vaultDir, text, source?, context?)` -- timestamped append to _inbox.md
- `readNote(vaultDir, slug, graph)` -- content + backlinks, with disk fallback
- `writeNote(vaultDir, slug, content, type)` -- validate + write to correct subdir
- `findNoteFile(vaultDir, slug)` -- scan all dirs for a slug (internal helper)

vault.ts extension shell:
- Bootstrap: ensureVaultDirs + createDefaultFiles on load, buildGraph immediately
- session_start: rebuild graph + update widget
- Status widget: "📓 N notes (M orphans)"
- Tool registration with 5 actions (capture/read/write implemented, status/list stubbed for Task 3)
- Graph rebuild after every write mutation

Tests expanded from 54 to 97 passing assertions:
- typeToDir (7): all types including moc and unknown
- createDefaultFiles (6): creation, content, idempotency
- captureToInbox (9): basic, with source/context, append-not-overwrite
- writeNote (15): valid concept, log, rejected invalid, moc at root, update existing
- readNote (6): existing with backlinks, mutual links, missing note

## Task 3 Complete (2026-02-05)

Implemented status/list actions + /vault slash command. Phase 1 is now complete.

New functions added to vault-core.ts:
- `VaultStatus` and `NoteListEntry` interfaces
- `countInboxItems(vaultDir)` -- counts --- separators in _inbox.md (internal)
- `getVaultStatus(vaultDir, graph)` -- totalNotes, byType, orphanCount, inboxItems, avgLinksPerNote
- `listNotes(graph, type?, query?)` -- filter by type and/or case-insensitive title/slug query

vault.ts changes:
- `status` action: formatted multi-line stats output
- `list` action: filtered note listing with type/query, shows slug/title/type/links/backlinks/updated
- `/vault` slash command: compact one-line status via ctx.ui.notify()
- Tool description updated to mention all 5 actions

Tests expanded from 97 to 126 passing assertions:
- getVaultStatus (14): type counts, orphans, inbox items, avg links, empty vault
- listNotes (15): all notes, filter by type, filter by query, combined filter, no results, case-insensitive

Final file sizes: vault.ts 316 LOC, vault-core.ts 539 LOC = 855 total (within 300-500 LOC target for vault.ts alone, split into two files for testability).

## Phase 1 Complete -- Final Verification (2026-02-05)

All 3 tasks done, 126 tests passing, no modifications to existing extensions (brain.ts/rho.ts diffs are pre-existing migration work, not from vault).

Phase 1 checklist verified:
- Extension skeleton with imports, export default
- ~/.pi/vault/ with concepts/, projects/, patterns/, references/, log/ dirs
- _index.md and _inbox.md created if missing
- parseFrontmatter() -- YAML between --- fences
- extractWikilinks() -- regex for [[slug]] and [[slug|display]]
- VaultNote interface + VaultGraph type (Map)
- buildGraph() -- scan, parse, adjacency + backlinks
- Graph rebuild after mutations
- vault tool with 5 actions: capture, read, write, status, list
- capture: timestamped append to _inbox.md
- read: content + backlinks, disk fallback
- write: validate, correct dir by type, update frontmatter
- status: counts by type, orphans, inbox items, avg links
- list: filter by type and/or query, case-insensitive
- Verbatim trap guard (reject missing frontmatter/connections/wikilinks, log exempt)
- /vault slash command with status

Handing off to Validator.

## Validation Complete (2026-02-05)

Ran exhaustive validation as Validator hat:
- 126/126 tests pass (ran myself, not trusted from builder)
- Manual E2E with 10 scenarios in isolated temp vault: all pass
- No existing extensions modified (brain.ts/rho.ts diffs confirmed pre-existing migration)
- YAGNI: clean, no Phase 2+ features, no speculative code
- KISS: Map graph, regex, native fs -- simplest possible
- Idiomatic: follows brain.ts patterns exactly
- No new dependencies
- All 16 Phase 1 checklist items verified

Verdict: PASS. Emitting validation.passed.

## Commit Complete (2026-02-05)

Committed as `ec0c49b` on main:
```
feat(vault): add Phase 1 vault extension -- markdown knowledge graph
```

Staged only vault files (vault-core.ts, vault.ts, test-vault.ts). Pre-existing
brain.ts/rho.ts migration diffs and other changes intentionally left unstaged --
those are separate work items.

Not pushed (per user preference: do not push unless explicitly asked).

## LOOP_COMPLETE (2026-02-05)

Received commit.complete event. Verified:
- Commit ec0c49b on main with all 3 vault files (vault-core.ts, vault.ts, test-vault.ts)
- 126/126 tests pass
- No open tasks remain
- All 16 Phase 1 checklist items satisfied
- Not pushed (per user preference)

Objective fully complete. Emitting LOOP_COMPLETE.
