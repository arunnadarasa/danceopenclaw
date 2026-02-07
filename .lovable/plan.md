

## Plan: Shared Wallets, Remove Ethereum, Fix Balance API

### Problem Summary
1. Ethereum mainnet is listed separately from Base, but users want Base as the EVM mainnet
2. Currently each chain creates a separate Privy wallet, but since EVM addresses are the same across chains, one wallet should be shared between testnet and mainnet
3. The Privy balance API returns `400: "Must provide both chain and asset"` because the `chain` and `asset` query parameters are missing

### Changes

#### 1. Edge Function: `supabase/functions/agent-wallet/index.ts`

**Remove Ethereum from CHAIN_REGISTRY and USDC_CONTRACTS:**
- Delete the `ethereum` entry from `CHAIN_REGISTRY`
- Delete the `ethereum` entry from `USDC_CONTRACTS`
- Remove the `solana: "solana_devnet"` and `story: "story_aeneid"` legacy aliases from `resolveChainKey` (since `solana` and `story` are now valid mainnet keys)

**Introduce wallet grouping so testnet and mainnet share the same Privy wallet:**
- Define a mapping from chain keys to a "wallet group" (e.g., `base_sepolia` and `base` both map to group `evm_base`, `solana_devnet` and `solana` map to `solana`, `story_aeneid` and `story` map to `evm_story`)
- When `create_wallet` is called for a chain, check if any chain in the same group already has a wallet -- if so, reuse that wallet ID and address
- When `create_all_wallets` is called, only create one Privy wallet per group, then assign it to all chains in that group

**Fix balance API calls:**
- Add a `CHAIN_BALANCE_PARAMS` registry mapping each chain key to the correct Privy `chain` and `asset` query parameters:
  - `base_sepolia` -> `chain=base-sepolia`, `asset=eth`
  - `base` -> `chain=base`, `asset=eth`
  - `solana_devnet` -> `chain=solana-devnet`, `asset=sol`
  - `solana` -> `chain=solana`, `asset=sol`
  - `story_aeneid` -> `chain=story-aeneid`, `asset=eth` (or IP native token, depending on Privy support)
  - `story` -> `chain=story`, `asset=eth`
- Update `get_balance` and `get_all_balances` to append `?chain=...&asset=...` query params to the balance URL

#### 2. Frontend: `src/components/wallet/CreateWalletPanel.tsx`

- Remove the `ethereum` entry from `AVAILABLE_CHAINS`

#### 3. Frontend: `src/components/wallet/WalletBalanceCard.tsx`

- Remove `ethereum` entries from `CHAIN_COLORS`, `CHAIN_ICONS`, and `EXPLORER_URLS`

#### 4. Frontend: `src/components/wallet/SendTokenForm.tsx`

- Remove `"ethereum"` from the `USDC_CHAINS` array

### Technical Details

**Wallet Group Mapping (edge function):**

```text
WALLET_GROUPS = {
  base_sepolia: "evm_base",
  base:         "evm_base",
  solana_devnet: "solana",
  solana:        "solana",
  story_aeneid: "evm_story",
  story:         "evm_story",
}
```

When creating a wallet for `base` (mainnet), the function checks if `base_sepolia` (same group) already has a wallet. If yes, it reuses the same `id` and `address`. This works because EVM addresses are identical across networks and Solana addresses work similarly.

**Balance API fix:**

The current code calls:
```
GET /v1/wallets/{id}/balance
```

It needs to call:
```
GET /v1/wallets/{id}/balance?chain=base-sepolia&asset=eth
```

The `privyFetch` helper will be updated to support query parameters, or the URL will be constructed with params inline for balance calls.

