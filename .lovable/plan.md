

## Fix Solana Mainnet Payment (403 RPC Error)

### Root Cause

The Solana public mainnet RPC (`https://api.mainnet-beta.solana.com`) blocks or rate-limits browser requests, returning **403 Access Forbidden**. The current flow builds transactions client-side in `SendTokenForm.tsx`, which requires fetching a recent blockhash from this RPC -- and that fails.

### Solution: Move Transaction Building to the Backend

Instead of building Solana transactions in the browser (which needs RPC access), move the transaction building to the `agent-wallet` backend function, which can reliably call the RPC from the server side.

### Current Flow (broken for mainnet)

```text
Browser (SendTokenForm)              Backend (agent-wallet)
  |                                     |
  |-- fetch blockhash from RPC -------> X (403 Forbidden)
  |-- build unsigned transaction        |
  |-- serialize & send to backend ----> |
  |                                     |-- sign via Privy
  |                                     |-- broadcast via RPC
  |                                     |-- return result
```

### New Flow (works for all networks)

```text
Browser (SendTokenForm)              Backend (agent-wallet)
  |                                     |
  |-- send {to, amount, chain} -------> |
  |                                     |-- fetch blockhash from RPC (server-side, no CORS)
  |                                     |-- build unsigned transaction
  |                                     |-- sign via Privy
  |                                     |-- broadcast via RPC
  |                                     |-- return result
```

---

### Changes by File

#### 1. `supabase/functions/agent-wallet/index.ts` -- Backend transaction building

Update the `send_sol` action to accept **either**:
- A pre-built serialized transaction (existing behavior, kept for backward compat)
- Raw parameters (`to`, `amount`, `token_type`) to build the transaction server-side

When raw parameters are provided (no `transaction` field), the edge function will:
1. Fetch the recent blockhash from the Solana RPC
2. Build the appropriate transaction (native SOL transfer or USDC SPL transfer)
3. Sign via Privy
4. Broadcast via RPC

Also add support for an optional `SOLANA_MAINNET_RPC_URL` environment variable so a custom RPC provider (e.g., Helius, QuickNode) can be used instead of the public endpoint.

#### 2. `src/components/wallet/SendTokenForm.tsx` -- Simplify client-side code

For Solana transactions, instead of building the transaction client-side (which requires RPC access), simply send the raw parameters to the backend:
- Remove client-side `buildSolanaTransaction` and `buildSolanaUsdcTransaction` calls for the send flow
- Send `{ chain, to_address, amount, token_type }` directly to `onSendSol`
- Keep the `SOLANA_RPC` and build functions as they may be useful elsewhere, but the send flow won't use them

#### 3. `supabase/functions/execute-x402-payment-solana/index.ts` -- Use configurable RPC

Update to also check for `SOLANA_MAINNET_RPC_URL` env var before falling back to the public endpoint, for consistent behavior.

---

### Technical Details

**New `send_sol` server-side transaction building (in agent-wallet):**

When `body.transaction` is not provided but `body.to_address` and `body.amount` are:

For **native SOL** transfers:
- Use `SystemProgram.transfer` instruction
- Set `feePayer` to the wallet's public key
- Fetch `recentBlockhash` server-side

For **USDC SPL** transfers:
- Compute ATAs for sender and recipient
- Check if recipient ATA exists; if not, add a `createAssociatedTokenAccount` instruction
- Add `transferChecked` instruction with 6 decimals
- (Reuses the same approach currently in `SendTokenForm.tsx`)

**RPC URL resolution:**

```typescript
function getSolanaRpcUrl(chainKey: string): string {
  if (chainKey === "solana") {
    return Deno.env.get("SOLANA_MAINNET_RPC_URL") || "https://api.mainnet-beta.solana.com";
  }
  return "https://api.devnet.solana.com";
}
```

**SendTokenForm simplified Solana flow:**

```typescript
// Before: build tx client-side, send serialized tx
const serializedTx = await buildSolanaTransaction(wallet.address, to, amount, rpcUrl);
await onSendSol(chain, serializedTx, { token_type: "native", to_address: to, amount });

// After: just send params, backend builds tx
await onSendSol(chain, "", { token_type: "native", to_address: to, amount });
```

The `useAgentWallet` hook's `sendSol` function signature stays the same -- the `transaction` field becomes optional/empty and the backend handles building it.

---

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/agent-wallet/index.ts` | Add server-side Solana tx building in `send_sol` when no pre-built tx provided; add configurable RPC URL |
| `src/components/wallet/SendTokenForm.tsx` | Stop building Solana txs client-side; send raw params to backend instead |
| `supabase/functions/execute-x402-payment-solana/index.ts` | Use configurable `SOLANA_MAINNET_RPC_URL` env var |

### No database changes required.
