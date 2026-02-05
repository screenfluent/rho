# Rho Product Backlog

> Managed by heartbeat PM cycle. Updated by agent, reviewed by human.
> Engineering subagents pull work from **Ready** and report back here.

## In Progress

_(none)_

## Ready (Prioritized)
- [ ] **Vault: skeleton + note format + graph** — `vault.ts` extension, `~/.pi/vault/` directory scaffolding, frontmatter parsing, wikilink extraction (`[[slug]]` regex), in-memory `VaultGraph` with backlink computation. Design: `docs/design/vault.md`. **P0**
- [ ] **Vault: tool (capture, read, write, status, list)** — Register `vault` tool with 5 Phase 1 actions. `capture` appends to `_inbox.md`, `read`/`write` with frontmatter validation, `status` dashboard, `list` with type/query filters. Verbatim trap guard on `write` (require frontmatter, connections section, >= 1 wikilink for non-log notes). **P0**
- [ ] **Vault: /vault slash command** — `/vault` shows status dashboard, wired to `status` action. **P0**
- [ ] **/tasks command** — Lightweight task queue extension. See TODO.md for spec. **P2**
- [ ] **CI deploy** — Set up Cloudflare Pages CI from repo `site/` directory. Currently manual `wr pages deploy`. **P2**

## Icebox

- [ ] **Vault: search + traverse + process** — `search` action (full-text + graph-adjacent), `traverse` action (BFS with depth/budget params), `process` action (inbox -> vault note promotion with connection gate). **P1**
- [ ] **Vault: context loading + status widget** — `before_agent_start` hook injects project-relevant vault context (4K char budget). Footer widget showing note count + inbox size. **P1**
- [ ] **Vault: auto-capture + heartbeat maintenance** — Auto-capture insights on `agent_end` to inbox. Heartbeat task: process inbox, orphan check, MOC rebuild, daily delta log, stale audit. **P2**
- [ ] **Vault: migration + polish** — Brain -> vault migration script (one-time, opt-in). `~/notes/` convergence. `/vault graph` visualization. Vault health scoring. **P3**
- [ ] **Trusted Extension Registry** — Workers + R2 + D1. Publish/search/install extensions. Security scanning on publish (AST analysis). Author signing (Ed25519 + GitHub identity). Permission manifests. Public trust scores. The core product. See `~/notes/research/extension-ecosystem-exploration.md` + `~/notes/research/openclaw-ecosystem-intel.md`. **P2**
- [ ] **Extension Sync** — Push/pull extensions across devices. Free: manual. Pro: auto-sync on heartbeat. Concept: `~/notes/research/extension-sync-concept.md`. **P2**
- [ ] **Extension gallery** — Public browse page at runrho.dev/extensions. Depends on registry. **P3**
- [ ] **Brain sync** — Bundles into Pro tier. Not standalone. **P3**
- [ ] **Web dashboard** — View brain, heartbeat history. Depends on sync API. **P3**
- [ ] **Semantic memory search** — Vectorize integration for brain queries. **P3**
- [ ] **launchd/systemd service files** — Auto-start on macOS/Linux. Cross-platform v2. **P3**
- [ ] **Desktop UI automation** — AppleScript/xdotool extensions. Cross-platform v2. **P3**
- [ ] **Extension marketplace (paid)** — Premium extensions, revenue share. Needs user base (500+ stars). **P3**

## Done

- [x] **Landing site in repo + updates** — Moved rho-site into `site/`. Universal cross-platform bootstrap.sh. Added providers section, iPhone/SSH section, sharper cost comparison. Canonical install URL in README. **P1** — 2026-02-05
- [x] **Fix README diagram** — Issue #1. Verified resolved by cross-platform README rewrite (no diagram in old or new README). Close after push. **P1** — 2026-02-05
- [x] **Install redirect** — Universal bootstrap.sh at root. README uses `runrho.dev/install` canonical URL. Site `_redirects` already points to `main/bootstrap.sh`. **P1** — 2026-02-05
- [x] **iPhone/Termius support** — SSH-friendly tmux config, Termius setup guide, VPS guide (Oracle free tier, Hetzner, DO), install.sh auto-installs tmux config on linux/macos, README iPhone section. 28 tests. **P1** — 2026-02-05
- [x] **Smart heartbeat routing** — Heartbeat auto-resolves cheapest model across all providers. Cross-provider resolution, 5m cache, --thinking off, /rho model command, pinning support. BDD spec: 15 scenarios. **P1** — 2026-02-05
- [x] **`rho login` command** — `rho login` opens pi's OAuth flow, `--status` shows providers, `--logout` removes creds. 7 acceptance tests pass. **P0** — 2026-02-05
- [x] **Cross-platform refactor** — All 10 steps completed. macOS/Linux/Android platforms, OS-aware install.sh, config support, setup scripts, README rewrite. 13 local commits. Ralph loop: 17 iterations, 27m. **P0** — 2026-02-05
- [x] **MIT license** — Added LICENSE file to repo root. **P0** — 2026-02-04
- [x] **FUNDING.yml** — Added `.github/FUNDING.yml` with GitHub Sponsors link. **P0** — 2026-02-04

---

## Priority Key
- **P0**: Blocking other work or shipping
- **P1**: Important, do this week
- **P2**: Next up after P1s clear
- **P3**: Future / needs validation
