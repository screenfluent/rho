# Vault Extension -- Phase 1 Implementation

## What

Implement `vault.ts`, a new pi extension that adds a markdown-with-wikilinks knowledge graph to Rho. Phase 1 only (foundation). The full design doc is at `~/notes/projects/rho/design/vault.md` -- read it before starting.

## Working Directory

`~/projects/rho` -- the vault.ts extension goes in `extensions/vault.ts`.

## Reference Implementation

Study `extensions/brain.ts` carefully. It is the closest existing extension and demonstrates:
- Extension skeleton (imports, `export default function(pi)`)
- Tool registration with `pi.registerTool()` + `Type.Object` params + `StringEnum` for actions
- Slash command registration with `pi.registerCommand()`
- File I/O patterns (ensureDir, readJsonl, appendJsonl)
- Status widget via `ctx.ui.setStatus()`
- Event hooks (`pi.on("session_start", ...)`, `pi.on("before_agent_start", ...)`)

Follow the same patterns. Use the same imports from `@mariozechner/pi-coding-agent`, `@mariozechner/pi-ai`, and `@sinclair/typebox`.

## Vault Location

`~/.pi/vault/` (NOT `~/.rho/vault/`). This keeps it in pi's namespace since the vault tool is registered as a pi tool.

## Phase 1 Checklist

- [ ] `vault.ts` extension skeleton (export default function, imports)
- [ ] File layout: ensure `~/.pi/vault/` with `concepts/`, `projects/`, `patterns/`, `references/`, `log/` dirs on load
- [ ] Create `_index.md` (root MOC) and `_inbox.md` (empty capture buffer) if they don't exist
- [ ] Frontmatter parser: extract YAML between `---` fences -> `type`, `created`, `updated`, `tags`, `source`
- [ ] Wikilink extractor: regex for `[[slug]]` and `[[slug|display text]]`
- [ ] `VaultNote` interface + `VaultGraph` type (`Map<string, VaultNote>`)
- [ ] Graph builder: scan `~/.pi/vault/**/*.md`, parse each, build adjacency map with backlinks
- [ ] Graph rebuild after mutations (call after write)
- [ ] Register `vault` tool with actions: `capture`, `read`, `write`, `status`, `list`
- [ ] `capture` action: append timestamped entry to `_inbox.md` with source/context header
- [ ] `read` action: read note by slug, return full content + list of computed backlinks
- [ ] `write` action: create/update note by slug, validate format, place in correct dir by `type` param
- [ ] `status` action: total notes by type, orphan count, inbox item count, avg links per note
- [ ] `list` action: list notes with optional `type` and `query` filters, return slug/title/type/links/updated
- [ ] Verbatim trap guard on `write`: reject if missing frontmatter, missing `## Connections` section, or <1 wikilink (except type=log)
- [ ] `/vault` slash command showing status dashboard

## Key Design Decisions

1. **Note format**: YAML frontmatter (`type`, `created`, `updated`, `tags`, `source`) + `# Title` + `## Connections` (with wikilinks) + `## Body`. Connections section required on all types except `log`.

2. **Slug resolution**: kebab-case filenames. `[[slug]]` resolves to exact filename match (case-insensitive, `.md` stripped). Scan all vault `.md` files.

3. **Inbox format** (`_inbox.md`): Entries separated by `---`, each with timestamp header, source, context, and content block.

4. **Verbatim trap guard**: The quality gate. Notes without connections get rejected. This is backpressure -- we don't tell the agent what to write, we reject notes that don't connect to anything.

5. **Graph is in-memory**: Rebuilt on load and after each write. Just a `Map<string, VaultNote>`. No persistence of the graph itself.

## NOT in Scope (Phase 2+)

Do NOT implement these -- they come later:
- `search` action (Phase 2)
- `traverse` action (Phase 2)
- `process` action (Phase 2)
- `before_agent_start` context loading (Phase 2)
- Auto-capture on `agent_end` (Phase 3)
- Heartbeat integration (Phase 3)
- Brain migration (Phase 4)

## Testing

Write tests. Look at existing test patterns in the repo if any exist. At minimum:
- Frontmatter parsing (valid, missing fields, no frontmatter)
- Wikilink extraction (single, multiple, with display text, nested brackets)
- Graph building (links, backlinks, orphan detection)
- Verbatim trap guard (reject missing connections, allow logs without connections)
- Capture action (appends to inbox correctly)
- Write action (creates file in correct directory, updates `updated` field)

## Constraints

- Do NOT modify existing extensions (brain.ts, rho.ts, etc.)
- Do NOT push to git
- TypeScript, same style as brain.ts
- No external dependencies beyond what brain.ts already uses
- Keep it simple. This is ~300-500 lines of TypeScript.
