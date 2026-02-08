

## Multi-Feature Update: Shop Cart, Mobile Fixes, and Docs Link

### 1. Shop Page -- Add Shopify Cart System

The Shopify store (`krump-flow-riakh.myshopify.com`) is connected but has **no products yet**. The plan is to wire up real Shopify integration alongside the existing mock display, so when products are added later they appear automatically.

**New files:**

| File | Purpose |
|------|---------|
| `src/lib/shopify.ts` | Storefront API helper (`storefrontApiRequest`), GraphQL queries, cart mutations, types |
| `src/stores/cartStore.ts` | Zustand persistent cart store (items, cartId, checkoutUrl, add/remove/update/clear) |
| `src/hooks/useCartSync.ts` | Hook to sync cart on page visibility change (clears completed orders) |
| `src/hooks/useShopifyProducts.ts` | Hook to fetch products from Storefront API, with fallback to mock data if store is empty |
| `src/components/shop/CartDrawer.tsx` | Slide-out cart drawer (Sheet) with item list, quantity controls, total, and "Checkout with Shopify" button |
| `src/components/shop/ProductCard.tsx` | Individual product card with "Add to Cart" button |

**Modified files:**

| File | Change |
|------|--------|
| `src/pages/Shop.tsx` | Use `useShopifyProducts` hook; show real Shopify products when available, fall back to mock grid; add CartDrawer trigger in header |
| `src/App.tsx` | Add `useCartSync()` call |

**Install:** `zustand` package for cart state management.

**Key behaviors:**
- Products are fetched from Shopify Storefront API on page load
- If the store has no products, the current mock product grid is shown with "Coming Soon" buttons (no cart integration for mocks)
- When real Shopify products exist, product cards get "Add to Cart" buttons that create/update a Shopify cart via the Storefront API
- Cart drawer shows item count badge, line items with quantity controls, and a checkout button that opens Shopify checkout in a new tab with `channel=online_store` parameter
- Cart state persists in localStorage via Zustand

---

### 2. Mobile View Fix -- x402 Payments Page

**Problems visible in the screenshot:**
- Payment cards overflow horizontally (URL inputs are too wide for the viewport)
- The floating chat button overlaps content at the bottom
- Card titles get cut off ("Story Mainnet x402 Payme...")

**Changes to `src/components/payments/EchoTestPaymentCard.tsx`:**
- Change the inner grid from `md:grid-cols-2` to stack all fields vertically on mobile (`grid-cols-1 md:grid-cols-2`)
- Add `break-all` or `truncate` to the Target URL input wrapper
- Make the execute button full-width on mobile (`w-full md:w-auto` instead of `w-full sm:w-auto`)

**Changes to `src/components/payments/StoryPaymentCard.tsx`:**
- Same grid fix: ensure fields stack on small screens
- Truncate the card title on mobile -- wrap the title text with `truncate` or use responsive text sizes
- Make the "On-chain" badge wrap below the title on very small screens

**Changes to `src/components/payments/PaymentHistoryTable.tsx`:**
- On mobile, switch from table to a stacked card layout using a responsive check
- Each payment becomes a compact card showing date, amount, status, and tx hash

**Changes to `src/pages/Payments.tsx`:**
- Add responsive header sizing matching other pages (`text-xl sm:text-2xl`, icon prefix)

---

### 3. Mobile View Fix -- Chat Page

**Problems visible in the screenshot:**
- The conversation sidebar takes up the full width on mobile, leaving the chat area invisible (text "Sele..." is clipped behind it)
- The input bar is hidden behind the floating chat widget
- No way to dismiss the sidebar and see the chat on mobile

**Changes to `src/pages/Chat.tsx`:**
- On mobile (`< md`), the conversation sidebar should default to **closed** instead of open
- When open on mobile, the sidebar should overlay the chat area (absolute positioning with a backdrop) instead of pushing it off-screen
- Tapping a conversation on mobile should auto-close the sidebar to reveal the chat
- The sidebar toggle button should be always visible in the top bar
- Reduce message bubble max-width from `max-w-[75%]` to `max-w-[90%]` on mobile for better readability
- Add `pb-20` or similar bottom padding to avoid the floating chat widget overlapping the input

**Implementation approach:**
- Use `useIsMobile()` hook to detect mobile
- On mobile: sidebar becomes an overlay (`fixed inset-0 z-50`) with backdrop, auto-closes when a conversation is selected
- On desktop: sidebar remains inline as it is now

---

### 4. Add DigitalOcean Marketplace Docs Link

**Changes to `src/pages/Docs.tsx`:**
- Update the `DOCS_URL` constant from the current community tutorials URL to `https://docs.digitalocean.com/products/marketplace/catalog/openclaw/`
- Add a second link alongside the existing one for the marketplace catalog page
- Keep both links: the tutorial link for setup instructions and the new marketplace catalog link for the official listing

**Changes to `src/components/dashboard/OpenClawConnectionCard.tsx`:**
- Add the marketplace catalog link next to the existing "DigitalOcean setup guide" link
- Add a second link: "Marketplace listing" pointing to `https://docs.digitalocean.com/products/marketplace/catalog/openclaw/`

**Changes to `src/pages/Dashboard.tsx`:**
- Add a small info card or link section below the existing grid with a link to the DigitalOcean docs

---

### Summary of All Files

| File | Action |
|------|--------|
| `src/lib/shopify.ts` | Create -- Storefront API helper, queries, cart mutations |
| `src/stores/cartStore.ts` | Create -- Zustand cart store with Shopify sync |
| `src/hooks/useCartSync.ts` | Create -- Cart sync on visibility change |
| `src/hooks/useShopifyProducts.ts` | Create -- Fetch products from Storefront API |
| `src/components/shop/CartDrawer.tsx` | Create -- Cart drawer component |
| `src/components/shop/ProductCard.tsx` | Create -- Product card with Add to Cart |
| `src/pages/Shop.tsx` | Rewrite -- Real Shopify integration with mock fallback |
| `src/App.tsx` | Edit -- Add useCartSync hook |
| `src/components/payments/EchoTestPaymentCard.tsx` | Edit -- Mobile-responsive grid and sizing |
| `src/components/payments/StoryPaymentCard.tsx` | Edit -- Mobile-responsive title and grid |
| `src/components/payments/PaymentHistoryTable.tsx` | Edit -- Mobile card layout |
| `src/pages/Payments.tsx` | Edit -- Responsive header |
| `src/pages/Chat.tsx` | Edit -- Mobile sidebar overlay, auto-close, padding |
| `src/pages/Docs.tsx` | Edit -- Add marketplace catalog URL |
| `src/components/dashboard/OpenClawConnectionCard.tsx` | Edit -- Add marketplace docs link |
| `src/pages/Dashboard.tsx` | Edit -- Add docs link card |

**New dependency:** `zustand` (for cart state management)

