# Idea Honing

Requirements clarification through Q&A.

---

## Q1: What's the primary pain point with Rho's current install/config experience?

Right now Rho has several moving parts: `bootstrap.sh` clones the repo + installs system deps, `pi install npm:@rhobot-dev/rho` loads the pi package, scripts get symlinked from `$PREFIX/bin`, and there's a `~/.rho/` directory for brain/state/vault that gets created ad-hoc. User config lives... nowhere declaratively — it's scattered across `~/.rho/config.json`, the heartbeat prompt, AGENTS.md, SOUL.md, and various dotfiles.

What specifically is bothering you most? Some possibilities:
- **No single config file** — you can't look at one place and see "what is Rho doing for me"
- **Module selection** — no clean way to enable/disable extensions and skills
- **Upgrade friction** — syncing after updates is manual and fragile
- **Onboarding** — new users have too many steps to get running
- **Something else?**

**A1:** All of it. Every pain point listed applies — no single config file, no clean module selection, upgrade friction, and rough onboarding. The whole install/config surface needs a cohesive redesign.

---

## Q2: What should the user's config directory look like?

Doom Emacs uses `~/.doom.d/` with three files:
- `init.el` — which modules are enabled
- `config.el` — personal customization
- `packages.el` — additional packages beyond what modules provide

For Rho, I'm thinking `~/.rho/` already exists as the data directory (brain, vault, state). Should the config files live there too, or should config be separate from data?

For example:
- **Option A:** Everything in `~/.rho/` — config files alongside brain/vault/state (simpler, one directory to know about)
- **Option B:** Config in `~/.config/rho/` — XDG-style separation of config from data in `~/.rho/` (cleaner separation, but two directories)
- **Option C:** Config in `~/.rho/config/` — a subdirectory within the existing structure (compromise)

**A2:** Option A. Everything in `~/.rho/` — config files live alongside brain, vault, and state. One directory to rule them all.

---

## Q3: What config file format?

Doom uses Emacs Lisp because it *is* Emacs. For Rho, the config files need to be both human-editable and machine-readable. Options:

- **TOML** — Clean, minimal syntax. Good for declarative config. What Cargo, Hugo, and many modern tools use. Example:
  ```toml
  [modules]
  heartbeat = true
  vault = true
  email = false
  
  [heartbeat]
  interval = "30m"
  ```
- **YAML** — Familiar to most devs. More expressive but whitespace-sensitive footguns.
- **TypeScript/JS** — Like Doom's elisp approach: config *is* code. Maximum flexibility (conditionals, imports), but harder to parse programmatically. Example:
  ```ts
  export default {
    modules: { heartbeat: true, vault: true },
    heartbeat: { interval: "30m" }
  }
  ```
- **JSON** — Universal but verbose, no comments.

What feels right?

**A3:** TOML. Clean, minimal, supports comments, easy to hand-edit.

---

## Q4: What's the Rho config file structure?

Doom has three files with distinct roles. For Rho in TOML, I'm thinking two files instead of three:

- **`~/.rho/init.toml`** — The main declarative config. Which modules are enabled, their settings, agent identity, heartbeat config. This is the "what is Rho doing" file.
- **`~/.rho/packages.toml`** — Additional pi packages beyond what Rho bundles (third-party extensions/skills). Equivalent to Doom's `packages.el`.

