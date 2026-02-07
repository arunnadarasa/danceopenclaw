

## Fix "Invalid webhook URL format" Error

### Root Cause
The backend function (`openclaw-register`) validates the webhook URL using JavaScript's `new URL()` constructor, which requires a full URL with protocol (e.g., `https://`). If a user enters just the domain like `clawdbot-railway-template-production-26e3.up.railway.app`, validation fails with "Invalid webhook URL format".

### Solution
Make both the frontend and backend more forgiving:

1. **Frontend (`OpenClawConnectionCard.tsx`)**: Auto-prepend `https://` to the URL before sending it to the backend if the user didn't include a protocol.
2. **Backend (`openclaw-register/index.ts`)**: Also auto-prepend `https://` before validation as a safety net.
3. **Better placeholder text**: Update the input placeholder to clearly show the expected format including `https://`.

### Changes

**File 1: `src/components/dashboard/OpenClawConnectionCard.tsx`**
- In the `handleConnect` function, normalize the webhook URL before sending: if it doesn't start with `http://` or `https://`, prepend `https://`
- Update the placeholder text to `https://your-server.up.railway.app`

**File 2: `supabase/functions/openclaw-register/index.ts`**
- Before the `new URL()` validation, normalize the incoming `webhookUrl` by prepending `https://` if no protocol is present
- This acts as a safety net in case the frontend normalization is bypassed

**File 3: `supabase/functions/openclaw-status/index.ts`**
- Same normalization for the ping URL, in case an old record was saved without protocol

### Technical Details

URL normalization logic (applied in both frontend and backend):
```typescript
let normalizedUrl = webhookUrl.trim();
if (!/^https?:\/\//i.test(normalizedUrl)) {
  normalizedUrl = `https://${normalizedUrl}`;
}
```

This is a defensive approach: the frontend fixes it before sending, and the backend fixes it again as a safety net.
