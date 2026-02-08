# TOML Libraries for Node.js

## The Comment Preservation Problem

TOML comment preservation is a known pain point (toml-lang/toml#836, #284). Most parsers strip comments on parse because the TOML spec doesn't include comments in the data model. For `rho upgrade` to add commented-out new modules to an existing init.toml, we need either:
- A comment-preserving parser/editor
- A text-based approach (regex/line manipulation) for the upgrade command specifically

## Library Options

### smol-toml (recommended for parsing)
- **npm**: `smol-toml` v1.6.0 (published ~1 month ago)
- **Stars**: Most downloaded TOML parser on npm
- **Spec**: Full TOML 1.0.0 compliance
- **Features**: Parse + serialize, type-safe, fast, small
- **Comment preservation**: ❌ No. Parses to plain objects, comments lost on round-trip
- **Use case**: Reading init.toml, validating config, generating fresh configs

### @rainbowatcher/toml-edit-js
- **npm**: `@rainbowatcher/toml-edit-js`
- **Based on**: Rust toml_edit compiled to WASM (fasterthanlime's toml-edit-js approach)
- **Features**: Formatting-preserving TOML edits
- **Comment preservation**: ✅ Yes — preserves comments, whitespace, structure
- **Use case**: `rho upgrade` editing init.toml to add new commented-out modules
- **Risk**: Smaller project, WASM dependency (may have issues on some platforms)

### @taplo/lib
- **npm**: `@taplo/lib` v0.5.0 (last published 2 years ago)
- **Features**: TOML linter, formatter, utility library
- **Comment preservation**: ✅ Yes (works on the syntax tree level)
- **Risk**: 2 years since last publish, only 3 dependents

### toml (legacy)
- **npm**: `toml` v3.0.0
- **Spec**: TOML v0.4.0 only (outdated)
- **Not recommended**: 7 years old, outdated spec

### js-toml
- **npm**: `js-toml`
- **Features**: TOML 1.0.0, used by Microsoft/AWS
- **Comment preservation**: ❌ No

## Recommended Strategy

**Two-tool approach:**
1. **smol-toml** for all read/write operations (parsing config, generating fresh configs, validation)
2. **Text-based manipulation** for `rho upgrade` adding commented-out modules — append new sections to the end of init.toml as text, since we're only adding, never modifying existing content

This avoids the WASM dependency of toml-edit-js while handling the comment preservation need pragmatically. The upgrade command appends text; it doesn't need to parse and re-serialize the whole file.

If we later need true comment-preserving edits, @rainbowatcher/toml-edit-js is the best option.
