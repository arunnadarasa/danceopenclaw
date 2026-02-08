

## Remove Duplicate "Recent Story Payments" Table

### Problem

The Story Payment card contains an embedded "Recent Story Payments" table that duplicates the same data already shown in the "Payment History" table directly below it on the Payments page.

### Change

**File: `src/components/payments/StoryPaymentCard.tsx`**

Remove lines 182-233 (the entire "Compact Story Payment History" section) from the card. This is the block starting with `{/* Compact Story Payment History */}` and ending with the closing `</div>` before `</CardContent>`.

The `payments` and `loadingHistory` props can also be removed from the component since they are no longer used, along with the related imports (`Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`) and the `statusBadge` helper function that was only used in that section.

**File: `src/pages/Payments.tsx`**

Simplify the `StoryPaymentCard` usage by removing the now-unnecessary `payments` and `loadingHistory` props.

No other files need to change. The global "Payment History" table already shows all payments including Story ones.

