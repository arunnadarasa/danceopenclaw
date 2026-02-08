

## Update Story Mainnet Default URL

### Change

Update the default target URL in the Story Mainnet payment card from `https://storyx402.lovable.app/` to `https://wnpqmryjrhuobxxlipti.supabase.co/functions/v1/paid-content`, which provides a proper 402 echo endpoint with on-chain settlement verification.

### File: `src/components/payments/StoryPaymentCard.tsx`

Update two places where the old URL appears:

1. **Default state value** -- change the `useState` initializer for `targetUrl`
2. **Input placeholder** -- update the placeholder text to match

Both currently reference `https://storyx402.lovable.app/` and will be changed to the new endpoint.

### No other files or backend changes required.

