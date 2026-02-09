# Brain

The brain is Rho's persistent memory system. It lives at `~/.rho/brain/` and carries context across sessions so the agent doesn't start from zero every time.

When a session starts, Rho reads the brain files and injects them into the system prompt. The agent sees your identity, behavioral guidelines, past learnings, and preferences — all without you repeating yourself.

## File Structure

```
~/.rho/brain/
├── core.jsonl              # Identity and behavior (rarely changes)
├── memory.jsonl            # Learnings and preferences (grows over time)
├── context.jsonl           # Project-specific context (keyed by path)
├── archive.jsonl           # Decayed/removed entries (kept for safety)
└── memory/
    └── YYYY-MM-DD.md       # Daily memory log (human-readable)
```

All `.jsonl` files are newline-delimited JSON — one entry per line.

### core.jsonl

Behavior directives and identity. These are the "personality" layer:

```json
{"id":"b-1","type":"behavior","category":"do","text":"Be direct — skip filler, get to the point","created":"2024-01-01"}
{"id":"b-6","type":"behavior","category":"dont","text":"Use performative phrases like 'Great question!'","created":"2024-01-01"}
{"id":"b-9","type":"behavior","category":"value","text":"Clarity over diplomacy","created":"2024-01-01"}
```

Behavior categories: `do`, `dont`, `value`. You generally set these once and leave them.

### memory.jsonl

The working memory — learnings and preferences accumulated over time:

```json
{"id":"a1b2c3d4","type":"learning","text":"This repo uses pnpm not npm","used":3,"last_used":"2026-02-09","created":"2026-01-15"}
{"id":"e5f6g7h8","type":"preference","category":"Code","text":"User prefers early returns over nested ifs","created":"2026-01-20"}
```

This file grows as the agent discovers things. It's the main target for the memory-clean skill.

### context.jsonl

Project-specific context, matched by working directory path:

```json
{"id":"ctx-1","type":"context","project":"rho","path":"/home/user/projects/rho","content":"TypeScript monorepo. Use pnpm. Extensions in extensions/.","created":"2026-01-01"}
```

When your cwd is inside a matching path, the project context is included in the prompt.

### archive.jsonl

Entries that were removed or decayed. Nothing is permanently deleted — removed and decayed entries land here with a reason and timestamp. Safety net for accidental deletions.

### memory/YYYY-MM-DD.md

Human-readable daily log. Every time a learning or preference is stored, it's also appended here as a markdown bullet. Useful for reviewing what the agent learned on a given day:

```markdown
# Memory 2026-02-09

- **Learning:** This repo uses pnpm not npm
- **Preference (Code):** User prefers early returns over nested ifs
```

## Memory Types

### Learnings

Facts, patterns, and conventions the agent discovers. These have usage tracking:

- **text**: The actual learning (concise, actionable)
- **used**: How many times it's been reinforced
- **last_used**: Date of last reinforcement
- **source**: How it was stored (`auto` for auto-extraction, omitted for manual)

Learnings are subject to decay — unused ones get archived after 90 days.

### Preferences

Explicit user choices, organized by category. Categories: `Communication`, `Code`, `Tools`, `Workflow`, `General`.

Preferences **don't decay**. They represent deliberate user intent and stick around until manually removed.

## Auto-Memory Extraction

Rho automatically extracts memories from conversations. At the end of each session (or during context compaction), a small model analyzes the conversation and pulls out durable learnings and preferences.

How it works:

1. The conversation is serialized and sent to a cheap model (smallest available from the same provider)
2. The model extracts up to 3 new items per pass, each under 120 characters
3. Duplicates are detected and skipped (exact match after normalization)
4. Existing memories are sent as context so the model avoids restating known facts
5. Stored items appear as a notification: `Auto-memory (2): "repo uses pnpm" | "prefers early returns"`

### Configuration

- **Enabled by default.** Disable with `RHO_AUTO_MEMORY=0` or set `autoMemory: false` in `~/.rho/config.json`
- **Disabled for subagents** (`RHO_SUBAGENT=1`) to avoid noisy extraction from automated runs
- **Debug mode**: `RHO_AUTO_MEMORY_DEBUG=1` for verbose logging
- **Daily logs**: `RHO_DAILY_MEMORY=0` to disable the markdown daily log

## Memory Decay

Learnings that go unused get archived automatically:

- After **90 days** without being reinforced, a learning is moved to `archive.jsonl`
- Learnings with **3+ uses** are exempt from decay regardless of age
- **Preferences never decay** — they're explicit user choices

Trigger decay manually with the `memory` tool's `decay` action, or let the heartbeat handle it.

## The `/brain` Command

Quick stats and search from the command line:

```
/brain              # Show stats: learning count, preference count, core entries
/brain stats        # Same as above
/brain search pnpm  # Search memories for "pnpm"
```

There's also `/memories` (from the memory-viewer extension) which opens a scrollable overlay of all brain contents — behaviors, preferences, learnings, and daily logs.

## The `memory` Tool

The agent uses this tool programmatically during conversations:

| Action | Description |
|--------|-------------|
| `add_learning` | Store a new learning (requires `content`) |
| `add_preference` | Store a preference (requires `content`, optional `category`) |
| `reinforce` | Bump usage count on a learning (requires `id`) |
| `remove` | Archive and remove an entry (requires `id`) |
| `search` | Find memories matching a query (requires `query`) |
| `list` | Show all learnings and preferences |
| `decay` | Archive stale entries (90 days unused, <3 uses) |

### Search and Relevance

Search requires all query words to appear in the entry text. Results are ranked by:

1. **Word boundary matches** score higher than substring matches
2. **Usage count** boosts frequently-reinforced learnings (capped at +3)
3. Results are sorted by combined score, most relevant first

## Memory Maintenance

The **memory-clean** skill consolidates memory when it grows large or noisy. Use it when:

- Memory has grown past ~200 entries
- You notice duplicates or stale entries
- Context window is getting crowded with low-value memories

What it does:

1. **Backs up** the current file (always, before touching anything)
2. **Deduplicates** near-identical entries
3. **Merges** related entries into tighter single entries
4. **Drops** stale, superseded, or overly-specific entries
5. **Relocates** reference-quality knowledge to the vault as connected notes
6. **Reports** before/after counts, what changed, and file size reduction

Run it by asking the agent to clean up memory, or reference the skill directly.

## Tips: Good vs Bad Memories

**Good learnings** — specific, actionable, useful across sessions:
- "This repo uses pnpm not npm"
- "API uses snake_case for all endpoints"
- "User's timezone is US/Eastern"
- "The deploy script requires AWS_PROFILE=prod"

**Bad learnings** — vague, transient, or obvious:
- "User asked about deployment" (session-specific)
- "Fixed a bug in the API" (one-off)
- "TypeScript is a typed language" (obvious)
- "Session went well" (not actionable)

**Good preferences** — clear choices that affect future behavior:
- "User prefers early returns over nested ifs"
- "Always use fish shell syntax, not bash"
- "Keep commit messages under 50 chars"

**Bad preferences** — too vague to be useful:
- "User likes clean code" (who doesn't?)
- "Be helpful" (already the default)

The rule of thumb: if a future session with no context would benefit from knowing this, store it. If it only matters right now, don't.
