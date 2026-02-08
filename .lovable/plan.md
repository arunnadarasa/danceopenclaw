

## Separate Story Mainnet x402 Card

### Problem

The current x402 Payments page has a single "Test x402 Payment" card for all networks. Story Mainnet uses a self-hosted facilitator (`storyx402.lovable.app`) that behaves differently from the echo-test endpoints used by Base and Solana -- it settles payments on-chain rather than echoing them back. Mixing them in one card causes confusion.

Additionally, the success result currently shows empty fields (Amount, Recipient, Network) for Story payments because the response path differs.

### Solution

Split the page into two cards:
1. **Test x402 Payment (Echo Test)** -- for Base and Solana networks that use the `x402.payai.network` echo endpoints
2. **Story Mainnet x402 Payment** -- a dedicated card for Story with a pre-configured URL and a clear note that payments settle on-chain

### Changes to `src/pages/Payments.tsx`

**1. Remove Story from the generic card's network dropdown**

Remove `"story-mainnet"` from `NETWORK_OPTIONS` so the main card only shows Base and Solana:

```
NETWORK_OPTIONS = [
  { value: "testnet",        label: "Base Sepolia (Testnet)" },
  { value: "mainnet",        label: "Base Mainnet" },
  { value: "solana-testnet", label: "Solana Devnet" },
  { value: "solana-mainnet", label: "Solana Mainnet" },
]
```

Also remove `"story-mainnet"` from `DEFAULT_URLS`.

**2. Rename the existing card**

Change the card title/description to clarify it uses echo-test endpoints:
- Title: "Test x402 Payment"
- Description: "Send a request to an echo-test 402-gated URL. Your agent will automatically sign and pay. The payment is echoed back for verification."

**3. Add a new Story Mainnet card**

Insert a dedicated card between the test card and payment history with:
- Title: "Story Mainnet x402 Payment" (with a Globe icon)
- Description: "Test against the self-hosted Story facilitator. Payments settle on-chain via USDC.e."
- Pre-filled URL: `https://storyx402.lovable.app/`
- Pre-filled Network: `story-mainnet` (no dropdown needed)
- Max Amount input (defaulting to 1.00)
- A single "Execute Payment" button
- Its own success/error display area
- Uses the same `useX402Payment` hook but with a second instance (or shared with separate result tracking)

To keep things clean, use a second call to `useX402Payment` or track Story results in separate state variables so the two cards don't overwrite each other's results.

**4. Improve success result for Story**

In the Story card's success display, show the response data (the actual paid content from the facilitator) instead of the echo-test fields that may be empty. Show a note that the payment settled on-chain.

### Layout

```text
+------------------------------------------+
|  x402 Payments                           |
|  Execute and track HTTP 402 payments...  |
+------------------------------------------+

+------------------------------------------+
|  Test x402 Payment                       |
|  Echo-test endpoints for Base & Solana.  |
|                                          |
|  [Target URL]                            |
|  [Network v]  [Max Amount]               |
|  [Execute Payment]                       |
|  [result area]                           |
+------------------------------------------+

+------------------------------------------+
|  Story Mainnet x402 Payment              |
|  Self-hosted facilitator. Payments       |
|  settle on-chain via USDC.e.             |
|                                          |
|  URL: storyx402.lovable.app (editable)   |
|  [Max Amount]                            |
|  [Execute Payment]                       |
|  [result area]                           |
+------------------------------------------+

+------------------------------------------+
|  Payment History                         |
|  (all payments, both types)              |
+------------------------------------------+
```

### Technical Details

- Add a second `useX402Payment()` hook instance for Story: `const { executePayment: executeStoryPayment, loading: storyLoading, error: storyError, lastResult: storyLastResult } = useX402Payment();`
- Story card has its own state for URL (`storyTargetUrl`) and max amount (`storyMaxAmount`)
- Story execute handler calls `executeStoryPayment({ agentId, targetUrl: storyTargetUrl, network: "story-mainnet", maxAmount: storyMaxAmount })`
- Payment history table remains unified -- it shows all payments regardless of network
- The Story success display shows: Amount paid, Network (Story Mainnet), HTTP Status, and the response body (the actual paid content)

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Payments.tsx` | Remove Story from generic card; add dedicated Story Mainnet card with separate state and hook instance |

### No backend or database changes required.

