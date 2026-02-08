# Detailed Design: Doom-Style Installation & Configuration for Rho

## Overview

Refactor Rho's installation and configuration experience to follow a Doom Emacs-inspired model: a declarative TOML config file (`init.toml`) as the single source of truth for what Rho does, a CLI (`rho`) that reconciles reality with config, and an agent-driven onboarding SKILL.md as the primary install path. The goal is a cohesive, self-documenting system where one file tells you everything about your Rho setup, one command makes it real, and one diagnostic command tells you if anything is wrong.

---

## Detailed Requirements

### Config System
- All config lives in `~/.rho/` alongside existing data (brain, vault, state)
- Two TOML config files:
  - `init.toml` — Module enable/disable + per-module settings. The "what is Rho doing" file.
  - `packages.toml` — Third-party pi packages beyond Rho's bundled modules.
- Config format is TOML (clean, minimal, supports comments, human-editable)
- Module settings are centralized in init.toml under `[settings.<module>]` sections
- Personal customization stays in existing markdown files (SOUL.md, AGENTS.md, HEARTBEAT.md)

### Module System
- Modules organized into categories: core, knowledge, tools, ui, skills
- Core modules (heartbeat, memory) are always on, not toggleable
- All other modules are toggleable per-category
- Each module maps to one or more extensions and/or skills in the Rho package
- A module registry (shipped with Rho) maps module names to file paths

### CLI
- Single Node.js `rho` CLI replacing all existing bash scripts
- Ships via `bin` field in package.json (`npm install -g` puts `rho` on PATH)
- Subcommands: init, sync, upgrade, doctor, start, stop, status, trigger, login

### Sync
- `rho sync` reads init.toml + packages.toml and generates a filtered pi package entry in `~/.pi/agent/settings.json`
- Uses pi's native package filtering (object form with glob/exclusion patterns)
- Exclusion-based: start with `extensions/*`, add `!` patterns for disabled modules
- Tracks managed entries via `~/.rho/sync.lock`
- Only touches the Rho entry + packages.toml entries in settings.json; leaves everything else untouched
- The Rho entry includes `"_managed_by": "rho"` marker

### Doctor
- Three-state diagnostics: OK (✓), WARN (!), FAIL (✗)
- Every non-OK result includes an actionable fix suggestion
- Checks: system deps, config validation, package health, pi integration, data directories, auth, connectivity

### Upgrade
- `npm update -g @rhobot-dev/rho` + auto-run sync
- New modules added to init.toml as commented-out with a notice
- Breaking changes: warn, don't auto-edit init.toml

### Onboarding
- SKILL.md in agent-sops format is THE install path (no bootstrap.sh fallback)
- Agent-agnostic: works with any coding agent that reads markdown + runs bash
- Handles everything from zero: deps, pi, rho, interview, config, sync, optional tmux walkthrough
- Adaptive interview (smarter than `rho init`)
- Ends with optional: "First time using tmux? Would you like me to walk you through basic usage?"

### Migration
- Detect existing `~/.rho/` data, preserve it
- Generate fresh config with defaults alongside existing files
- No reverse-engineering of current state

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    User's Machine                        │
│                                                          │
│  ~/.rho/                                                 │
│  ├── init.toml          ← Source of truth (modules+cfg)  │
│  ├── packages.toml      ← Third-party packages           │
│  ├── sync.lock          ← Managed entries tracker         │
│  ├── brain/             ← Memory data (unchanged)         │
│  ├── vault/             ← Knowledge graph (unchanged)     │
│  └── ...state files...  ← Existing data (unchanged)      │
│                                                          │
│  ~/.pi/agent/                                            │
│  ├── settings.json      ← Pi config (Rho entry managed)  │
│  ├── extensions/        ← Local extensions (untouched)    │
│  └── skills/            ← Local skills (untouched)        │
│                                                          │
│  @rhobot-dev/rho (npm global)                            │
│  ├── cli/               ← Node.js CLI source              │
│  │   ├── index.ts       ← Entry point + command router    │
│  │   ├── commands/      ← Subcommand implementations      │
│  │   ├── registry.ts    ← Module → path mapping           │
│  │   └── config.ts      ← TOML parsing + validation       │
│  ├── extensions/        ← Bundled extensions               │
│  ├── skills/            ← Bundled skills                   │
│  ├── templates/         ← Default init.toml, etc.          │
│  └── package.json       ← bin: { "rho": "cli/index.ts" }  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Data Flow: `rho sync`

