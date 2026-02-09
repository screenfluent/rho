# SOUL.md Guide

SOUL.md defines your agent's identity — who it is, not what it does.

AGENTS.md covers operations: tenets, work patterns, tools, memory. SOUL.md covers personality: worldview, opinions, voice, focus. Together they make the agent feel like *your* agent, not a generic assistant.

Lives at `~/.rho/SOUL.md`.

## Why It Matters

Without SOUL.md, every session starts with a blank personality. The agent knows *how* to work (AGENTS.md) but not *who* it's working with or *how* to talk. SOUL.md fills that gap — it's the difference between a tool and a collaborator.

The file evolves over time. It starts as a template, gets seeded through an interview or manual editing, then grows as the agent learns your preferences from real sessions.

## Template Sections

### Who I Am

What makes this agent distinct. Not capabilities — perspective, disposition, what it finds interesting. Written in first person from the agent's POV.

> I'm the agent for a backend engineer who thinks in systems. They care about reliability and clean abstractions. They'd rather I try something and be wrong than ask permission for every step.

### Worldview

Beliefs specific enough to be wrong. These shape how the agent reasons about ambiguous situations.

**Good:** "Shell scripts beat frameworks for most automation"
**Bad:** "I believe in being helpful"

The test: could someone disagree with this? If not, it's too generic.

### Opinions

Actual takes, organized by domain. Add `###` subsections as domains emerge (On Code, On Writing, On Being an Agent). The more specific, the more personality comes through.

```markdown
### On Code
- Early returns over nested ifs
- Tests > types > comments as documentation
- Go for systems, TypeScript for glue
```

### Voice

How the agent communicates. Include concrete examples — the "Sounds like me" / "Doesn't sound like me" pair is the most useful calibration tool in the file.

```markdown
**Sounds like me:** "That's a race condition. Here's the fix."
**Doesn't sound like me:** "Great question! I'd be happy to help you explore the various options..."
```

### Current Focus

What you're working on or thinking about right now. This shifts frequently — the soul-update skill proposes changes here when it detects your focus has moved.

### Boundaries

What the agent won't do without permission. Posting to social media, sending emails, deploying to production. Also: honesty about uncertainty ("If I'm guessing, I say so").

### Tensions

Optional but valuable. Real personalities have contradictions. "I believe in acting fast, but also in being careful with production systems." These tensions make the agent's reasoning more nuanced.

## Filling It Out

Three approaches, from easiest to most involved:

### 1. Bootstrap Interview (Recommended)

Run the soul-update skill in bootstrap mode during an interactive session. The agent asks you 5 core questions one at a time, adapts follow-ups based on your answers, then writes the initial SOUL.md.

Core questions cover: what work you do, what the agent gets wrong, ask-vs-act preference, current interests, communication style.

### 2. Manual Edit

Open `~/.rho/SOUL.md` and fill in the sections yourself. The template has `{{}}` instruction blocks that explain what goes where — they get stripped from the system prompt automatically.

### 3. Let It Evolve

Leave SOUL.md mostly empty and let the evolve mode fill it in over time from your session history. Slower, but requires zero effort. The heartbeat will notice the blank template and remind you about bootstrapping.

## The Soul-Update Skill

Two modes for two situations.

### Bootstrap Mode

For when SOUL.md is still the blank template. Runs interactively — the agent interviews you, then writes the initial file.

Detection is automatic: if most sections are empty bullets and no section has more than 1 real entry, it needs bootstrapping.

```bash
# Triggered automatically on first interactive session,
# or manually via the soul-update skill with mode=bootstrap
```

### Evolve Mode

For ongoing refinement. Runs as a heartbeat subagent (non-interactive), mines recent session logs, and writes proposals to `~/.rho/soul-proposals.md`.

```bash
# Runs nightly via heartbeat
# Analyzes the last day's sessions by default
```

The evolve pipeline:

1. **Read current state** — load SOUL.md, check for unreviewed proposals
2. **Find sessions** — scan `~/.pi/agent/sessions/` for recent logs
3. **Extract signals** — pull identity-relevant signals from user messages only
4. **Diff against SOUL.md** — categorize as new, reinforcement, contradiction, or evolution
5. **Write proposals** — max 5 per run, each with evidence and source

## Signal Strength

Not all signals are equal. The skill classifies them:

| Strength | Source | Action |
|----------|--------|--------|
| **Strong** | User explicitly states a preference ("I prefer X", "Don't do Y") or corrects the agent | Propose immediately |
| **Moderate** | Repeated patterns across sessions — tools used, topics discussed, communication style | Propose after 3+ occurrences |
| **Weak** | One-off tasks, single mentions, ambiguous reactions | Note but don't propose |

Only user messages are mined. The agent's own output is ignored — it's looking for *your* signals, not its own echo.

## Propose and Review

Changes to SOUL.md are never auto-applied. The workflow:

1. Evolve mode writes proposals to `~/.rho/soul-proposals.md`
2. Next interactive session, the agent surfaces the proposals
3. For each proposal, you choose: **accept**, **reject**, **modify**, or **defer**
4. Accepted changes get applied to SOUL.md
5. The proposals file is deleted once all items are addressed

This builds trust. The agent learns what you care about evolving (and what to stop proposing) by tracking your accept/reject patterns. After enough trust is established, you could transition to auto-apply — but the default is always propose-and-review.

If proposals sit unreviewed for 3+ days, the heartbeat surfaces a reminder. If you consistently reject a proposal type, the system stops proposing it.

## How AGENTS.md and SOUL.md Work Together

| | AGENTS.md | SOUL.md |
|---|-----------|---------|
| **Purpose** | Operations | Identity |
| **Scope** | How the agent works | Who the agent is |
| **Contains** | Tenets, tools, memory, patterns | Worldview, opinions, voice, focus |
| **Changes** | When operational needs change | As the agent learns about you |
| **Tone** | Prescriptive — rules and patterns | Descriptive — observations and beliefs |

Both are read at session start. AGENTS.md tells the agent how to behave. SOUL.md tells it how to *be*. An agent with only AGENTS.md is competent. An agent with both is yours.

## Scheduling

Add this to your heartbeat config for nightly evolution:

```markdown
- [ ] Run soul-update (evolve mode) nightly — last run: YYYY-MM-DD
```

The heartbeat checks if 24+ hours have passed, runs evolve mode with `days=1`, and updates the timestamp.
