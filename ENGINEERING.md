# Rho Engineering Status

> Auto-updated by PM heartbeat. Source of truth for what's happening technically.

## Active Subagents

| ID | Task | Branch | Started | Last Update | Status |
|----|------|--------|---------|-------------|--------|
| _none_ | | | | | |

## Recent Deployments

| Date | What | Where |
|------|------|-------|
| 2026-02-04 | Landing page v1 | rho-site.pages.dev / runrho.dev |

## Build Health

- **GitHub Issues**: 1 open (#1 README diagram)
- **CI**: No CI configured yet
- **Site**: https://runrho.dev — deployed via `wr pages deploy` (up, local DNS stale on device — resolves via Google DNS)
- **Cross-platform**: Steps 1-4 of 10 committed to main. No active subagent.

## Architecture Decisions

| Date | Decision | Context |
|------|----------|---------|
| 2026-02-04 | Single repo + platforms/ directory | Cross-platform: no separate packages, install script picks pieces |
| 2026-02-04 | Cloudflare Pages for site | Free tier, custom domain, deploy via wrangler |
| 2026-02-04 | Workers + D1 for future sync API | Free tier covers early growth, natural fit for brain JSONL |
| 2026-02-04 | workerd stub on Termux | `--ignore-scripts` install, stub main.js. Remote ops only, no local dev |

## Tech Debt

- [ ] No CI/CD pipeline — deploys are manual `wr pages deploy`
- [ ] No automated tests
- [ ] rho-site not in git yet
- [x] ~~No LICENSE file in repo~~ — added 2026-02-04
- [ ] bootstrap.sh untested on fresh Termux
