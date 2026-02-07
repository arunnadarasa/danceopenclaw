

## Three-Part Update: Fix Wallet Creation, Unified Wallet UX, and Hackathon README

### Part 1: Fix Privy API Chain Mapping (Edge Function)

**The Problem**

The screenshot shows Privy rejecting wallet creation requests with errors like "received 'base-sepolia'" and "received 'story-aeneid'". The Privy API field is `chain_type` and expects values like `ethereum` or `solana` -- not specific network names.

The current code in the repository (line 217-219) looks correct:
```text
chain_type: chainInfo.chain_type  // sends "ethereum" or "solana"
```

However, the deployed edge function may be out of sync with the source code. The fix is to ensure the edge function is redeployed with the correct mapping.

**Changes to `supabase/functions/agent-wallet/index.ts`**

No code changes needed -- the existing chain registry correctly maps chains to Privy-compatible `chain_type` values (`"ethereum"` for all EVM chains including Story, `"solana"` for Solana). The function will be redeployed to ensure the live version matches the source.

---

### Part 2: Unified Wallet UX (Group by Chain Family)

**The Insight**

Testnet and mainnet wallets in the same chain family share the SAME Privy wallet (same address, same ID). The backend already handles this via `WALLET_GROUPS`:
- Base Sepolia + Base = same EVM wallet
- Solana Devnet + Solana = same Solana wallet
- Story Aeneid + Story = same EVM wallet

Currently the UI shows them as 6 separate cards split into "Testnets" and "Mainnets" sections. This is confusing because they share the same address.

**New Design: Grouped Wallet Cards**

Instead of separate testnet/mainnet sections, show 3 wallet group cards:

```text
+---------------------------+  +---------------------------+  +---------------------------+
|  Base                     |  |  Solana                   |  |  Story                    |
|  0x1234...abcd            |  |  7kRz...9mNp              |  |  0x1234...abcd            |
|                           |  |                           |  |                           |
|  Base Sepolia (testnet)   |  |  Devnet (testnet)         |  |  Aeneid (testnet)         |
|  0.05 ETH                 |  |  2.1 SOL                  |  |  0.00 IP                  |
|                           |  |                           |  |                           |
|  Base (mainnet)           |  |  Solana (mainnet)         |  |  Story (mainnet)          |
|  0.00 ETH                 |  |  0.00 SOL                 |  |  0.00 IP                  |
+---------------------------+  +---------------------------+  +---------------------------+
```

Each card shows:
- The chain family name and icon
- The shared wallet address (with copy + explorer links)
- Both testnet and mainnet balances side by side

**Files Changed**

| File | Change |
|------|--------|
| `src/components/wallet/WalletBalanceCard.tsx` | Redesign to accept a wallet group (testnet + mainnet wallet pair) instead of a single wallet. Show both network balances within one card. |
| `src/components/wallet/CreateWalletPanel.tsx` | Simplify to show 3 chain family buttons (Base, Solana, Story) instead of 6 separate chains. A single "Create All" button creates all 6 wallets at once. |
| `src/pages/Wallet.tsx` | Group wallets by family before rendering. Remove separate testnet/mainnet sections. Show a single grid of 3 grouped cards. |
| `src/hooks/useAgentWallet.ts` | No changes needed -- the hook already supports all operations. |

**CreateWalletPanel Simplification**

Instead of separate "Testnets" and "Mainnets" sections with 6 buttons, show:
- A single "Create All Wallets" button that creates all 6 at once
- Or individual chain family buttons: "Base", "Solana", "Story" -- each creating both testnet and mainnet entries

---

### Part 3: Hackathon Template README

**Replace `README.md` with a polished hackathon submission README covering:**

- Project name and tagline
- What it does (agentic commerce for dance community)
- Architecture overview (Privy wallets, OpenClaw AI agent, x402 payments, multi-chain)
- Tech stack (React, Vite, Tailwind, Lovable Cloud, Privy, OpenClaw)
- Supported chains (Base, Solana, Story -- testnet + mainnet)
- Setup instructions (DigitalOcean 1-Click for OpenClaw, Privy keys, faucets)
- Screenshots / feature list
- Team info placeholder
- License

---

### Part 4: Update Landing Page SetupGuide

The `SetupGuide` component on the landing page still references Railway for OpenClaw deployment. Update Step 03 to reference the DigitalOcean tutorial, matching the dashboard connection card changes already made.

**File: `src/components/landing/SetupGuide.tsx`**
- Change step 03 description from "Deploy OpenClaw on Railway..." to "Deploy OpenClaw on DigitalOcean..."
- Change link URL from `https://docs.openclaw.ai/install/railway` to `https://www.digitalocean.com/community/tutorials/how-to-run-openclaw`
- Change link label from "OpenClaw Docs" to "DigitalOcean Guide"

---

### Summary of All Files

| File | Action |
|------|--------|
| `supabase/functions/agent-wallet/index.ts` | Redeploy (no code changes) |
| `src/components/wallet/WalletBalanceCard.tsx` | Redesign for grouped wallet display |
| `src/components/wallet/CreateWalletPanel.tsx` | Simplify to chain family buttons |
| `src/pages/Wallet.tsx` | Group wallets by family, single grid |
| `src/components/landing/SetupGuide.tsx` | Update OpenClaw step to DigitalOcean |
| `README.md` | Replace with hackathon template |

