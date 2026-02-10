# Fork & Chat UX Audit

## Bugs

### 1. User messages not rendered after sending prompt (CRITICAL)
`sendPrompt()` sends the RPC command but never adds the user's message to `renderedMessages`. 
The pi RPC stream sends `agent_start` → `message_update` (assistant) → `agent_end` but doesn't echo back the user message as an event.

**Fix:** Add a local user message to `renderedMessages` immediately when the prompt is submitted, before sending via WebSocket. Something like:
```js
this.renderedMessages.push({
  id: `local-${Date.now()}`,
  role: 'user',
  roleLabel: 'USER',
  timestamp: new Date().toLocaleString(),
  parts: [{ type: 'text', render: 'text', content: message, key: 'text-0' }],
});
```

### 2. Model dropdown is empty after fork
`requestAvailableModels()` fires on `session_started` but the response handler populates `this.availableModels` — either the RPC doesn't return models, or the response format doesn't match expectations.

**Fix:** Debug the `get_available_models` RPC response. May need to handle the response format differently or provide a fallback.

### 3. Empty assistant message appears (index 12)
An empty assistant message block renders — likely from a `message_start` event with no content followed by an immediate `message_end` or error.

**Fix:** Filter out empty messages from rendering, or only show messages that have at least one non-empty part.

### 4. Duplicate "hi" user message
The forked session includes the original messages, and the session viewer re-renders them. The fork point message appears twice — once from the original session parse and once from the RPC state.

**Fix:** Deduplicate messages by ID when merging fork history with RPC state updates.

---

## UX Improvements

### 5. No visual feedback during fork
Clicking "Fork from latest" has no loading indicator. The button text doesn't change, there's no spinner. User doesn't know if anything is happening.

**Fix:** 
- Show a spinner or "Forking..." text on the button while `isForking` is true
- Disable all fork buttons during the operation
- Show a brief success toast when fork completes

### 6. No clear distinction between read-only and active chat
After forking, the UI transitions from read-only viewer to active chat, but the only visual cue is the composer appearing. The thread header doesn't indicate this is now a live session.

**Fix:**
- Add a "LIVE" or "● Active" indicator in the thread header when an RPC session is active
- Change the thread border or add a subtle green glow to indicate the session is live
- Show "Read-only" label when viewing a non-forked session

### 7. Streaming indicator is only in the footer
During streaming, the only indication is `status: streaming` in the footer, which is easy to miss.

**Fix:**
- Show a typing indicator / pulsing dots below the last message during streaming
- Show an animated border or glow on the message being streamed
- The abort button appears (good) but could be more prominent

### 8. No way to start a fresh session (only fork)
Users can only fork existing sessions. There's no "New session" button to start a blank conversation.

**Fix:** Add a "New session" button in the chat header or session list that creates a blank session and starts an RPC process.

### 9. Tool calls and results are decoupled and noisy
Tool calls render as separate "Tool · name" blocks and "Tool result · name" blocks. They're visually decoupled, auto-unfolded during streaming, and take up too much space. There's no quick way to see what a tool did without expanding it.

**Fix:** Merge tool_call and tool_result into a single unified block:
- Single collapsed block per tool invocation
- Header: `▶ tool_name — "truncated args"    ✓ 1.2s`
- Preview line (visible when collapsed): first ~80 chars of output, truncated
- Click to expand for full args + full output
- Status indicator: spinner while running, ✓ on success, ✗ on error
- Duration shown when complete
- Default collapsed (not auto-expanded)
- Match tool_call to tool_result by tool call ID or position

### 10. Fork buttons on every message are noisy
Every message (including assistant messages) has a "Fork from here" button. This clutters the view. Forking only makes sense from user messages.

**Fix:**
- Only show "Fork from here" on user messages (check `canForkMessage` — it may already filter, but all 15 messages had fork buttons)
- Or show fork buttons only on hover, not permanently

### 10. No confirmation before forking
Forking creates a new session file and spawns an RPC process. There's no "Are you sure?" or undo. 

**Fix:** This is acceptable for now — forking is non-destructive and cheap. But showing a brief "Forked from [message preview]" toast after fork would help confirm what happened.

### 11. Session list doesn't auto-scroll to new fork
After forking, the new session appears in the list but the list doesn't scroll to it.

**Fix:** Scroll the session list to show the newly created fork, and highlight it briefly.

### 12. Chat thread doesn't auto-scroll during streaming
The auto-scroll during streaming may not be working — need to verify with a longer response.

**Fix:** Ensure `scrollThreadToBottom()` is called on each `message_update` delta, with a check that the user hasn't manually scrolled up.

### 13. No keyboard shortcut hints
Enter to send, Escape to cancel, etc. aren't documented in the UI.

**Fix:** Add subtle hint text below the composer: "Enter to send · Shift+Enter for newline · Esc to cancel"

### 14. Composer textarea doesn't auto-resize
The textarea has a fixed 2 rows. As the user types more, they have to manually resize.

**Fix:** Auto-grow the textarea to fit content (up to max-height), shrink back when content is removed.

---

## Priority Order

**P0 — Broken (must fix):**
1. User messages not rendering (#1)
2. Empty/duplicate messages (#3, #4)

**P1 — Important UX:**
3. Fork loading feedback (#5)
4. Read-only vs active indicator (#6)
5. Streaming indicator (#7)
6. Fork buttons only on user messages (#9)

**P2 — Nice to have:**
7. New session button (#8)
8. Model dropdown fix (#2)
9. Auto-scroll fixes (#11, #12)
10. Keyboard hints (#13)
11. Textarea auto-resize (#14)
12. Fork confirmation toast (#10)
