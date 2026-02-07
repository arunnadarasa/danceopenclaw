

## Fix: CORS Blocking DELETE Requests on openclaw-register

### Problem
The browser's CORS preflight check is rejecting DELETE requests to the `openclaw-register` edge function because the response is missing the `Access-Control-Allow-Methods` header. This prevents the Disconnect button from working entirely -- the request never reaches the server.

### Fix
Add `Access-Control-Allow-Methods` to the CORS headers in the `openclaw-register` edge function to explicitly allow `POST`, `DELETE`, and `OPTIONS` methods.

---

### Changes

**File: `supabase/functions/openclaw-register/index.ts`**

Update the `corsHeaders` object (line 4-8) to include:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};
```

This is a one-line addition. Once deployed, the Disconnect button will work and the console errors will stop.

### Also: Fix the frontend disconnect call

The frontend currently calls the function with `method: "DELETE"` but the Supabase client's `functions.invoke` sends requests as POST by default and the `method` option may not work as expected. We should switch to sending a POST with a `{ action: "disconnect" }` body as a more reliable alternative, and update the edge function to handle both approaches.

**File: `src/components/dashboard/OpenClawConnectionCard.tsx`**

Update the `handleDisconnect` function to send a POST with `{ action: "disconnect" }` body instead of relying on `method: "DELETE"`.

**File: `supabase/functions/openclaw-register/index.ts`**

Add handling for POST requests with `action: "disconnect"` in the body, as a fallback alongside the existing DELETE handler.

