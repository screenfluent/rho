# Rho TODOs

## Vault Extension (P0) -- `docs/design/vault.md`

### Phase 1: Foundation
- [ ] `vault.ts` extension skeleton (register extension, load on startup)
- [ ] File layout: create `~/.pi/vault/` with `concepts/`, `projects/`, `patterns/`, `references/`, `log/` dirs
- [ ] Create `_index.md` (root MOC) and `_inbox.md` (capture buffer) templates
- [ ] Frontmatter parser: extract `type`, `created`, `updated`, `tags`, `source` from YAML
- [ ] Wikilink extractor: regex for `[[slug]]` and `[[slug|display]]`
- [ ] In-memory `VaultGraph`: scan all `.md` files, build `VaultNote` map, compute backlinks
- [ ] Graph rebuild on mutation (after write)
- [ ] `vault` tool registration with action dispatch
- [ ] `capture` action: append timestamped entry to `_inbox.md`
- [ ] `read` action: read note by slug, return content + computed backlinks
- [ ] `write` action: create/update note, validate format, place in correct directory by type
- [ ] `status` action: note counts by type, orphan count, inbox size, graph density
- [ ] `list` action: list notes with optional type/query filter
- [ ] Verbatim trap guard on `write`: require frontmatter, connections section, >= 1 wikilink (except logs)
- [ ] `/vault` slash command: show status dashboard

### Phase 2: Graph Ops (P1) -- Icebox
- [ ] `search` action: full-text + graph-adjacent matching
- [ ] `traverse` action: BFS with depth/budget, collect context bundle
- [ ] `process` action: inbox -> vault note promotion (connection gate)
- [ ] `before_agent_start` context loading (project match, inbox alert, 4K budget)
- [ ] Status widget in footer

### Phase 3: Automation (P2) -- Icebox
- [ ] Auto-capture on `agent_end`
- [ ] Heartbeat maintenance task (process inbox, orphans, MOC rebuild, delta log, stale audit)
- [ ] Daily delta log generation in `log/YYYY-MM-DD.md`
- [ ] MOC auto-rebuild from subtrees
- [ ] Orphan detection and flagging

### Phase 4: Migration & Polish (P3) -- Icebox
- [ ] Brain -> vault migration script (one-time, opt-in)
- [ ] `~/notes/` convergence
- [ ] `/vault graph` visualization
- [ ] Vault health scoring

---

## /tasks command
Add a `/tasks` slash command and `tasks` tool for storing tasks for later. Think lightweight task queue:
- `tasks add "description"` — store a task
- `tasks list` — show pending tasks
- `tasks done <id>` — mark complete
- `/tasks` — show current tasks inline
- Persist to `~/.rho/brain/tasks.jsonl` or similar
- Tasks should be surfaced during heartbeat check-ins (RHO.md quick scan)
- Consider priority levels and due dates
