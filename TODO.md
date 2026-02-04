# Rho TODOs

## /tasks command
Add a `/tasks` slash command and `tasks` tool for storing tasks for later. Think lightweight task queue:
- `tasks add "description"` — store a task
- `tasks list` — show pending tasks
- `tasks done <id>` — mark complete
- `/tasks` — show current tasks inline
- Persist to `~/.pi/brain/tasks.jsonl` or similar
- Tasks should be surfaced during heartbeat check-ins (RHO.md quick scan)
- Consider priority levels and due dates

## X posting: Tasker fallback on bot detection
When `bird tweet` fails with error 226 (automated activity detection), fall back to posting via Tasker UI automation:
1. Detect error 226 in `xpost-approve`
2. Send a follow-up notification: "Bird blocked (bot detection). Post via app instead?" with "Yes" / "Skip" buttons
3. "Yes" triggers Tasker automation: open X app → compose → type text → click Post at (970, 150)
4. Create `~/bin/xpost-tasker` script that does the Tasker-based posting flow
5. Wire it into `xpost-approve` as the fallback path
6. Log which method was used (bird vs tasker) in post-log.jsonl
