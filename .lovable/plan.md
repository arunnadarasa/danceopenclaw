

## Improve OpenClaw Connection Diagnostics

### Problem
The Railway deployment is crashing (container stops 3 seconds after starting), and our dashboard silently shows "Pending" or "Disconnected" with no explanation of what went wrong.

### Root Cause (Railway side)
The ClawdBot container starts its wrapper on port 8080, which proxies to an internal process on port 18789, but that internal process crashes immediately. This is likely due to an invalid `MISTRAL_API_KEY` or other configuration issue on Railway. Verify those credentials and redeploy.

### What we will fix (Dashboard side)
Better error reporting so you always know *why* a connection attempt failed.

---

### Changes

**1. Backend function: `openclaw-register` (connect flow)**
- Try multiple health-check paths sequentially: `POST /hooks/wake`, `POST /webhook`, `GET /`
- Capture the actual HTTP status code and error text for each attempt
- Return a `ping_detail` field with diagnostic info (e.g., "Timeout after 10s", "502 Bad Gateway", "Connection refused")
- Still save the connection as "pending" if unreachable, but include the reason

**2. Backend function: `openclaw-status` (test/refresh flow)**
- Same multi-path ping logic as above
- Return detailed diagnostic info so the Test button shows exactly what happened
- Normalize the webhook URL (already done, keep as-is)

**3. Backend function: `openclaw-proxy` (task dispatch)**
- Add URL normalization (prepend `https://` if missing) for consistency
- Improve error messages when the agent can't be reached

**4. Frontend: `OpenClawConnectionCard.tsx`**
- Display the `ping_detail` diagnostic message when status is "pending" or "disconnected"
- Show a yellow/red info box with the specific error (e.g., "Server returned 502 Bad Gateway on /hooks/wake -- your Railway container may be crashing")
- Improve toast messages to include the actual failure reason
- Add a "Disconnect" button to clear saved credentials and start fresh
- Add helper text explaining what the webhook URL should look like

---

### Technical Details

Multi-path ping logic (shared by register and status functions):

```text
Endpoints tried in order:
  1. POST /hooks/wake   (standard OpenClaw path)
  2. POST /webhook      (common alternative)
  3. GET  /             (basic reachability)

For each endpoint:
  - 10-second timeout
  - Record: path, HTTP status, response snippet
  - If any returns 2xx/202: mark "connected", stop
  - If all fail: mark "pending" (register) or "disconnected" (status)
  - Build diagnostic string like:
    "/hooks/wake -> 502 Bad Gateway; /webhook -> 502; / -> 502"
    or "/hooks/wake -> timeout; /webhook -> timeout; / -> timeout"
```

Response structure returned to frontend:

```text
{
  connection: {
    id: "...",
    status: "connected" | "pending" | "disconnected",
    last_ping_at: "...",
    ping_detail: "/hooks/wake -> 502 Bad Gateway; / -> timeout"
  }
}
```

Frontend diagnostic display:

```text
When status is pending or disconnected and ping_detail exists:
  Show an alert box:
    "Connection issue: /hooks/wake -> 502 Bad Gateway"
    "This usually means your server is crashing on startup.
     Check your Railway logs and environment variables."
```

Disconnect button:
- Calls a new simple logic in `openclaw-register` (or a small new function) that deletes the user's row from `openclaw_connections`
- Resets the card to "Not Configured" state

### Files Modified
- `supabase/functions/openclaw-register/index.ts` -- multi-path ping + diagnostics + disconnect support
- `supabase/functions/openclaw-status/index.ts` -- multi-path ping + diagnostics
- `supabase/functions/openclaw-proxy/index.ts` -- URL normalization
- `src/components/dashboard/OpenClawConnectionCard.tsx` -- diagnostic display + disconnect button