The "personal customization" role (Doom's `config.el`) would be handled by files that already exist: `SOUL.md` for voice/identity, `AGENTS.md` for agent behavior, `HEARTBEAT.md` for recurring tasks. No need to reinvent those.

Or do you want a different split? Maybe a single file (`~/.rho/config.toml`) that covers everything?

**A4:** Two files. `~/.rho/init.toml` for modules + settings, `~/.rho/packages.toml` for third-party packages. Personal customization stays in the existing markdown files (SOUL.md, AGENTS.md, HEARTBEAT.md).

---

## Q5: What should the module taxonomy look like?

Doom organizes modules into categories (`:lang`, `:tools`, `:ui`, `:completion`, etc.). Looking at Rho's current extensions and skills, here's a possible categorization:

```toml
[modules.core]       # Always on, not optional
heartbeat = true     # rho extension (daemon, check-ins)
memory = true        # memory-viewer extension + brain

[modules.knowledge]
vault = true         # vault-search extension + vault-clean skill
# future: rag, embeddings

[modules.tools]
brave-search = true  # web search
x-search = true      # X/Twitter search
email = true         # rho cloud email extension + skills

[modules.ui]
usage-bars = true    # token usage display
moltbook = false     # moltbook viewer
dashboard = true     # rho-dashboard extension

[modules.skills]
humanizer = true     # writing skill
x-twitter = true     # X posting skill
session-search = true
```

Does this kind of grouping feel right, or would you organize it differently? And should some things be truly "core" (always on, not toggleable)?

**A5:** Yes, the category-based grouping works. Core modules (heartbeat, memory) are always on. Everything else is toggleable per-category.

---

## Q6: What should the `rho` CLI look like?

Doom's CLI (`doom`) has a handful of subcommands that cover the full lifecycle. Rho already has some scripts (`rho`, `rho-daemon`, `rho-status`, `rho-stop`, `rho-trigger`, `rho-login`). The refactor would consolidate these into a single `rho` CLI with subcommands:

```
rho init          # Interactive setup — creates ~/.rho/ with default init.toml, SOUL.md template
rho sync          # Read init.toml + packages.toml, install/update packages, wire up extensions/skills
rho upgrade       # Pull latest rho + sync
rho doctor        # Diagnostics — check deps, validate config, verify extensions load, test connectivity
rho start/stop    # Daemon lifecycle (existing)
rho status        # Current state (existing)
rho trigger       # Force heartbeat (existing)
rho login         # Auth setup (existing)
```

The key new commands are `init`, `sync`, `upgrade`, and `doctor`. Does this command set cover what you need, or is anything missing/unnecessary?

**A6:** LGTM. Consolidate into a single `rho` CLI with subcommands: init, sync, upgrade, doctor, start, stop, status, trigger, login.

---

## Q7: What should `rho init` look like?

This is the first-run experience. Doom's `doom install` clones the repo, builds, and asks minimal questions. For Rho, `rho init` needs to bootstrap `~/.rho/` from scratch. Two approaches:

- **Option A: Minimal interactive** — Ask 2-3 questions (agent name, heartbeat interval, platform), then generate `init.toml` with sensible defaults and everything enabled. User tweaks later. Fast.
- **Option B: Module picker** — Walk through each category and let the user toggle modules on/off before generating config. More like Doom's init.el experience. Thorough but slower.
- **Option C: Template-based** — Offer a few preset profiles ("minimal", "full", "headless-server") that pre-configure module sets. User picks one, gets a starting `init.toml` they can customize.

Which approach, or a combination?

**A7:** Option A — Minimal interactive. Ask bare minimum (agent name, auto-detect platform), generate a well-commented `init.toml` with sensible defaults and everything enabled. The file itself is self-documenting. User comments out what they don't need, then runs `rho sync`. Scale to picker/templates later if module count warrants it.

---

## Q8: What should `rho sync` actually do?

This is the workhorse command — the equivalent of `doom sync`. It reads `init.toml` + `packages.toml` and makes reality match config. But what does "making reality match" mean concretely?

Today, pi loads extensions/skills from:
1. The npm package (`@rhobot-dev/rho`) via `pi.extensions` and `pi.skills` in package.json
2. Local directories (`~/.pi/agent/extensions/`, `~/.pi/agent/skills/`)

So `rho sync` needs to bridge the gap between "user toggled a module off in init.toml" and "pi doesn't load that extension/skill." Possible mechanics:

- **Generate a pi-compatible manifest** — Write a filtered `~/.pi/packages.json` or `settings.json` entry that only includes enabled modules
- **Symlink management** — Create/remove symlinks in `~/.pi/agent/` pointing to enabled modules
- **Wrapper config** — Rho's own extension reads `init.toml` at runtime and conditionally registers tools/handlers based on what's enabled

Which approach appeals to you, or should I research how pi's package loading actually works to find the cleanest integration point?

**A8:** Generate a pi-compatible manifest. Research confirmed: pi supports **package filtering** in settings.json — the object form lets you include/exclude specific extensions and skills with globs and `!exclusions`. `rho sync` reads `init.toml`, maps enabled modules to extension/skill paths, and writes a filtered package entry to `~/.pi/agent/settings.json`. Native pi integration, no symlinks or runtime hacks.

---

## Q9: How should `rho sync` handle the settings.json write?

The user's `~/.pi/agent/settings.json` has other stuff beyond the Rho package entry (default provider, model, other packages). `rho sync` only needs to manage the Rho entry in the `packages` array.

Two concerns:
1. **Ownership boundary** — `rho sync` should only touch the Rho package entry, never modify other settings. It finds the existing Rho entry (by source path or npm name), replaces it with the updated filtered version, and leaves everything else untouched.
2. **Conflict with manual edits** — If someone manually edits the Rho package entry in settings.json, `rho sync` will overwrite it.

Is "rho sync owns the Rho package entry, hands off everything else" the right contract?

**A9:** Yes. `rho sync` owns the Rho package entry in settings.json, hands off everything else. `init.toml` is the source of truth. The settings.json entry is generated/machine-managed. No merge logic, no conflict detection — if someone hand-edits the Rho entry, next sync overwrites it silently. Clean, simple contract.

---

## Q10: What should `rho doctor` check?

Doom's `doom doctor` is one of its best features — it validates everything from Emacs version to missing system dependencies to broken package configs. For Rho, what diagnostics matter?

Proposed checks:
1. **System deps** — Node.js version, tmux installed, git installed, platform-specific (Termux:API on Android)
2. **Config validation** — `init.toml` parses correctly, no unknown module names, no conflicting settings
3. **Package health** — Rho npm package installed, version check, all enabled modules' files exist on disk
4. **Pi integration** — settings.json has the Rho entry, it matches what init.toml expects (i.e., sync is up to date)
5. **Data directories** — `~/.rho/brain/`, `~/.rho/vault/` exist and are writable
6. **Auth** — Pi auth tokens present, Rho Cloud credentials if email module enabled
7. **Connectivity** — Can reach API endpoints if cloud features enabled

Should it also suggest fixes (like `doom doctor` does), or just report pass/fail?

**A10:** Suggest fixes. Three states: OK (✓), WARN (!), FAIL (✗). Every non-OK result includes a one-liner on how to fix it. Warnings = works without but degrades experience. Failures = will break. Scannable, actionable output.

---

## Q11: What happens to `bootstrap.sh`?

Currently `bootstrap.sh` does everything: clones the repo, installs system deps, installs the npm package, symlinks scripts, creates directories. In the new model, the responsibilities shift:

- **System deps + initial install** → Still needed as a one-liner curl install
- **Config generation** → Moves to `rho init`
- **Package wiring** → Moves to `rho sync`
- **Script symlinking** → Goes away if `rho` becomes a single CLI entry point

So `bootstrap.sh` becomes much thinner:
1. Detect platform, install system deps (node, tmux, git)
2. `npm install -g @rhobot-dev/rho` (which provides the `rho` CLI)
3. Run `rho init` (interactive first-run)
4. Run `rho sync`

That's it. The heavy lifting moves into the `rho` CLI itself. Does this flow work, or do you want bootstrap.sh to do more/less?

**A11:** Yes. Bootstrap.sh becomes a thin shim: install system deps, npm install rho globally, then hand off to `rho init` + `rho sync`. All logic lives in the `rho` CLI.

---

## Q12: Should the `rho` CLI be a bash script or a Node.js CLI?

The current scripts are all bash. For the refactored `rho` CLI, two options:

- **Bash** — Consistent with what exists. No build step. Works everywhere. But parsing TOML in bash is painful, and the settings.json manipulation (read JSON, find Rho entry, replace it, write back) is ugly in bash/jq.
- **Node.js** — Already a dependency (pi requires it). TOML parsing is trivial (npm package). JSON manipulation is native. Can share code with extensions. Can be shipped as part of the `@rhobot-dev/rho` npm package with a `bin` entry in package.json. More maintainable as complexity grows.

Node.js seems like the obvious choice given that Rho is already an npm package and pi requires Node. The `bin` field in package.json would give us `rho` on `$PATH` after `npm install -g`. Any reason to stick with bash?

**A12:** Node.js. Ships via `bin` in package.json. TOML/JSON handling is trivial. Existing bash scripts get replaced.

---

## Q13: What about the existing `~/.rho/` data for current users?

You're the only user right now, but this is worth getting right for the pattern. When someone already has a `~/.rho/` directory with brain, vault, state files, but no `init.toml`:

- **`rho init`** should detect existing data and not blow it away. It generates `init.toml` and `packages.toml` alongside the existing files.
- **Migration** — Should `rho init` attempt to read the current state (e.g., what extensions are loaded in settings.json) and generate an `init.toml` that matches? Or just start from defaults?

I'd say: detect existing `~/.rho/`, warn the user, generate `init.toml` with defaults, and tell them to review it. Don't try to reverse-engineer current state — it's fragile and there's one user. Clean start on config, preserve data. Sound right?

**A13:** Yes. Detect existing data, preserve it, generate fresh config with defaults alongside it. No reverse-engineering of current state.

---

## Q14: How should `packages.toml` work?

This is the equivalent of Doom's `packages.el` — declaring additional pi packages beyond what Rho bundles. Something like:

```toml
# Third-party pi packages
[[packages]]
source = "npm:pi-interactive-shell"

[[packages]]
source = "git:github.com/someone/cool-extension"

[[packages]]
source = "npm:@foo/bar@1.0.0"
# Optional filtering, same as pi supports
extensions = ["extensions/only-this.ts"]
```

Then `rho sync` would:
1. Ensure each package is installed (`pi install <source>` if missing)
2. Apply any filtering to the settings.json entry

The question: should `rho sync` fully manage the `packages` array in settings.json (replacing it entirely with Rho entry + packages.toml entries), or should it only manage entries that came from packages.toml and leave manually-added packages alone?

**A14:** Sync manages what it knows about, leaves the rest alone. Three zones: (1) Rho package entry — fully owned, (2) packages.toml entries — managed by sync, (3) everything else — untouched. A `~/.rho/sync.lock` tracks which entries sync manages, so it can diff on next run. Pi install and rho sync coexist cleanly.

---

## Q15: What about module-level settings in init.toml?

Some modules need configuration beyond just on/off. For example:
- Heartbeat needs an interval
- Email needs to know the agent handle
- Brave search might need an API key reference

How deep should module config go in init.toml? Two extremes:

- **Minimal** — init.toml only handles enable/disable. Module-specific config stays where it currently lives (env vars, separate config files, extension settings). init.toml is purely a module manifest.
- **Centralized** — Each module can have a config section in init.toml:
  ```toml
  [modules.core]
  heartbeat = true
  
  [settings.heartbeat]
  interval = "30m"
  prompt = "~/.rho/heartbeat-prompt.txt"
  
  [settings.email]
  handle = "tau"
  ```

The centralized approach is more "Doom-like" (everything in one place), but it means init.toml needs to understand every module's config schema. The minimal approach is simpler but keeps config scattered.

Which direction?

**A15:** Centralized. Module settings live in init.toml under `[settings.<module>]` sections. One file to understand everything Rho is doing.

---

## Q16: How should `rho upgrade` work?

Doom's `doom upgrade` pulls the latest Doom core, rebuilds, and syncs. For Rho:

```
rho upgrade
```

Proposed flow:
1. `npm update -g @rhobot-dev/rho` (pull latest Rho)
2. Auto-run `rho sync` (rewire settings.json with any new/changed modules)
3. Report what changed (new modules available, deprecated modules, breaking config changes)

A couple sub-questions:
- **New modules** — When an upgrade adds a new module that didn't exist before, should it be auto-enabled in init.toml, or added as commented-out so the user opts in? I'd lean toward commented-out with a notice ("New module available: `knowledge.rag` — enable it in init.toml").
- **Breaking changes** — If a module is renamed or removed, should upgrade edit init.toml automatically, or just warn and let the user fix it?

**A16:** New modules added as commented-out with a notice. And for breaking changes — warn, don't auto-edit. The user owns init.toml.

---

## Q17: What's the scope of this refactor relative to the Rho repo?

This touches a lot of the project structure. Let me make sure we're aligned on what changes and what doesn't:

**Changes:**
- New `cli/` directory (or `src/cli/`) in the rho repo for the Node.js CLI
- `package.json` gets a `bin` entry for `rho`
- `bootstrap.sh` gets slimmed down
- Old bash scripts (`rho-daemon`, `rho-status`, `rho-stop`, `rho-trigger`, `rho-login`) get replaced by CLI subcommands
- A module registry/manifest that maps module names to extension/skill paths
- A default `init.toml` template shipped with the package

**Stays the same:**
- Extensions and skills themselves (just how they're loaded changes)
- `~/.rho/` data layout (brain, vault, state)
- SOUL.md, AGENTS.md, HEARTBEAT.md patterns
- The pi package manifest (`pi` key in package.json)

Does this scope feel right, or is there anything I'm missing or including that shouldn't be here?

**A17:** Yes. Scope confirmed. CLI, bootstrap, scripts, module registry, and config template change. Extensions, skills, data layout, and markdown patterns stay the same.

---

## Q18: Onboarding SKILL.md — an agent-driven install experience

Ship a `SKILL.md` that acts as an SOP for onboarding. An LLM loads the skill and it handles:
1. Installing Rho (running bootstrap or `npm install -g`)
2. Interviewing the user for config preferences (agent name, which modules, settings)
3. Generating `init.toml` and `packages.toml` based on answers
4. Running `rho sync`
5. Ends with optional: "First time using tmux? Would you like me to walk you through basic usage?"

This is essentially `rho init` but driven by conversation instead of a CLI wizard. The skill *uses* the CLI under the hood but the LLM handles the interview and decision-making.

A few clarifications:

Should the skill interview be more thorough than `rho init`'s minimal interactive flow? Since an LLM is doing the asking, it can be more adaptive — e.g., "What do you mainly want to use this for?" and then suggest module sets based on the answer, rather than just asking for a name and dumping defaults. The CLI stays minimal, but the skill can be smarter. That the right split?

**A18:** Yes, dumb CLI / smart skill split. The skill handles everything from zero — the user only needs an agent (any agent — Claude Code, Cursor, Codex, pi, whatever). The skill walks them through installing ALL dependencies including pi itself, node, tmux, git, then Rho, then the interview for config, sync, and optional tmux walkthrough. Uses the agent-sops SOP format (SKILL.md with YAML frontmatter, RFC 2119 constraints, parameterized steps). The SKILL.md is agent-agnostic — any coding agent that can read markdown and run bash can execute it.

The onboarding SKILL.md is THE install path. No bootstrap.sh fallback. If you want Rho, you use an agent to install it. That's the whole point.

---

## Summary of Requirements

- **Config home**: `~/.rho/` (config alongside data)
- **Config format**: TOML
- **Config files**: `init.toml` (modules + settings), `packages.toml` (third-party packages)
- **Module taxonomy**: Categories (core, knowledge, tools, ui, skills) with core always-on
- **Module settings**: Centralized in `[settings.<module>]` sections of init.toml
- **CLI**: Node.js `rho` CLI via npm `bin` entry — subcommands: init, sync, upgrade, doctor, start, stop, status, trigger, login
- **rho init**: Minimal interactive (agent name, auto-detect platform), generates well-commented init.toml with everything enabled
- **rho sync**: Reads init.toml + packages.toml, generates filtered pi package entry in settings.json, tracks managed entries via sync.lock, coexists with `pi install`
- **rho upgrade**: `npm update -g` + sync, new modules added as commented-out with notice, warn on breaking changes (don't auto-edit init.toml)
- **rho doctor**: Three-state diagnostics (OK/WARN/FAIL) with actionable fix suggestions
- **Onboarding SKILL.md**: THE install path. Agent-agnostic SOP (agent-sops format). Only prereq: any coding agent. Handles deps → pi → rho → interview → config → sync → optional tmux walkthrough. No bootstrap.sh fallback.
- **Migration**: Detect existing ~/.rho/ data, preserve it, generate fresh config alongside
- **Scope**: CLI + config layer changes. Extensions, skills, data layout, markdown patterns unchanged.
