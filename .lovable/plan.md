

## Build Shop, Events, Network (Mock Data) and Settings (Real)

### Overview

Build out the four placeholder pages into fully functional UIs. Shop, Events, and Network will use hardcoded mock data styled consistently with the existing dark-theme dashboard. Settings will be a real, functional page that reads/writes to the `profiles` and `agents` tables.

---

### 1. Shop Page (Mock Data)

A dance merch marketplace layout with mock product cards.

**Mock data**: 8-10 products (e.g., "Breaking Crew Tee", "Popping Gloves", "Dance Battle Hoodie") with prices in USDC, category tags, and placeholder images via `https://placehold.co`.

**Layout**:
- Page header with icon + title/subtitle (matching Wallet page pattern)
- Filter chips for categories (Apparel, Accessories, Music, Gear)
- Responsive product grid (`sm:grid-cols-2 lg:grid-cols-3`)
- Each product card: image, title, price badge, category badge, "Add to Cart" button (disabled with "Coming Soon" tooltip)

---

### 2. Events Page (Mock Data)

A dance events listing with battle, workshop, and cypher event types.

**Mock data**: 6-8 events with titles, dates, locations, event types, and attendee counts.

**Layout**:
- Page header with icon + title/subtitle
- Tab filters: All, Battles, Workshops, Cyphers
- Event cards in a vertical list or 2-column grid
- Each card: date badge (month/day), title, location, event type badge, attendee count, "RSVP" button (disabled, "Coming Soon")

---

### 3. Network Page (Mock Data)

A dancer discovery/social directory page.

**Mock data**: 8-10 dancer profiles with names, dance styles, profile images (placeholder avatars), karma/follower counts, and online status.

**Layout**:
- Page header with icon + title/subtitle
- Search input (non-functional, for visual purposes)
- Responsive grid of profile cards (`sm:grid-cols-2 lg:grid-cols-3`)
- Each card: avatar, display name, dance style badges, karma count, "Connect" button (disabled, "Coming Soon")

---

### 4. Settings Page (Real, Functional)

A real settings page with two sections that read/write to the database.

**Profile Section** (reads/writes `profiles` table):
- Display name input
- Bio textarea
- Dance styles multi-select (same style chips as Onboarding page)
- Wallet address input (read-only display if set)
- Save button that calls `supabase.from("profiles").update(...)` 

**Agent Section** (reads/writes `agents` table):
- Agent name input
- Budget limit input (numeric, USDC)
- Auto-tip toggle (Switch component)
- Agent status display (read-only badge)
- Save button that calls `supabase.from("agents").update(...)`

**Account Section** (read-only info + sign out):
- Email display (from auth context)
- Role display (from `user_roles` table)
- Member since date
- Sign out button

**Data flow**:
- On mount: fetch profile, agent, and role data using `useAuth()` user ID
- Save handlers update the respective tables and show success/error toasts
- Uses existing `supabase` client, `useAuth`, `toast` patterns

---

### Technical Details

**Files created**:

| File | Description |
|------|-------------|
| `src/pages/Shop.tsx` | Rewrite with mock product grid |
| `src/pages/Events.tsx` | Rewrite with mock event listings |
| `src/pages/Network.tsx` | Rewrite with mock dancer profiles |
| `src/pages/Settings.tsx` | Full rewrite with real profile/agent/account settings |

**No new dependencies** -- uses existing UI components (Card, Button, Input, Textarea, Badge, Tabs, Switch, Separator).

**No database changes** -- Settings page uses existing `profiles`, `agents`, and `user_roles` tables which already have the correct RLS policies for user self-service updates.

**No route changes** -- all four routes already exist in `App.tsx`.

**Patterns followed**:
- `space-y-6` page wrapper with icon + heading header (same as Wallet, Payments, Dashboard)
- `font-display` for headings, `text-muted-foreground` for subtitles
- Card components with `CardHeader`/`CardContent` for sections
- Loading state with centered `Loader2` spinner
- Toast notifications for save success/failure
- Responsive grid with `sm:grid-cols-2 lg:grid-cols-3` breakpoints

