

## Fix Proxy Timeout Mismatch (Cause of 499 Errors)

### Root Cause
The 499 status code means "client closed connection before server responded." This is happening because:

1. The proxy tells OpenClaw `timeoutSeconds: 120` (work for up to 2 minutes)
2. But the edge function itself aborts after 30 seconds (`AbortSignal.timeout(30000)`)
3. OpenClaw starts a 120-second agent run, but the caller hangs up at 30s -- OpenClaw logs this as 499

Additionally, the proxy is missing `wakeMode: "now"`, which the docs say is needed to trigger an immediate agent wake (critical for Railway cold starts).

### Changes

**File: `supabase/functions/openclaw-proxy/index.ts`**

Update the request body sent to `/hooks/agent` (lines 112-118):

| Field | Before | After | Why |
|-------|--------|-------|-----|
| `wakeMode` | missing | `"now"` | Forces immediate agent wake instead of waiting for next heartbeat (per docs, default is `"now"` but being explicit avoids ambiguity) |
| `timeoutSeconds` | `120` | `25` | Must be less than the edge function's 30s abort -- gives 5s margin so OpenClaw finishes before the caller disconnects |

No other files need changes -- the health-check endpoints were already fixed in the previous update, and the `/hooks/agent` schema (message, sessionKey, deliver) matches the docs.

### What This Fixes
- **499 errors**: OpenClaw will finish within 25s, before the edge function's 30s abort fires
- **Cold start hangs**: `wakeMode: "now"` ensures Railway servers wake immediately
- The `/hooks/agent` endpoint returns 202 (accepted), and the existing `openclawRes.ok` check already handles both 200 and 202 correctly

### Files Modified
- `supabase/functions/openclaw-proxy/index.ts` -- add `wakeMode: "now"`, change `timeoutSeconds` from 120 to 25

