

## Display Friendly Network Names in x402 Payments

### Problem

The payment success result and payment history table currently show raw network identifiers like "mainnet", "testnet", "story-mainnet" instead of human-readable names like "Base Mainnet", "Base Sepolia (Testnet)".

### Solution

Add a network display name mapping and use it in two places:

1. **Payment success result** (line 223) -- where it says `Network: mainnet`
2. **Payment history table** (line 269) -- the Network column

### File: `src/pages/Payments.tsx`

**1. Add a display name map** (near the existing constants at the top):

```typescript
const NETWORK_LABELS: Record<string, string> = {
  testnet: "Base Sepolia",
  mainnet: "Base Mainnet",
  "story-mainnet": "Story Mainnet",
  "solana-testnet": "Solana Devnet",
  "solana-mainnet": "Solana Mainnet",
  // Values stored in DB by edge functions
  "base-sepolia": "Base Sepolia",
  base: "Base Mainnet",
  story: "Story Mainnet",
  "solana-devnet": "Solana Devnet",
  solana: "Solana Mainnet",
};
```

This covers both the values used locally (e.g. `testnet`) and the values stored in the database by the edge functions (e.g. `base-sepolia`, `base`).

**2. Update the success result display** to use the map:

```typescript
<p><span className="font-medium text-foreground">Network:</span> {NETWORK_LABELS[lastResult.network || ""] || lastResult.network}</p>
```

**3. Update the payment history table** to use the map:

```typescript
<TableCell className="text-xs">{NETWORK_LABELS[p.network] || p.network}</TableCell>
```

### No backend or database changes required.

