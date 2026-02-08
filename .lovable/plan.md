
## Replace Story x402 with Self-Hosted Test Seller

### Problem

The current Story Mainnet x402 Payment card points to `storyx402.lovable.app/` which returns HTTP 200 (not 402), so no payment is ever executed. The working implementation from the other project uses a self-hosted `x402-test-seller` edge function that properly returns 402 and settles payments on-chain via a Story facilitator.

### What Changes

1. **Create `x402-test-seller` edge function** -- a self-hosted paid content endpoint that:
   - Returns 402 with proper x402 payment requirements when no payment header is present
   - When a `PAYMENT-SIGNATURE` header arrives, forwards to the Story facilitator for on-chain settlement
   - Returns premium content + `X-PAYMENT-RESPONSE` header with the tx hash after settlement

2. **Update `StoryPaymentCard.tsx`** -- point to the self-hosted `x402-test-seller` endpoint instead of `storyx402.lovable.app`, and default to a micro-USDC amount (0.000001) to minimize test costs since these are real on-chain payments

3. **Update `payment-constants.ts`** -- fix Story explorer URL to use `storyscan.io` (matching the working project)

4. **Update `supabase/config.toml`** -- add the new `x402-test-seller` function config

### Architecture

```text
StoryPaymentCard "Execute Payment"
    |
    v
execute-x402-payment (existing, already works for Story)
    |  1. Hits x402-test-seller -> gets 402
    |  2. Signs EIP-3009 via Privy
    |  3. Re-sends with PAYMENT-SIGNATURE header
    v
x402-test-seller (NEW self-hosted endpoint)
    |  1. Decodes payment signature
    |  2. Forwards to Story facilitator for settlement
    |  3. Returns 200 + X-PAYMENT-RESPONSE with txHash
    v
Story facilitator settles on-chain
    (https://wnpqmryjrhuobxxlipti.supabase.co/functions/v1/x402-settle)
```

### New Edge Function: `x402-test-seller/index.ts`

Handles two scenarios:

**No payment header (initial request):**
- Reads `network` and `price` from query params
- Returns HTTP 402 with JSON body containing `accepts` array with:
  - `scheme: "exact"`
  - `network: "story"`
  - `asset: "0xF1815bd50389c46847f0Bda824eC8da914045D14"` (USDC.e on Story)
  - `payTo`: a configured recipient address (from the wallet config)
  - `amount` in micro-units (e.g. 1 for 0.000001 USDC)
  - `extra`: domain name/version for EIP-712 signing
- Sets `x402Version: 2`

**With `PAYMENT-SIGNATURE` header:**
- Decodes base64 payload
- Extracts authorization fields (from, to, value, nonce, validAfter, validBefore, signature)
- Sends flat settlement body to the Story facilitator at `https://wnpqmryjrhuobxxlipti.supabase.co/functions/v1/x402-settle`
- If settlement succeeds, returns HTTP 200 with premium content and `X-PAYMENT-RESPONSE` header containing the txHash

### Frontend Changes

**`StoryPaymentCard.tsx`:**
- Default URL changes from `https://storyx402.lovable.app/` to this project's own `x402-test-seller` endpoint (constructed using `VITE_SUPABASE_URL`)
- Default max amount changes from `1.00` to `0.000001` (1 micro-USDC) since these are real payments
- Add a warning note that Story payments settle on-chain and are NOT refunded

**`payment-constants.ts`:**
- Change Story explorer URL from `storyscan.xyz` to `storyscan.io`

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/x402-test-seller/index.ts` | Create | Self-hosted test seller endpoint |
| `supabase/config.toml` | Edit | Add `x402-test-seller` function config |
| `src/components/payments/StoryPaymentCard.tsx` | Edit | Update default URL and amount |
| `src/components/payments/payment-constants.ts` | Edit | Fix Story explorer URL |

### No database changes required.
