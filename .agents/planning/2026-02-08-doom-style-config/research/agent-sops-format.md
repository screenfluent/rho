# Agent SOPs Format — For Onboarding SKILL.md

## Format Summary

Agent SOPs are structured markdown (`.sop.md`) with:
- **Title** (`# Title`)
- **Overview** (`## Overview`) — one paragraph
- **Parameters** (`## Parameters`) — bullet list with `(required)` / `(optional, default: "value")`
- **Steps** (`## Steps`) — numbered `### N. Step Name` with `**Constraints:**` blocks
- **Examples** (`## Examples`) — optional but recommended
- **Troubleshooting** (`## Troubleshooting`) — optional

As a pi skill, it lives in a directory with YAML frontmatter:
```
skills/rho-onboard/SKILL.md
```

```markdown
---
name: rho-onboard
description: Install and configure Rho from scratch. Only prereq: a coding agent.
---
```

## RFC 2119 Keywords

| Keyword | Meaning |
|---|---|
| MUST | Absolute requirement |
| MUST NOT | Absolute prohibition (needs `because` clause) |
| SHOULD | Strong recommendation |
| SHOULD NOT | Discouraged (needs `because` clause) |
| MAY | Truly optional |

Every negative constraint needs a `because` clause.

## Onboarding Skill Sketch

### Parameters
- **platform** (optional): Auto-detected (android/macos/linux)
- **agent_name** (optional): Name for the agent identity
- **mode** (optional, default: "interactive"): interactive or auto

### Steps Outline
1. **Detect Environment** — OS, shell, existing tools (node, git, tmux, pi)
2. **Install Dependencies** — Platform-specific: pkg (Android), brew (macOS), apt (Linux)
3. **Install Pi** — `npm install -g @mariozechner/pi-coding-agent` if not present
4. **Install Rho** — `npm install -g @rhobot-dev/rho`
5. **Interview for Config** — Adaptive questions about use case, modules, agent identity
6. **Generate Config** — Write `~/.rho/init.toml` and `~/.rho/packages.toml`
7. **Run Sync** — `rho sync` to wire everything up
8. **Verify** — `rho doctor` to validate the setup
9. **Optional Tmux Walkthrough** — "First time using tmux? Would you like me to walk you through basic usage?"

### Key Design Notes
- Agent-agnostic: any coding agent that reads markdown + runs bash
- Adaptive interview: ask about use case first, suggest modules based on answer
- Must handle partial installs gracefully (some deps already present)
- Must work on Android/Termux, macOS, Linux
- The interview step is where the skill is smarter than `rho init` — it can ask contextual questions, explain trade-offs, suggest configurations