```
init.toml ──┐
             ├──→ rho sync ──→ filtered package entry ──→ settings.json
packages.toml┘         │
                        └──→ sync.lock (tracking)
```

### Data Flow: Onboarding

```
Any Agent + SKILL.md
  │
  ├─ 1. Detect environment
  ├─ 2. Install deps (node, git, tmux)
  ├─ 3. Install pi (npm install -g)
  ├─ 4. Install rho (npm install -g)
  ├─ 5. Interview user (adaptive)
  ├─ 6. Generate init.toml + packages.toml
  ├─ 7. rho sync
  ├─ 8. rho doctor
  └─ 9. Optional tmux walkthrough
```

---

## Components and Interfaces

### 1. Config Parser (`cli/config.ts`)

Responsible for reading, validating, and providing typed access to init.toml and packages.toml.

```typescript
interface RhoConfig {
  agent: {
    name: string;
  };
  modules: {
    core: Record<string, boolean>;
    knowledge: Record<string, boolean>;
    tools: Record<string, boolean>;
    ui: Record<string, boolean>;
    skills: Record<string, boolean>;
  };
  settings: Record<string, Record<string, unknown>>;
}

interface PackagesConfig {
  packages: Array<{
    source: string;
    extensions?: string[];
    skills?: string[];
  }>;
}

function parseInitToml(path: string): RhoConfig;
function parsePackagesToml(path: string): PackagesConfig;
function validateConfig(config: RhoConfig): ValidationResult;
```

**Library**: `smol-toml` for parsing. Generate fresh configs via template strings (preserves comments).

### 2. Module Registry (`cli/registry.ts`)

Maps module names to their extension and skill paths within the Rho package.

```typescript
interface ModuleEntry {
  category: "core" | "knowledge" | "tools" | "ui" | "skills";
  extensions: string[];  // paths relative to package root
  skills: string[];      // paths relative to package root
  description: string;   // one-line description for init.toml comments
  alwaysOn?: boolean;    // core modules
}

const REGISTRY: Record<string, ModuleEntry> = {
  heartbeat: {
    category: "core",
    extensions: ["extensions/rho"],
    skills: ["skills/memory-clean"],
    description: "Heartbeat daemon, check-ins, and memory consolidation",
    alwaysOn: true,
  },
  memory: {
    category: "core",
    extensions: ["extensions/memory-viewer"],
    skills: [],
    description: "Memory browser and viewer",
    alwaysOn: true,
  },
  vault: {
    category: "knowledge",
    extensions: ["extensions/vault-search"],
    skills: ["skills/vault-clean"],
    description: "Knowledge vault with full-text search and orphan cleanup",
  },
  "brave-search": {
    category: "tools",
    extensions: ["extensions/brave-search"],
    skills: [],
    description: "Web search via Brave Search API",
  },
  "x-search": {
    category: "tools",
    extensions: ["extensions/x-search"],
    skills: [],
    description: "X/Twitter search via xAI Grok",
  },
  email: {
    category: "tools",
    extensions: ["extensions/email"],
    skills: ["skills/rho-cloud-email", "skills/rho-cloud-onboard"],
    description: "Agent email via Rho Cloud (rhobot.dev)",
  },
  "session-search": {
    category: "skills",
    extensions: [],
    skills: ["skills/session-search"],
    description: "Search across pi session logs",
  },
  "update-pi": {
    category: "skills",
    extensions: [],
    skills: ["skills/update-pi"],
    description: "Update pi coding agent to latest version",
  },
  "usage-bars": {
    category: "ui",
    extensions: ["extensions/usage-bars"],
    skills: [],
    description: "Token usage display bars",
  },
  moltbook: {
    category: "ui",
    extensions: ["extensions/moltbook-viewer"],
    skills: [],
    description: "Moltbook viewer",
  },
};
```

