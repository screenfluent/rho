# Rough Idea

Refactor Rho to a Doom Emacs-style installation and configuration experience.

Doom Emacs is known for:
- A declarative `init.el` where users enable/disable "modules" (curated bundles of packages + config)
- A separate `config.el` for personal customization
- A `packages.el` for declaring additional packages
- A CLI tool (`doom`) for install, sync, upgrade, doctor (diagnostics)
- Opinionated defaults that "just work" out of the box
- Modules organized by category (`:lang`, `:tools`, `:ui`, etc.)
- Clear separation between framework code and user configuration

The goal is to bring this philosophy to Rho: make it easy to install, configure via a declarative config file, enable/disable bundled extensions and skills as modules, and provide a CLI that handles sync/upgrade/diagnostics.
