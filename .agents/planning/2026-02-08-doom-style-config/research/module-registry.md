# Module Registry — Current Extension/Skill Mapping

## Rho Package Extensions (~/projects/rho/extensions/)

| Module Name | Category | Path | Description |
|---|---|---|---|
| rho | core | extensions/rho/index.ts | Heartbeat, daemon, check-ins |
| memory-viewer | core | extensions/memory-viewer/index.ts | Memory browser/viewer |
| vault-search | knowledge | extensions/vault-search/index.ts | Vault full-text search |
| brave-search | tools | extensions/brave-search/index.ts | Web search via Brave API |
| x-search | tools | extensions/x-search/index.ts | X/Twitter search via xAI |
| email | tools | extensions/email/index.ts | Rho Cloud email |
| usage-bars | ui | extensions/usage-bars/index.ts | Token usage display |
| moltbook-viewer | ui | extensions/moltbook-viewer/index.ts | Moltbook viewer |

## Rho Package Skills (~/projects/rho/skills/)

| Module Name | Category | Path | Description |
|---|---|---|---|
| memory-clean | core | skills/memory-clean/SKILL.md | Memory consolidation |
| vault-clean | knowledge | skills/vault-clean/SKILL.md | Orphan note cleanup |
| session-search | tools | skills/session-search/SKILL.md | Search pi session logs |
| update-pi | tools | skills/update-pi/SKILL.md | Update pi agent |
| rho-cloud-email | tools | skills/rho-cloud-email/SKILL.md | Email management |
| rho-cloud-onboard | tools | skills/rho-cloud-onboard/SKILL.md | Email onboarding |

## Shared Library (not a module)

- `extensions/lib/` — Shared code, barrel export at `extensions/lib/mod.ts`
- Must NOT have an index.ts (pi would try to load it as an extension)

## Local-Only (not in rho repo, not managed by modules)

### Extensions (~/.pi/agent/extensions/)
- agent-sops.ts
- rho-dashboard.ts
- rho-footer.ts

### Skills (~/.pi/agent/skills/)
- create-sop, humanizer, kalshi-autotrader-llm-first, kalshi-autotrader-report
- rho-heartbeat-safe, rho-nightly-extraction, tmux-demo, x-twitter

These are user-local and not part of the module system. They load via pi's local directory discovery.

## Module Registry Design

The registry maps module names to their extension/skill paths for pi filtering:

```javascript
const MODULES = {
  // core (always on)
  "heartbeat": { extensions: ["extensions/rho"], skills: ["skills/memory-clean"] },
  "memory": { extensions: ["extensions/memory-viewer"], skills: [] },
  
  // knowledge
  "vault": { extensions: ["extensions/vault-search"], skills: ["skills/vault-clean"] },
  
  // tools
  "brave-search": { extensions: ["extensions/brave-search"], skills: [] },
  "x-search": { extensions: ["extensions/x-search"], skills: [] },
  "email": { extensions: ["extensions/email"], skills: ["skills/rho-cloud-email", "skills/rho-cloud-onboard"] },
  "session-search": { extensions: [], skills: ["skills/session-search"] },
  "update-pi": { extensions: [], skills: ["skills/update-pi"] },
  
  // ui
  "usage-bars": { extensions: ["extensions/usage-bars"], skills: [] },
  "moltbook": { extensions: ["extensions/moltbook-viewer"], skills: [] },
};
```

This registry is what `rho sync` uses to generate the pi package filter.