### 3. CLI Entry Point (`cli/index.ts`)

Command router using a lightweight approach (no heavy CLI framework needed — subcommand dispatch is simple enough).

```typescript
#!/usr/bin/env node

const commands = {
  init:    () => import("./commands/init.js"),
  sync:    () => import("./commands/sync.js"),
  upgrade: () => import("./commands/upgrade.js"),
  doctor:  () => import("./commands/doctor.js"),
  start:   () => import("./commands/start.js"),
  stop:    () => import("./commands/stop.js"),
  status:  () => import("./commands/status.js"),
  trigger: () => import("./commands/trigger.js"),
  login:   () => import("./commands/login.js"),
};
```

No need for yargs/commander — the command set is fixed and small.

### 4. Command: `rho init` (`cli/commands/init.ts`)

```
rho init [--name <agent-name>]
```

Flow:
1. Detect platform (Android/Termux, macOS, Linux)
2. Check for existing `~/.rho/` — if found, warn and preserve data
3. Prompt for agent name (or use --name flag)
4. Create `~/.rho/` if needed
5. Generate `~/.rho/init.toml` from template (all modules enabled, heavily commented)
6. Generate `~/.rho/packages.toml` (empty with comments)
7. Generate `~/.rho/SOUL.md` from template if not present
8. Print next steps: "Edit init.toml, then run `rho sync`"

### 5. Command: `rho sync` (`cli/commands/sync.ts`)

```
rho sync
```

Flow:
1. Parse `~/.rho/init.toml` — validate, get enabled/disabled modules
2. Parse `~/.rho/packages.toml` — get third-party packages
3. Read `~/.pi/agent/settings.json`
4. Build the Rho package filter entry:
   - Start with `"extensions/*"` and `"skills/*"`
   - Add `!extension/path` for each disabled module's extensions
   - Add `!skill/path` for each disabled module's skills
   - Add `"_managed_by": "rho"` marker
5. Find and replace the existing Rho entry in settings.json packages array (match by source path or `_managed_by` marker)
6. For each package in packages.toml:
   - Check if installed (present in settings.json)
   - If not, run `pi install <source>`
   - Apply any filtering from packages.toml
7. Read `~/.rho/sync.lock` to find previously-managed packages.toml entries
8. Remove any packages from settings.json that were in sync.lock but are no longer in packages.toml
9. Write updated `~/.rho/sync.lock`
10. Write updated `~/.pi/agent/settings.json`
11. Create data directories if needed (`~/.rho/brain/`, `~/.rho/vault/`)
12. Apply module settings from `[settings.*]` sections (write heartbeat interval, etc.)
13. Print summary of changes

### 6. Command: `rho doctor` (`cli/commands/doctor.ts`)

```
rho doctor
```

Checks organized by category:

```
System
  ✓ Node.js v22.5.0
  ✓ tmux 3.4
  ✓ git 2.47.0
  ! Termux:API not found
    Install from F-Droid: https://f-droid.org/packages/com.termux.api/

Config
  ✓ ~/.rho/init.toml exists and parses
  ✓ All module names are valid
  ✗ Unknown module "foobar" in [modules.tools]
    Remove it from init.toml or check spelling

Packages
  ✓ @rhobot-dev/rho v0.2.0 installed
  ✓ All enabled modules have files on disk

Pi Integration
  ✓ settings.json has Rho entry
  ! Rho entry is out of sync with init.toml
    Run `rho sync` to update

Data
  ✓ ~/.rho/brain/ exists
  ✓ ~/.rho/vault/ exists

Auth
  ✓ Pi auth tokens present
  ! Rho Cloud credentials missing (email module enabled)
    Run `rho login` to authenticate
```

Each check is a function that returns `{ status: "ok" | "warn" | "fail", message: string, fix?: string }`.

### 7. Command: `rho upgrade` (`cli/commands/upgrade.ts`)

```
rho upgrade
```

