# Pi Package Filtering — Detailed Mechanics

## Current Settings

From `~/.pi/agent/settings.json`:
```json
{
  "packages": [
    "npm:pi-interactive-shell",
    "/data/data/com.termux/files/home/projects/rho",
    "../../projects/pi-ralph"
  ]
}
```

The Rho package is loaded as a local path. Currently no filtering — all extensions and skills load.

## Filtering Syntax (from pi docs)

The object form supports granular control:

```json
{
  "source": "npm:my-package",
  "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
  "skills": [],
  "prompts": ["prompts/review.md"],
  "themes": ["+themes/legacy.json"]
}
```

Rules:
- **Omit a key** → load all of that type
- **`[]`** → load none of that type
- **`!pattern`** → exclude matches
- **`+path`** → force-include exact path
- **`-path`** → force-exclude exact path
- Filters **narrow down** what the manifest allows

## How `rho sync` Would Generate the Filter

Given init.toml:
```toml
[modules.core]
heartbeat = true
memory = true

[modules.tools]
brave-search = true
x-search = false      # disabled
email = false          # disabled

[modules.ui]
usage-bars = true
moltbook = false       # disabled
```

The sync command would:
1. Look up disabled modules in the registry
2. Generate exclusion patterns for their paths
3. Write the filtered entry to settings.json

Result:
```json
{
  "source": "/data/data/com.termux/files/home/projects/rho",
  "_managed_by": "rho",
  "extensions": [
    "extensions/*",
    "!extensions/x-search",
    "!extensions/email",
    "!extensions/moltbook-viewer"
  ],
  "skills": [
    "skills/*",
    "!skills/rho-cloud-email",
    "!skills/rho-cloud-onboard"
  ]
}
```

## Approach: Exclusion-Based (Include All, Exclude Disabled)

Rather than listing every enabled module (inclusion-based), use exclusion-based filtering:
- Start with `"extensions/*"` (include all)
- Add `!` exclusions for disabled modules

**Advantages:**
- New extensions added to the Rho package automatically load (safe default)
- Only need to track what's disabled, not what's enabled
- Shorter filter entries

**Caveat:** Need to verify that `extensions/*` glob works with pi's directory-based extension loading (extensions are directories, not files). May need `extensions/*/index.ts` or just `extensions/*`.

## TODO: Test the Filtering

Should test with pi to confirm:
1. The object form works with local path packages
2. `!extensions/x-search` correctly excludes a directory-based extension
3. The `_managed_by` field is ignored by pi (extra fields in the object)
