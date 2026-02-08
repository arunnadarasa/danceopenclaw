

## Mobile-Friendly Wallet UX Improvements

### Problems Identified (from screenshot)

1. **Balance values clipped** -- "0.000090 ETH" and "19.00 USDC" are cut off at the right edge because the network balance row crams badge + label + balance + faucet links into a single `flex justify-between` row
2. **Faucet links share a row with balance** -- They act as a third flex child, causing overflow on narrow screens
3. **Transaction history table** -- 7-column table forces horizontal scrolling on mobile, making it hard to read
4. **Page header** -- Title + Refresh button could collide on small screens
5. **Card padding** -- Fixed `p-5` padding is too generous on small screens

---

### Changes by File

#### 1. `src/components/wallet/WalletBalanceCard.tsx`

- **Fix balance row layout**: Restructure `renderNetworkBalance` so the faucet links render on their own row below the badge/balance row, instead of being a sibling in the same flex container
- **Prevent text clipping**: Add `min-w-0` to the balance container and `whitespace-nowrap` to balance values so they don't wrap or clip
- **Responsive padding**: Change card padding from `p-5` to `p-3 sm:p-5`
- **Smaller chain icon on mobile**: Reduce icon from `h-10 w-10` to `h-8 w-8 sm:h-10 sm:w-10`

#### 2. `src/components/wallet/TransactionHistory.tsx`

- **Card-based layout on mobile**: Replace the table with a stacked card layout on screens below `md` breakpoint
- Each transaction renders as a compact card showing date, chain, token badge, amount, recipient (copyable), tx hash link, and status badge
- Keep the existing table for `md` and above using `hidden md:block` / `md:hidden`

#### 3. `src/pages/Wallet.tsx`

- **Responsive header**: Wrap the header so title and Refresh button stack on very small screens -- change from `flex items-center justify-between` to include `flex-wrap gap-3`
- **Reduce section spacing on mobile**: Change `space-y-8` to `space-y-5 sm:space-y-8`
- **Send form grid**: Change `lg:grid-cols-2` to full-width on all screens since there's only one form anyway

#### 4. `src/components/wallet/CreateWalletPanel.tsx`

- Minor: ensure the "Create All Wallets" button wraps properly on mobile by adjusting the header flex layout

---

### Technical Details

**WalletBalanceCard -- new balance row structure:**
```text
Before (single flex row, 3 children):
  [badge + label] [balance] [faucet links]  <- overflows on mobile

After (two rows):
  [badge + label]                [balance]
  [faucet icon] [ETH Faucet] [USDC Faucet]  <- own row, only for testnet
```

**TransactionHistory -- mobile card layout:**
```text
Each transaction card on mobile:
  +------------------------------------+
  | Jan 15, 10:30     Base Sepolia     |
  | ETH  0.001         -> 0x68d8...9A7 |
  | Tx: 0xabc1...f4e2          success |
  +------------------------------------+
```

The table stays for desktop (`md:` and up) to keep the existing clean look.

### Files Modified

| File | Change |
|------|--------|
| `src/components/wallet/WalletBalanceCard.tsx` | Fix balance row overflow, move faucets to own row, responsive padding/sizing |
| `src/components/wallet/TransactionHistory.tsx` | Add mobile card layout alongside existing table |
| `src/pages/Wallet.tsx` | Responsive header, tighter mobile spacing |
| `src/components/wallet/CreateWalletPanel.tsx` | Responsive header flex wrap |

### No database or backend changes required.
