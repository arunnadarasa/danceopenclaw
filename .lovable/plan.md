

## Add x402 Payment Support

Integrate the x402 HTTP payment protocol so your agent can pay for gated content using USDC across Base, Story, and Solana. This adds two new backend functions, a database table for payment history, a frontend hook, and a new Payments page in the dashboard.

---

### Architecture Overview

The x402 flow works like this:
1. Agent makes an HTTP request to a target URL
2. Server responds with HTTP 402 + payment requirements (amount, recipient, network)
3. Agent signs a USDC payment (EIP-3009 for EVM chains, SPL transferChecked for Solana)
4. Agent retries the request with a `PAYMENT-SIGNATURE` header containing the signed payment
5. The facilitator settles the payment on-chain and returns the content

---

### What Gets Created

#### 1. Database: `agent_payments` table (migration)

A new table to track all x402 payment history:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `agent_id` | UUID | References agents table |
| `wallet_address` | TEXT | Wallet that paid |
| `recipient_address` | TEXT | Who received payment |
| `amount` | TEXT | Human-readable USDC amount |
| `network` | TEXT | Chain network used |
| `target_url` | TEXT | URL that required payment |
| `tx_hash` | TEXT | On-chain transaction hash (nullable) |
| `status` | TEXT | pending / success / failed |
| `error_message` | TEXT | Error details (nullable) |
| `created_at` | TIMESTAMPTZ | Auto-set |

RLS policies: Users can INSERT and SELECT their own payments (matched via agent_id ownership).

#### 2. Edge Function: `execute-x402-payment` (EVM -- Base + Story)

Handles x402 payments on EVM chains using EIP-3009 `TransferWithAuthorization` signatures via Privy.

Key adaptations from the reference:
- **No `agent_wallets` table** -- instead reads from `agents.config.privy_wallets` JSONB (matching this project's architecture)
- Accepts `agentId`, `targetUrl`, `network` (testnet/mainnet/story-mainnet), `maxAmount`, optional `method` and `body`
- Supports both x402 v1 and v2 payload formats
- Signs EIP-712 typed data via Privy server wallet RPC
- Records payment in `agent_payments` table
- Uses correct EIP-712 domain names per chain:
  - Base Sepolia: `"USDC"`, version `"2"`
  - Base Mainnet: `"USD Coin"`, version `"2"`
  - Story Mainnet: `"Bridged USDC (Stargate)"`, version `"2"`

#### 3. Edge Function: `execute-x402-payment-solana` (Solana)

Handles x402 payments on Solana using SPL Token `transferChecked` instruction.

Key differences from EVM:
- Builds a Solana transaction with exactly 3 instructions (computeUnitLimit, computeUnitPrice, transferChecked)
- Uses the facilitator's public key (from `extra.feePayer` in 402 response) as fee payer
- Signs via Privy `signTransaction` (partial sign only -- facilitator co-signs and submits)
- Reads wallet from `agents.config.privy_wallets` where `chain_type === "solana"`

#### 4. Frontend Hook: `src/hooks/useX402Payment.ts`

A React hook wrapping both edge functions:

```text
const { executePayment, loading, error, lastResult } = useX402Payment();

// EVM payment
await executePayment({
  agentId: "...",
  targetUrl: "https://example.com/paid-content",
  network: "testnet",
  maxAmount: "1.00",
});

// Solana payment
await executePayment({
  agentId: "...",
  targetUrl: "https://x402.org/api/weather",
  network: "solana-testnet",
  maxAmount: "1.00",
});
```

The hook automatically routes to the correct edge function based on the network parameter.

#### 5. Frontend Page: `src/pages/Payments.tsx`

A new dashboard page with two sections:

**Section A -- Test x402 Payment**
- Input field for target URL (pre-filled with a test endpoint)
- Network selector (Base Sepolia, Base Mainnet, Story Mainnet, Solana Devnet, Solana Mainnet)
- Max amount input (default $1.00)
- "Execute Payment" button
- Result display showing: status, payment amount, response data, tx hash

**Section B -- Payment History**
- Table showing recent payments from `agent_payments`
- Columns: date, target URL, amount, network, status, tx hash (linked to explorer)

#### 6. Navigation: Add "Payments" to sidebar

Add a new nav item in the sidebar between "Wallet" and "Network":
- Label: "Payments"
- Icon: `CreditCard` from lucide-react
- Route: `/payments`

#### 7. Route: Register `/payments` in App.tsx

Add the new route inside the protected dashboard layout.

---

### Files Created

| File | Purpose |
|------|---------|
| `supabase/functions/execute-x402-payment/index.ts` | EVM x402 payment client (Base + Story) |
| `supabase/functions/execute-x402-payment-solana/index.ts` | Solana x402 payment client |
| `src/hooks/useX402Payment.ts` | Frontend hook for x402 payments |
| `src/pages/Payments.tsx` | Payments dashboard page |

### Files Modified

| File | Change |
|------|--------|
| `supabase/config.toml` | Add function entries for both new edge functions |
| `src/App.tsx` | Add `/payments` route |
| `src/components/dashboard/Sidebar.tsx` | Add Payments nav item |

### Database Migration

Creates `agent_payments` table with RLS policies for user-scoped access.

### Secrets Required

Both `PRIVY_APP_ID` and `PRIVY_APP_SECRET` are already configured -- no new secrets needed.

