

## Add Payment History to Story Mainnet Card

### What Changes

Add a compact payment history section inside the Story Mainnet x402 Payment card that shows only Story Mainnet transactions, making it easy to see past on-chain payments without scrolling to the shared table.

### Implementation

#### File: `src/components/payments/StoryPaymentCard.tsx`

1. **Accept payments data as a prop** -- filter Story payments from the parent's existing `payments` array rather than fetching separately (avoids duplicate queries).

2. **Add a `payments` and `loading` prop** to `StoryPaymentCardProps`:
   - `payments: PaymentRecord[]` (already filtered to `story-mainnet` by the parent)
   - `loadingHistory: boolean`

3. **Render a compact history table** below the success/error result area inside the card. It will show:
   - Date
   - Amount (USDC.e)
   - Status badge (reusing the same badge logic from `PaymentHistoryTable`)
   - Tx Hash (linked to StoryScan explorer)

   This keeps it compact since Target URL and Network are redundant (always Story Mainnet / the URL shown above).

#### File: `src/pages/Payments.tsx`

4. **Filter and pass Story payments** to the `StoryPaymentCard`:
   ```typescript
   const storyPayments = payments.filter(p =>
     p.network === "story-mainnet" || p.network === "story"
   );
   ```
   Pass `payments={storyPayments}` and `loadingHistory={loadingHistory}` as props.

5. The shared Payment History table at the bottom continues showing all payments (including Story), so nothing is lost.

### Layout Inside the Story Card

```
+----------------------------------------------+
|  Story Mainnet x402 Payment         [On-chain]|
|  Self-hosted Story facilitator...             |
|                                               |
|  [Target URL]                                 |
|  [Network: Story Mainnet]  [Max Amount]       |
|  [Execute Payment]                            |
|  [success/error result]                       |
|                                               |
|  --- Recent Story Payments ---                |
|  Date       | Amount    | Status  | Tx Hash   |
|  02/08/2026 | 0.0001   | Success | 0xabc...  |
|  02/07/2026 | 0.0500   | Success | 0xdef...  |
+----------------------------------------------+
```

### Files Modified

| File | Change |
|------|--------|
| `src/components/payments/StoryPaymentCard.tsx` | Add `payments` and `loadingHistory` props; render compact history table |
| `src/pages/Payments.tsx` | Filter Story payments and pass them to `StoryPaymentCard` |

### No backend or database changes required.

