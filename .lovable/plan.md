

## Add a Floating Chat Button with OpenClaw Agent

### Overview
Add a floating chat button (bottom-right corner) across all authenticated dashboard pages that opens a slide-up chat panel. Users can have a conversation with their OpenClaw agent in a familiar chat UI, with messages displayed in real-time as they come back from the agent.

The chat reuses the existing `openclaw-proxy` backend function and `agent_tasks` table, plus realtime subscriptions to show responses as they arrive.

---

### What You Will See

- A circular chat button (with a claw/message icon) pinned to the bottom-right of every dashboard page
- Clicking it opens a chat panel (roughly 400x500px) with:
  - A header showing "Chat with OpenClaw" and a close button
  - A scrollable message area with user messages on the right and agent responses on the left
  - A text input + send button at the bottom
- Messages are sent via the existing `openclaw-proxy` function
- Agent responses update in real-time via the existing realtime subscription on `agent_tasks`
- The chat panel can be closed/reopened without losing the conversation
- Works on both desktop and mobile

---

### Technical Details

**New file: `src/components/dashboard/OpenClawChat.tsx`**
- A floating chat widget component containing:
  - A toggle button (fixed bottom-right, z-50) with a `MessageCircle` icon from lucide-react
  - An expandable chat panel using framer-motion for smooth open/close animation
  - Chat message state stored locally (array of `{ role: "user" | "agent", content: string, timestamp: Date, taskId?: string }`)
  - Sends messages via `supabase.functions.invoke("openclaw-proxy", { body: { taskType: "chat", message } })`
  - Subscribes to realtime changes on `agent_tasks` table to detect when tasks complete, then extracts the response text and appends it as an agent message
  - Auto-scrolls to bottom on new messages
  - Shows a typing indicator when a task is in "pending" or "running" state

**Modified file: `src/components/dashboard/DashboardLayout.tsx`**
- Import and render `<OpenClawChat />` alongside the existing layout so it appears on all dashboard pages

**No database changes needed** -- the chat uses the existing `agent_tasks` table and `openclaw-proxy` function.

**No new edge functions needed** -- all communication goes through the existing proxy.

### Files
- **Create**: `src/components/dashboard/OpenClawChat.tsx` -- floating chat widget
- **Modify**: `src/components/dashboard/DashboardLayout.tsx` -- add the chat component to the layout

