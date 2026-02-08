# Doom Emacs Architecture Research

## Module System

Doom's modules are organized into categories under `modules/`:
- `:lang` (language support), `:tools`, `:ui`, `:completion`, `:editor`, `:emacs`, `:config`, etc.
- Each module is a directory with optional `init.el`, `config.el`, `packages.el`, `autoload.el`

User config lives in `$DOOMDIR` (typically `~/.doom.d/` or `~/.config/doom/`):
- **`init.el`** — Contains a `doom!` block that lists enabled modules with optional flags
- **`config.el`** — Personal customization (keybindings, settings, hooks)
- **`packages.el`** — Additional packages beyond what modules provide

### The `doom!` Block (init.el)

```elisp
(doom! :input
       ;;bidi
       ;;chinese
       
       :completion
       company           ; the ultimate code completion backend
       ;;helm
       ivy               ; a search engine for love and life
       ;;vertico

       :ui
       doom
       doom-dashboard
       ;;doom-quit
       (emoji +unicode)  ; flags modify module behavior
       hl-todo
       ;;indent-guides
       ...
```

Key insight: modules are listed with comments. Commented-out = disabled. Each has a one-line description. Flags (like `+unicode`) tweak behavior.

## `doom sync` — What It Actually Does

1. **Parse `init.el`** — Read the `doom!` block to determine enabled modules
2. **Collect package declarations** — Each enabled module's `packages.el` declares what packages it needs
3. **Add user packages** — From `$DOOMDIR/packages.el`
4. **Install missing packages** — Via straight.el (Doom's package manager)
5. **Remove orphaned packages** — Packages no longer declared by any enabled module
6. **Regenerate autoloads** — Build the autoloads file (lazy-load function/library registry)
7. **Regenerate caches** — Byte-compile, build metadata

The key pattern: `doom sync` makes the installed state match the declared state. It's declarative — the config files are the source of truth, sync is the reconciliation engine.

## `doom doctor` — Diagnostics

Checks include:
- Emacs version compatibility
- Missing system dependencies (ripgrep, fd, etc.)
- Package installation integrity
- Config syntax validation
- Module-specific health checks (each module can define its own doctor checks)
- Environment variable requirements

Output format: categorized by severity with actionable fix suggestions.

## `doom upgrade`

1. `git pull` the Doom repo
2. Run `doom sync`
3. Report changes

## Key Takeaways for Rho

1. **The config file IS the documentation** — Doom's init.el with commented modules + descriptions is brilliant UX
2. **Sync is declarative reconciliation** — Config is truth, sync makes reality match
3. **Modules are self-contained** — Each module declares its own packages and config
4. **Flags modify behavior** — Simple mechanism for module variants without separate modules
5. **Doctor is per-module** — Each module can register its own health checks
6. **Comments are first-class** — The commented-out modules in init.el are the discovery mechanism
