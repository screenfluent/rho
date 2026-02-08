# Agent Framework Configuration Patterns

## Claude Code

- **Config location**: `~/.claude/` (global), `.claude/` (project)
- **Files**:
  - `CLAUDE.md` — Natural language instructions loaded at startup (like AGENTS.md)
  - `settings.json` — Permissions, environment variables, tool behavior
  - `settings.local.json` — Auto-created on first permission grant
- **Hierarchy**: Organization > Project shared > Project local > User global
  - Higher levels can enforce policies (deny overrides allow)
- **Onboarding**: Minimal — install via npm, authenticate, start using. CLAUDE.md grows organically.
- **Key insight**: Natural language config (CLAUDE.md) alongside structured config (settings.json). Two concerns, two formats.

## Cursor

- **Config**: `.cursorrules` file in project root (natural language instructions)
- **Settings**: VS Code settings.json extensions
- **Onboarding**: IDE-based — install the editor, sign in, configure via UI
- **Key insight**: Rides on VS Code's existing config infrastructure. No separate config system.

## Aider

- **Config location**: `.aider.conf.yml` in home dir, git root, or current dir
- **Format**: YAML
- **Hierarchy**: Home → Git root → CWD → CLI flags (later wins)
- **Features**:
  - Most CLI options can be set in config
  - Model settings in separate `aider.model.settings.yml`
  - Environment-specific overrides via multiple config files
- **Onboarding**: Install via pip, set API key, optionally create .aider.conf.yml
- **Key insight**: Config mirrors CLI flags exactly. If you can pass it on the command line, you can put it in the config file. Simple mental model.

## Pi

- **Config location**: `~/.pi/agent/` (global), `.pi/` (project)
- **Files**:
  - `settings.json` — Provider, model, packages, enabled models
  - `AGENTS.md` / `CLAUDE.md` — Loaded from cwd + ancestors
  - Skills in `skills/`, extensions in `extensions/`
- **Package system**: `pi install`, `pi remove`, `pi list`, `pi update`
- **Key insight**: Package-based extensibility with a robust filtering system

## Patterns Worth Stealing

1. **Claude Code's CLAUDE.md** — We already have this (SOUL.md, AGENTS.md). Good validation.
2. **Aider's "config mirrors CLI"** — Every rho CLI flag should be settable in init.toml. Simple mental model.
3. **Doom's commented-out modules** — The config file as documentation/discovery. Best pattern here.
4. **Pi's package filtering** — We're already using this. The object form in packages array is the integration point.

## Anti-Patterns to Avoid

1. **Cursor's "ride on another config system"** — Rho needs its own clean config, not piggybacking on pi's settings.json directly
2. **Scattered config hierarchy** — Multiple config file locations that cascade. Rho should have ONE config location (~/.rho/)
3. **UI-dependent onboarding** — Everything must work from a terminal/agent
