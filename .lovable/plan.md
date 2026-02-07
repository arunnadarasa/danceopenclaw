

## Fix Wallet Balances: Replace Privy Balance API with Direct Blockchain RPC Calls

### The Problem

The wallet page shows "Error" on balance fetches because the edge function currently uses **Privy's balance API**, which:
1. Uses incorrect chain identifiers (hyphens like `base-sepolia` instead of what Privy expects)
2. Does not support Story chain at all
3. Is the wrong tool for the job -- Privy is for wallet creation and transaction signing, not balance checking

The Send Tokens dropdown also filters to EVM-only wallets, hiding Solana entirely.

### The Solution

Replace the Privy-based balance fetching with **direct blockchain RPC calls** -- the same proven approach used by the other working Lovable app. This queries each chain's native RPC endpoint directly, which works for ALL chains including Story.

---

### Changes

#### 1. Edge Function: `supabase/functions/agent-wallet/index.ts`

**Remove:**
- The entire `CHAIN_BALANCE_PARAMS` mapping (lines 44-53) -- no longer needed
- All Privy `get_balance` / `get_all_balances` logic that calls Privy's balance endpoint

**Add: RPC Network Config**

```text
const ETH_NETWORKS = {
  base_sepolia: { rpcUrl: "https://sepolia.base.org", usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" },
  base:         { rpcUrl: "https://mainnet.base.org", usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
};

const SOLANA_NETWORKS = {
  solana_devnet: { rpcUrl: "https://api.devnet.solana.com", usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" },
  solana:        { rpcUrl: "https://api.mainnet-beta.solana.com", usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
};

const STORY_NETWORKS = {
  story_aeneid: { rpcUrl: "https://aeneid.storyrpc.io", usdceAddress: null },
  story:        { rpcUrl: "https://mainnet.storyrpc.io", usdceAddress: "0xF1815bd50389c46847f0Bda824eC8da914045D14" },
};
```

**Add: Direct RPC balance helper functions** (adapted from the reference script):
- `getEvmNativeBalance(address, rpcUrl)` -- calls `eth_getBalance`, converts from hex wei to human-readable
- `getEvmErc20Balance(address, rpcUrl, contractAddress)` -- calls `eth_call` with `balanceOf(0x70a08231)`, converts from 6-decimal raw to human-readable
- `getSolanaNativeBalance(address, rpcUrl)` -- calls `getBalance`, converts from lamports
- `getSolanaTokenBalance(address, rpcUrl, mint)` -- calls `getTokenAccountsByOwner`, parses SPL token balance

**Rewrite: `get_balance` action**
- Look up the chain key in the appropriate network config
- Call the correct RPC function based on chain type (EVM vs Solana)
- Return `native_balance` and `usdc_balance` fields

**Rewrite: `get_all_balances` action**
- Loop through all wallets
- For each wallet, determine chain type and call the right RPC functions
- Return structured balance data with `native_balance` and optionally `usdc_balance`
- Gracefully catch per-chain errors without failing the entire request

The response shape will be:
```text
{
  balances: {
    base_sepolia: {
      address: "0x...",
      label: "Base Sepolia",
      network: "testnet",
      native_balance: "0.050000",
      usdc_balance: "10.50"
    },
    solana_devnet: {
      address: "7kRz...",
      label: "Solana Devnet",
      network: "testnet",
      native_balance: "2.100000",
      usdc_balance: "0"
    },
    story_aeneid: {
      address: "0x...",
      label: "Story Aeneid",
      network: "testnet",
      native_balance: "0.000000",
      usdc_balance: "0"
    }
  }
}
```

#### 2. Frontend Hook: `src/hooks/useAgentWallet.ts`

Update the `BalanceInfo` interface to include the new `usdc_balance` field returned by the edge function:
```text
export interface BalanceInfo {
  address: string;
  label: string;
  network: string;
  native_balance?: string;
  usdc_balance?: string;
  error?: string;
}
```

Remove the `token_balances` array since USDC balance is now a flat field.

#### 3. Wallet Balance Card: `src/components/wallet/WalletBalanceCard.tsx`

Update the balance display to:
- Show `native_balance` with the correct unit (ETH for Base, SOL for Solana, IP for Story)
- Show `usdc_balance` below when available and non-zero
- Remove the `token_balances` array rendering, replaced by the flat `usdc_balance` field
- Add chain-specific native token labels:
  - Base chains: "ETH"
  - Solana chains: "SOL"  
  - Story chains: "IP"

#### 4. Send Token Form: `src/components/wallet/SendTokenForm.tsx`

- Remove the `evmWallets` filter (line 34) -- show ALL wallets including Solana and Story
- Update the native token label logic to show "SOL" for Solana, "IP" for Story, "ETH" for Base
- For Solana sends, convert the amount to lamports and use the existing `sendSol` path (note: this requires a serialized transaction which is more complex -- for now, show a note that Solana sends require a pre-built transaction, or implement a simple SOL transfer builder)

---

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/agent-wallet/index.ts` | Replace Privy balance API with direct blockchain RPC calls for all 6 chains |
| `src/hooks/useAgentWallet.ts` | Update `BalanceInfo` interface to match new response shape |
| `src/components/wallet/WalletBalanceCard.tsx` | Show native token with correct unit label + USDC balance |
| `src/components/wallet/SendTokenForm.tsx` | Show all wallets in dropdown (not just EVM), correct token labels |

