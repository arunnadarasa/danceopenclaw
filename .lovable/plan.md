

## Add Transaction History to the Wallet Page

Add a transaction history table below the Send Tokens form on the Wallet page, showing all native token and USDC sends with links to the relevant block explorer for each chain.

---

### Changes Required

#### 1. Database: Create `wallet_transactions` table (migration)

A new table to record every send from the wallet page:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key, auto-generated |
| `agent_id` | UUID | References the agent that owns the wallet |
| `chain` | TEXT | Chain key (e.g. `base_sepolia`, `solana_devnet`, `story_aeneid`) |
| `token_type` | TEXT | `native` or `usdc` |
| `from_address` | TEXT | Sender wallet address |
| `to_address` | TEXT | Recipient address |
| `amount` | TEXT | Human-readable amount sent |
| `tx_hash` | TEXT | Transaction hash (nullable -- set on success) |
| `status` | TEXT | `success` or `failed`, default `success` |
| `error_message` | TEXT | Error details (nullable) |
| `created_at` | TIMESTAMPTZ | Auto-set |

RLS policies:
- SELECT: Users can view transactions for agents they own (via agents table user_id check)
- INSERT: Restricted to service role only (edge function inserts with service client)

#### 2. Edge Function: `supabase/functions/agent-wallet/index.ts`

After each successful `send_native_token`, `send_usdc`, and `send_sol` action, insert a record into `wallet_transactions` using the existing `serviceClient`.

For `send_native_token` (around line 526):
- Extract tx hash from `txResult.data?.hash`
- Convert the hex wei value back to human-readable amount
- Insert with `token_type: "native"`

For `send_usdc` (around line 577):
- Extract tx hash from `txResult.data?.hash`
- Use the original `body.amount` for readable amount
- Insert with `token_type: "usdc"`

For `send_sol` (around line 650):
- Use the `txHash` from broadcast result
- Insert with `token_type: "native"`

#### 3. New Component: `src/components/wallet/TransactionHistory.tsx`

A card component that:
- Accepts `agentId` as a prop
- Queries `wallet_transactions` from the database ordered by `created_at` descending, limited to 20 rows
- Displays a table with columns: Date, Chain, Token, Amount, Recipient, Tx Hash, Status
- The Tx Hash column links to the correct block explorer based on the `chain` value:
  - `base_sepolia` -> `https://sepolia.basescan.org/tx/{hash}`
  - `base` -> `https://basescan.org/tx/{hash}`
  - `solana_devnet` -> `https://explorer.solana.com/tx/{hash}?cluster=devnet`
  - `solana` -> `https://explorer.solana.com/tx/{hash}`
  - `story_aeneid` -> `https://aeneid.storyscan.xyz/tx/{hash}`
  - `story` -> `https://storyscan.xyz/tx/{hash}`
- Shows a loading spinner while fetching
- Shows "No transactions yet" empty state
- Includes a refresh button
- Status is shown as a colored badge (green for success, red for failed)
- Recipient address is truncated with copy-on-click

#### 4. Wallet Page: `src/pages/Wallet.tsx`

- Import and render `TransactionHistory` below the Send Tokens form
- Pass the agent ID (fetched from the agents table via user_id)
- Add state for `agentId` and a useEffect to fetch it on mount
- After a successful send, trigger a refresh of the transaction history

---

### Files Created

| File | Purpose |
|------|---------|
| `src/components/wallet/TransactionHistory.tsx` | Transaction history table component with explorer links |

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/agent-wallet/index.ts` | Record transactions in DB after `send_native_token`, `send_usdc`, `send_sol` |
| `src/pages/Wallet.tsx` | Add agent ID fetching, render TransactionHistory component, trigger refresh after sends |

### Database Migration

Creates `wallet_transactions` table with RLS policies scoped to agent ownership.

