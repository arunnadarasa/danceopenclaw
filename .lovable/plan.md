

## Fix Chat Timeout and WebSocket Stability

### Problem
1. **Timeout too short**: Railway cold starts can take 20-30 seconds, but the proxy only waits 15 seconds before failing
2. **WebSocket connection flood**: Every time a pending task is added, the entire Realtime channel tears down and re-subscribes because `pendingTaskIds` is in the `useEffect` dependency array
3. **No fallback**: If the Realtime update is missed, the chat shows "Thinking..." forever with no recovery

### Solution

**1. Increase proxy timeout (`supabase/functions/openclaw-proxy/index.ts`)**
- Change `AbortSignal.timeout(15000)` to `AbortSignal.timeout(30000)` (30 seconds)
- Update the error message to say "30s" instead of "15s"
- This gives Railway servers time to cold start

**2. Stabilize Realtime subscription (`src/components/dashboard/OpenClawChat.tsx`)**
- Add a `useRef` to track pending task IDs so the Realtime callback always reads the latest set
- Remove `pendingTaskIds` from the `useEffect` dependency array — the channel should only depend on `user`
- This stops the channel from being destroyed and recreated on every new task

**3. Add polling fallback (`src/components/dashboard/OpenClawChat.tsx`)**
- When there are pending tasks, start a 5-second polling interval that queries `agent_tasks` for status updates
- If a task has moved to "completed" or "failed", update messages and remove from pending
- Stop polling when no tasks are pending or on unmount
- This ensures the chat always recovers, even if a Realtime event is missed

**4. Show immediate proxy errors in chat (`src/components/dashboard/OpenClawChat.tsx`)**
- If the proxy returns an error (like the timeout message), display it immediately in the chat bubble instead of leaving "Thinking..." spinning

### Files Modified
- `supabase/functions/openclaw-proxy/index.ts` — increase timeout from 15s to 30s
- `src/components/dashboard/OpenClawChat.tsx` — stabilize Realtime, add polling fallback, show inline errors

### Also update in AgentTaskPanel
- `src/components/dashboard/AgentTaskPanel.tsx` — update the timeout error message text to match the new 30s timeout (for consistency)

