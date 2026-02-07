

## Add Testnet Faucet Links to Wallet Balance Cards

Add faucet links to each testnet balance row in the wallet cards so users can quickly get test tokens without leaving the dashboard.

### Design

Each testnet balance row in the `WalletBalanceCard` will get small faucet link buttons beneath the balance display. Only testnet rows show faucet links -- mainnet rows have no faucets.

The layout within each testnet row will look like:

```text
+----------------------------------------------------+
|  [testnet]  Base Sepolia         0.050000 ETH      |
|                                  10.50 USDC        |
|                          ETH Faucet | USDC Faucet  |
+----------------------------------------------------+
```

### Faucet Data

A `TESTNET_FAUCETS` map keyed by chain will store the links:

| Chain Key | Token | Faucet Name | URL |
|-----------|-------|-------------|-----|
| `base_sepolia` | ETH | Coinbase Faucet | https://portal.cdp.coinbase.com/products/faucet |
| `base_sepolia` | USDC | Circle Faucet | https://faucet.circle.com/ |
| `solana_devnet` | SOL | Solana Faucet | https://faucet.solana.com/ |
| `solana_devnet` | USDC | Circle Faucet | https://faucet.circle.com/ |
| `story_aeneid` | IP | Story Faucet | https://faucet.story.foundation/ |

Story testnet has no USDC.e faucet, so only one link is shown for that chain.

### File Changed

**`src/components/wallet/WalletBalanceCard.tsx`**

- Add a `TESTNET_FAUCETS` constant mapping chain keys to arrays of `{ token, label, url }` objects
- Inside the `renderNetworkBalance` function, after the balance display section, render faucet links only when `wallet.network === "testnet"` and faucet entries exist for that chain
- Each faucet link renders as a small inline anchor with an external-link icon, styled as subtle text links (`text-xs text-primary hover:underline`)
- Import `Droplets` icon from lucide-react for the faucet link prefix (or reuse `ExternalLink`)

No other files need changes -- the faucet links are purely a display addition inside the existing balance card component.