Flow:
1. Get current version
2. Run `npm update -g @rhobot-dev/rho`
3. Get new version, compare
4. Diff the registry: find new modules not in user's init.toml
5. For each new module: append commented-out entry to init.toml with description
6. Diff the registry: find removed/renamed modules
7. For each removed module: print warning with migration guidance
8. Run `rho sync`
9. Print summary

### 8. Commands: start, stop, status, trigger, login

These migrate from existing bash scripts to Node.js with minimal behavior changes:

- **start** — Launch the heartbeat daemon (currently `rho-daemon`)
- **stop** — Stop the daemon (currently `rho-stop`)
- **status** — Show daemon state, next check-in, enabled modules (currently `rho-status`)
- **trigger** — Force an immediate heartbeat (currently `rho-trigger`)
- **login** — Auth setup for pi and Rho Cloud (currently `rho-login`)

The `status` command gets enhanced to show module state:
```
rho v0.2.0 | agent: tau | platform: android

Heartbeat: running (next: 12m)
Modules:   10 enabled, 2 disabled

  core       heartbeat ✓  memory ✓
  knowledge  vault ✓
  tools      brave-search ✓  x-search ✗  email ✓  session-search ✓  update-pi ✓
  ui         usage-bars ✓  moltbook ✗
```

---

## Data Models

### init.toml (Default Template)

```toml
# Rho Configuration
# Edit this file, then run `rho sync` to apply changes.
# Docs: https://github.com/mikeyobrien/rho

# ── Agent Identity ──────────────────────────────────────

[agent]
name = "rho"                          # Your agent's name

# ── Modules ─────────────────────────────────────────────
# Enable (true) or comment out / set false to disable.
# Core modules are always on.

[modules.core]
heartbeat = true                      # Heartbeat daemon, check-ins, and memory consolidation
memory = true                         # Memory browser and viewer

[modules.knowledge]
vault = true                          # Knowledge vault with full-text search and orphan cleanup

[modules.tools]
brave-search = true                   # Web search via Brave Search API
x-search = true                       # X/Twitter search via xAI Grok
email = true                          # Agent email via Rho Cloud (rhobot.dev)
session-search = true                 # Search across pi session logs
update-pi = true                      # Update pi coding agent to latest version

[modules.ui]
usage-bars = true                     # Token usage display bars
moltbook = true                       # Moltbook viewer

# ── Module Settings ─────────────────────────────────────
# Configure individual modules. Only applied if the module is enabled.

[settings.heartbeat]
interval = "30m"                      # Check-in interval (e.g., "15m", "1h", "2h")
# prompt = "~/.rho/heartbeat-prompt.txt"  # Custom heartbeat prompt

[settings.email]
# handle = ""                         # Your rhobot.dev email handle

# [settings.brave-search]
# api_key_env = "BRAVE_API_KEY"       # Environment variable for API key
```

### packages.toml (Default Template)

```toml
# Additional Pi Packages
# Add third-party extensions and skills here.
# Run `rho sync` after editing.

# [[packages]]
# source = "npm:package-name"

# [[packages]]
# source = "git:github.com/user/repo"
# extensions = ["extensions/specific.ts"]  # Optional: filter what loads
```

### sync.lock

```json
{
  "rho_source": "/path/to/rho/or/npm:@rhobot-dev/rho",
  "managed_packages": [
    "npm:pi-interactive-shell"
  ],
  "last_sync": "2026-02-08T14:30:00Z",
  "rho_version": "0.2.0"
}
```

### Generated settings.json Entry

```json
{
  "source": "npm:@rhobot-dev/rho",
  "_managed_by": "rho",
  "extensions": [
    "extensions/*",
    "!extensions/x-search",
    "!extensions/moltbook-viewer"
  ],
  "skills": [
    "skills/*",
    "!skills/rho-cloud-email",
    "!skills/rho-cloud-onboard"
  ]
}
```

---

## Error Handling

### Config Errors
- **Malformed TOML**: `rho sync` and `rho doctor` report parse errors with line numbers
- **Unknown module names**: Warning in sync, failure in doctor. Sync still processes known modules.
- **Missing config files**: `rho sync` fails with "Run `rho init` first"
- **Core modules set to false**: Sync ignores and warns ("Core modules cannot be disabled")

