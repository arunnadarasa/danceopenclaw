

## Align Health Checks with OpenClaw Webhook API

### What's Already Working
The proxy (`openclaw-proxy`) is correctly calling `POST /hooks/agent` with the documented schema. No changes needed there.

### What's Broken
The health-check functions (`openclaw-status` and `openclaw-register`) try an invalid `POST /webhook` endpoint that doesn't exist in OpenClaw, causing 405 errors and false "disconnected" status.

### Changes

**1. `supabase/functions/openclaw-status/index.ts`** -- Fix `multiPathPing` endpoints

Replace the endpoints array:

| Before | After |
|--------|-------|
| `POST /hooks/wake` with `{text: "Dance OpenClaw health check", mode: "now"}` | `POST /hooks/wake` with `{text: "Dance OpenClaw health check", mode: "now"}` (unchanged) |
| `POST /webhook` with `{text: "ping"}` | `POST /hooks/agent` with `{message: "health check", sessionKey: "dance:healthcheck", deliver: false, wakeMode: "now"}` |
| `GET /` | `GET /` (unchanged) |

Per the docs, `/hooks/wake` returns 200 and `/hooks/agent` returns 202. The existing `res.ok || res.status === 202` check handles both correctly.

**2. `supabase/functions/openclaw-register/index.ts`** -- Same fix

This file has an identical copy of the `multiPathPing` function. Apply the same endpoint replacement.

### Why This Fixes Things
- The 405 errors were caused by hitting `/webhook` which doesn't exist in OpenClaw
- The `/hooks/agent` endpoint with `deliver: false` is a safe health check -- it runs an agent turn without delivering to any messaging channel
- The `sessionKey: "dance:healthcheck"` keeps health-check sessions isolated from real user conversations

### Files Modified
- `supabase/functions/openclaw-status/index.ts` -- update `multiPathPing` endpoints
- `supabase/functions/openclaw-register/index.ts` -- update `multiPathPing` endpoints
