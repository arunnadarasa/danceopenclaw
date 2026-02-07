

## Fix OpenClaw Connection Error Handling

### Root Cause
The edge functions themselves work correctly, but two issues prevent a smooth experience:

1. **Generic error messages**: When a backend function returns an error (like "Invalid webhook URL" or "Unauthorized"), the frontend only shows "Edge Function returned a non-2xx status code" instead of the actual helpful message. This is because the code doesn't extract the real error from the function response.

2. **Unreliable authentication method**: The backend functions use a newer, less-tested method (`getClaims`) to verify your identity. Switching to the standard, well-tested method (`getUser`) makes authentication more reliable.

### What Will Change

**Better error messages** -- When something goes wrong connecting your OpenClaw agent, you'll see the actual reason (e.g., "Invalid webhook URL format" or "webhookUrl and webhookToken are required") instead of a generic technical error.

**More reliable sign-in verification** -- All three OpenClaw backend functions will use the standard authentication method, reducing the chance of random "Unauthorized" errors.

**Improved Agent Task Panel** -- The task submission will also show proper error messages when something fails.

---

### Technical Details

#### 1. Frontend: Fix error extraction in `OpenClawConnectionCard.tsx`

Update `handleConnect` and `fetchStatus` to extract the actual error body from `error.context`:

```typescript
// Before
const { data, error } = await supabase.functions.invoke("openclaw-register", { ... });
if (error) throw error;  // throws generic "Edge Function returned a non-2xx status code"

// After
const { data, error } = await supabase.functions.invoke("openclaw-register", { ... });
if (error) {
  let msg = error.message;
  try {
    const body = await error.context?.json?.();
    if (body?.error) msg = body.error;
  } catch {}
  throw new Error(msg);
}
```

#### 2. Frontend: Fix error extraction in `AgentTaskPanel.tsx`

Same pattern for the `sendTask` function calling `openclaw-proxy`.

#### 3. Edge Functions: Replace `getClaims` with `getUser` in all three functions

Files affected:
- `supabase/functions/openclaw-register/index.ts`
- `supabase/functions/openclaw-status/index.ts`
- `supabase/functions/openclaw-proxy/index.ts`

Replace:
```typescript
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) { ... }
const userId = claimsData.claims.sub;
```

With:
```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) { ... }
const userId = user.id;
```

This is the standard, well-documented method that works reliably across all versions.

#### 4. Frontend: Fix error extraction in `useAgentWallet.ts`

Update the `callWallet` helper to also extract real error messages from function responses.