### Settings.json Errors
- **File doesn't exist**: Sync creates it with minimal structure
- **No packages array**: Sync creates one
- **Rho entry not found**: Sync adds it
- **Rho entry found but no `_managed_by` marker**: Match by source path (backward compat), add marker

### Package Installation Errors
- **`pi install` fails**: Log the error, continue with other packages, report at end
- **Package in sync.lock but `pi remove` fails**: Log warning, continue

### Upgrade Errors
- **npm update fails**: Report error, don't run sync
- **Can't write to init.toml**: Report error, suggest permissions fix

---

## Testing Strategy

### Unit Tests
- Config parser: valid TOML, invalid TOML, missing fields, unknown modules, type mismatches
- Module registry: all modules have valid paths, no duplicate paths, categories are valid
- Filter generator: given enabled/disabled modules, verify correct exclusion patterns
- Sync lock: read/write/diff operations

### Integration Tests
- `rho init`: creates correct directory structure and file contents
- `rho sync`: generates correct settings.json entry for various module configurations
- `rho doctor`: correctly identifies broken/missing/valid states
- `rho upgrade`: correctly appends new modules as comments

### End-to-End Tests
- Full flow: init → edit config → sync → verify pi loads correct modules
- Migration: existing ~/.rho/ data survives init
- Onboarding SKILL.md: execute steps in order on a clean environment

### Test Environment
- Use temp directories for `~/.rho/` and `~/.pi/` to avoid polluting real config
- Mock `pi install` / `npm update` for CI

---

## Appendices

### A. Technology Choices

| Choice | Selected | Alternatives Considered | Rationale |
|---|---|---|---|
| Config format | TOML | YAML, JSON, TypeScript | Clean, minimal, supports comments. No whitespace footguns (YAML). Human-writable (not JSON). No build step (not TS). |
| TOML library | smol-toml | toml (v0.4 only), js-toml, @taplo/lib | Most popular, TOML 1.0.0, actively maintained, small |
| Comment preservation | Text-based append | @rainbowatcher/toml-edit-js, @taplo/lib | Only needed for `rho upgrade` appending new modules. Avoids WASM dependency. |
| CLI framework | None (manual dispatch) | yargs, commander, oclif | Command set is small and fixed. No need for arg parsing library overhead. |
| CLI language | Node.js | Bash | TOML/JSON handling trivial in JS. Ships via npm bin. Already a dependency. |

### B. Research Findings Summary

- **Doom Emacs**: Key pattern is declarative reconciliation (config → sync → reality). Commented-out modules as discovery. Per-module doctor checks.
- **Pi Package Filtering**: Native support for object-form entries with glob/exclusion. Exclusion-based approach (include all, exclude disabled) is cleanest.
- **Agent Config Patterns**: Claude Code uses CLAUDE.md + settings.json (two concerns, two formats). Aider mirrors CLI flags in config. Cursor rides on VS Code. Rho should own its config cleanly.
- **TOML Libraries**: smol-toml is the winner. Comment preservation not natively supported by any major JS library, but text-based append sidesteps the issue.

### C. Alternative Approaches Considered

1. **Symlink-based module management** — Create/remove symlinks in `~/.pi/agent/` for enabled modules. Rejected: fragile, doesn't use pi's native filtering, harder to debug.

2. **Runtime filtering in extension** — Rho's extension reads init.toml at load time and conditionally registers tools. Rejected: extensions still load (consuming resources), module code runs before being "disabled."

3. **Full ownership of settings.json packages array** — rho sync replaces the entire packages array. Rejected: hostile to `pi install` workflow, breaks coexistence.

4. **bootstrap.sh as primary install** — Keep the bash installer. Rejected: the SKILL.md is THE install path. Agent-driven from the start.

5. **YAML config** — Familiar but whitespace-sensitive, no inline comments on same line as value, footgun-prone.

6. **TypeScript config** — Maximum flexibility but requires a build/eval step, harder to parse programmatically, overkill for declarative module selection.
