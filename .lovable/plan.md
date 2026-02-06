

# Remove Hackathon References + Implement OpenClaw Agent Backbone

This plan covers two things: (1) cleaning up all hackathon-specific language across the app, and (2) building the OpenClaw integration as the AI agent engine powering Dance OpenClaw.

---

## Part 1: Remove Hackathon References

The following files contain hackathon-related wording that will be updated to reflect a personal project:

### Footer (`src/components/landing/Footer.tsx`)
- Line 16: Change `"Built for the global dance community · Hackathon Edition"` to `"Built for the global dance community"`

### SetupGuide (`src/components/landing/SetupGuide.tsx`)
- Line 44: Change `"Hackathon Setup Guide"` heading to just `"Getting Started"` or `"Setup Guide"`
- The section content itself (Privy keys, faucets, deploy steps) stays -- it's useful regardless of context

### FAQ (`src/components/landing/FAQ.tsx`)
- The FAQ about testnet tokens (line 15-16) currently reads like a hackathon demo. Reword to frame it as "the platform currently runs on testnets" rather than implying it's a temporary hackathon setup

### Navbar (`src/components/landing/Navbar.tsx`)  
- Line 25: The "Setup Guide" nav link label stays but points to the renamed section

No other files contain hackathon-specific language -- the Hero, Auth, Onboarding, Explainers, RoleCards, AgentDiagram, X402FlowVisual, and WarningBanner are already clean.

---

## Part 2: OpenClaw Agent Backbone Integration

### Step 1 -- Database Migration

Create two new tables with RLS policies:

**`openclaw_connections`**
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Default gen_random_uuid() |
| user_id | UUID | NOT NULL, references auth.users |
| agent_id | UUID | References agents table |
| webhook_url | TEXT | User's OpenClaw gateway URL |
| webhook_token | TEXT | Shared hook token for auth |
| status | TEXT | connected / disconnected / pending |
| last_ping_at | TIMESTAMPTZ | Last successful health check |
| created_at | TIMESTAMPTZ | Default now() |
| updated_at | TIMESTAMPTZ | Default now() |

**`agent_tasks`**
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Default gen_random_uuid() |
| agent_id | UUID | References agents |
| user_id | UUID | NOT NULL |
| task_type | TEXT | tip, wallet_create, x402_payment, event_create, custom |
| message | TEXT | Prompt sent to OpenClaw |
| session_key | TEXT | For multi-turn conversations |
| status | TEXT | pending / running / completed / failed |
| response | JSONB | OpenClaw's response payload |
| error_message | TEXT | Error details if failed |
| created_at | TIMESTAMPTZ | Default now() |
| completed_at | TIMESTAMPTZ | Null until done |

RLS on both tables: users can only read/write their own records.

### Step 2 -- Edge Functions

Four new edge functions, all with CORS headers and JWT validation in code:

1. **`openclaw-register`** (POST) -- Saves webhook URL + token, pings the instance to verify connectivity, updates `openclaw_connections` status
2. **`openclaw-status`** (GET) -- Looks up connection, pings the webhook URL, returns reachability + last ping time
3. **`openclaw-proxy`** (POST) -- Creates an `agent_tasks` record, sends the task to the user's OpenClaw instance via `POST {webhookUrl}/hooks/agent`, returns task ID for async tracking
4. **`openclaw-webhook-callback`** (POST) -- Callback endpoint for OpenClaw to report task completion; validates token, updates task status and response

### Step 3 -- Dashboard Layout with Sidebar Navigation

Build the main app layout that wraps all authenticated pages:

- **Sidebar**: Dashboard, Shop, Events, Wallet, Network, Docs, Settings
- **Top bar**: User avatar, agent status indicator, wallet balance summary
- Responsive -- collapses to a mobile drawer
- Dark mode throughout

Create placeholder pages for each route: `/dashboard`, `/shop`, `/events`, `/wallet`, `/network`, `/docs`, `/settings`

### Step 4 -- OpenClaw Connection Card (Dashboard)

A card component on the Dashboard page:

- Shows connection status (connected/disconnected/pending) with a coloured indicator
- Input fields for webhook URL and webhook token
- "Test Connection" button calling `openclaw-status`
- "Connect" button calling `openclaw-register`
- Displays last successful ping timestamp
- Link to OpenClaw docs for setup instructions

### Step 5 -- Agent Command Center (Dashboard)

The main interaction panel for the OpenClaw-backed agent:

- Quick action buttons with pre-built prompts:
  - "Create wallet on Base"
  - "Tip top dancer 0.0001 ETH"
  - "Check my balances"
  - "Create a battle event"
- Custom message input for freeform agent commands
- Task history feed showing status (pending / running / completed / failed) with expandable response details
- Enable realtime on `agent_tasks` table for live status updates

### Step 6 -- Update Landing Page Setup Section

Rework the SetupGuide component:
- Rename heading from "Hackathon Setup Guide" to "Getting Started"
- Keep the 3-step flow (Privy keys, fund wallets, deploy)
- Add a 4th step: "Connect OpenClaw" -- install OpenClaw, enable webhooks, paste URL into the dashboard
- Keep the supported networks reference card

---

## Technical Details

### OpenClaw Webhook API (outbound calls from edge functions)

```text
POST {webhookUrl}/hooks/agent
Headers: Authorization: Bearer {token}
Body: {
  "message": "Create a new wallet on Base Sepolia",
  "name": "DanceOpenClaw",
  "sessionKey": "dance:task:{taskId}",
  "deliver": false,
  "timeoutSeconds": 120
}
```

### New Files Created

```text
supabase/functions/openclaw-register/index.ts
supabase/functions/openclaw-status/index.ts
supabase/functions/openclaw-proxy/index.ts
supabase/functions/openclaw-webhook-callback/index.ts
src/components/dashboard/DashboardLayout.tsx
src/components/dashboard/Sidebar.tsx
src/components/dashboard/TopBar.tsx
src/components/dashboard/OpenClawConnectionCard.tsx
src/components/dashboard/AgentTaskPanel.tsx
src/components/dashboard/AgentCard.tsx
src/pages/Shop.tsx (placeholder)
src/pages/Events.tsx (placeholder)
src/pages/Wallet.tsx (placeholder)
src/pages/Network.tsx (placeholder)
src/pages/Docs.tsx (placeholder)
src/pages/Settings.tsx (placeholder)
```

### Files Modified

```text
src/components/landing/Footer.tsx -- remove "Hackathon Edition"
src/components/landing/SetupGuide.tsx -- rename heading, add OpenClaw step
src/components/landing/FAQ.tsx -- reword testnet answer
src/pages/Dashboard.tsx -- replace placeholder with full agent dashboard
src/App.tsx -- add new routes wrapped in DashboardLayout
supabase/config.toml -- add edge function entries with verify_jwt = false
```

### Implementation Sequence

1. Database migration (tables + RLS)
2. Hackathon text cleanup (Footer, SetupGuide, FAQ)
3. Edge functions (register, status, proxy, callback)
4. Dashboard layout + sidebar + placeholder pages + routing
5. OpenClaw connection card + agent command center
6. Enable realtime on agent_tasks

