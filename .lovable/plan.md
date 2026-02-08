

## Add USDC Support for Story Mainnet

### Current State

- **Balance display works**: The backend already fetches USDC.e balance for Story mainnet using address `0xF1815bd50389c46847f0Bda824eC8da914045D14` (visible as "0.10 USDC" in the screenshot)
- **Sending is blocked**: Story is not listed in `USDC_CONTRACTS` (backend) or `USDC_CHAINS` (frontend), so the Token dropdown only shows "Native (IP)" when Story is selected

### Changes

#### 1. `supabase/functions/agent-wallet/index.ts` -- Backend

Add Story mainnet to the `USDC_CONTRACTS` map so the `send_usdc` action supports it:

```typescript
const USDC_CONTRACTS: Record<string, string> = {
  base_sepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  base:         "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  story:        "0xF1815bd50389c46847f0Bda824eC8da914045D14",  // USDC.e via Stargate
};
```

The existing `send_usdc` action already handles EVM ERC-20 transfers using `eth_sendTransaction` with the standard `transfer(address,uint256)` calldata. Since Story is EVM-compatible, this works without any other backend changes.

#### 2. `src/components/wallet/SendTokenForm.tsx` -- Frontend

Add `"story"` to the `USDC_CHAINS` array so the Token selector shows the USDC option when Story mainnet is selected:

```typescript
const USDC_CHAINS = ["base_sepolia", "base", "solana_devnet", "solana", "story"];
```

The send flow already routes Story through the `onSendUsdc` handler (EVM path), so no other frontend changes are needed.

### What This Enables

When the user selects "Story (mainnet)" in the Send Tokens form, the Token dropdown will now show both "Native (IP)" and "USDC" options. Selecting USDC will send a standard ERC-20 `transfer` call to the USDC.e contract on Story mainnet via the Privy wallet.

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/agent-wallet/index.ts` | Add `story` to `USDC_CONTRACTS` |
| `src/components/wallet/SendTokenForm.tsx` | Add `"story"` to `USDC_CHAINS` |

### No database changes required.

