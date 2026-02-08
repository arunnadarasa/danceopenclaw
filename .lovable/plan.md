

## Fix Moltbook Registration and Improve Claim Flow

### Root Cause

The Moltbook API returns credentials nested under an `agent` object:

```text
{
  "agent": {
    "api_key": "moltbook_xxx",
    "claim_url": "https://www.moltbook.com/claim/moltbook_claim_xxx",
    "verification_code": "reef-X4B2"
  }
}
```

Our edge function was looking for `mbData.api_key` instead of `mbData.agent.api_key`. This caused the API key to be `null`, which triggered the database not-null constraint error. The registration succeeded on Moltbook's side, but nothing was saved locally -- leaving you stuck.

### Changes

#### 1. Fix field mapping in `moltbook-proxy/index.ts`

Update the API key and claim URL extraction to check the nested `agent` object first (matching the actual Moltbook API response), with fallbacks for flat fields:

```text
const agentObj = mbData.agent || {};
const apiKey = agentObj.api_key || mbData.api_key || mbData.apiKey;
const claimUrl = agentObj.claim_url || mbData.claim_url || mbData.claimUrl;
const verificationCode = agentObj.verification_code || mbData.verification_code;
```

Also store the `verification_code` in the database so the claim UI can display it.

#### 2. Handle 409 "name already taken" gracefully

When Moltbook returns 409, instead of just showing an error, the edge function will try up to 3 name variants by appending `_1`, `_2`, `_3`. If one succeeds, it stores that variant and returns the new name to the frontend.

If all retries fail, the error is passed back with suggested alternatives.

#### 3. Add `verification_code` column to `moltbook_connections`

Add a nullable text column to store the verification code from Moltbook, so we can show it in the claim UI.

#### 4. Improve claim section in `Moltbook.tsx`

Update the pending-claim UI to:
- Display the verification code the user needs to post on X/Twitter
- Provide a pre-filled "Post to X" button that opens a tweet compose window with the verification code
- Link to the user's Moltbook profile page
- Show the claim URL as a fallback

#### 5. Better error handling on frontend

When registration fails with "name already taken", show the alternative name that was used (if auto-retry succeeded) or suggest the user try a different name.

### Files Changed

| File | Action |
|------|--------|
| `supabase/functions/moltbook-proxy/index.ts` | Fix nested `agent` field mapping, add 409 retry logic, store verification_code |
| `src/pages/Moltbook.tsx` | Improve claim UI with verification code display and "Post to X" button |
| Database migration | Add `verification_code` column to `moltbook_connections` |

### About "PrinceYarjack"

Since that name is already registered on Moltbook but no API key was saved locally, the app will automatically try `PrinceYarjack_1` (then `_2`, `_3`). The original unclaimed profile on Moltbook will remain as-is. This is the only recovery path since Moltbook has no key recovery endpoint.

