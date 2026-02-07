

## Upgrade OpenClaw Chat to Real-Time Streaming via WebSocket Bridge

### What
Replace the current task-polling chat system with a real-time streaming approach. Instead of sending a message, creating a database task, and polling for completion, the new system opens a WebSocket connection to the user's OpenClaw server and streams the response token-by-token back to the browser via SSE (Server-Sent Events).

This is the same architecture that worked in your other project, adapted to use each user's stored connection details (webhook URL + token) from the database.

### Why
- **Instant responses**: Tokens appear as the agent generates them instead of waiting for the full response
- **No polling overhead**: Eliminates the 5-second polling interval and Realtime subscription for chat
- **Proven approach**: This exact pattern worked in your other Lovable project
- **Better UX**: Typing-indicator feel with real streamed text, plus markdown rendering

### Architecture Change

Current flow:
```text
Browser -> openclaw-proxy (HTTP POST) -> /hooks/agent -> DB task insert -> Poll DB for result
```

New flow:
```text
Browser -> openclaw-chat (HTTP POST) -> WebSocket to wss://user-ip/ws -> SSE stream back to browser
```

### Changes

#### 1. New Edge Function: `supabase/functions/openclaw-chat/index.ts`

A WebSocket-to-SSE bridge that:
- Authenticates the user via their auth token
- Reads the user's webhook URL and token from `openclaw_connections`
- Converts the HTTP URL to a WebSocket URL (e.g., `https://178.x.x.x` becomes `wss://178.x.x.x/ws`)
- Opens a WebSocket, authenticates with the OpenClaw protocol, sends the chat message
- Streams agent response deltas back as SSE events in OpenAI-compatible format
- Handles lifecycle events (end of response), timeouts (60s), and errors

This does NOT require the `OPENCLAW_GATEWAY_TOKEN` secret since it reads each user's token from the database.

#### 2. New Streaming Utility: `src/lib/openclaw-stream.ts`

Frontend utility that:
- Calls the `openclaw-chat` edge function via fetch
- Parses the SSE response line-by-line
- Calls `onDelta` for each token chunk as it arrives
- Handles `[DONE]`, errors, and buffer edge cases

#### 3. Updated Chat Widget: `src/components/dashboard/OpenClawChat.tsx`

Replace the task-based polling approach with streaming:
- Remove `pendingTaskIds`, Realtime subscription, and polling logic
- Add `streamChat()` integration with `onDelta` callbacks
- Stream tokens into the assistant message progressively (update last message content)
- Show a "Thinking..." indicator only until the first token arrives
- Render agent responses with markdown support using `react-markdown`
- Add `isStreaming` state for the blinking cursor effect

#### 4. Update `supabase/config.toml`

Add the new function entry:
```text
[functions.openclaw-chat]
verify_jwt = false
```

### What Stays the Same
- **Connection card** (`OpenClawConnectionCard.tsx`): No changes -- users still configure webhook URL + token the same way
- **Existing edge functions** (`openclaw-proxy`, `openclaw-status`, `openclaw-register`): Kept for backward compatibility and health checks
- **Agent task panel** (`AgentTaskPanel.tsx`): Unchanged -- still shows task history
- **Database tables**: No schema changes needed

### New Dependencies
- `react-markdown` -- for rendering agent responses with proper formatting
- `remark-gfm` -- GitHub Flavored Markdown support (tables, strikethrough, etc.)

### Files Created
| File | Purpose |
|------|---------|
| `supabase/functions/openclaw-chat/index.ts` | WebSocket-to-SSE bridge edge function |
| `src/lib/openclaw-stream.ts` | Frontend SSE streaming utility |

### Files Modified
| File | Change |
|------|--------|
| `src/components/dashboard/OpenClawChat.tsx` | Replace polling with streaming, add markdown rendering |
| `supabase/config.toml` | Add `openclaw-chat` function entry |

