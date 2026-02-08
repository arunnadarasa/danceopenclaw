

## Add Moltbook Tab -- Agentic Social Marketing for Dance OpenClaw

### Overview

Add a new "Moltbook" page accessible from the sidebar where users can register their AI agent on Moltbook (a social network for AI agents), manage the connection, browse the feed, and create posts. This enables agents to promote as fan, dancer, or event promoter on the platform for agentic marketing.

### What is Moltbook?

Moltbook is a social network for AI agents -- like Reddit but for bots. Agents can post, comment, upvote, create communities (called "submolts"), and follow other agents. Each agent registers with a name/description, receives an API key, and needs their human owner to claim them via a tweet verification.

### Architecture

The integration follows the same pattern as the existing OpenClaw connection:

1. **Database table** stores the Moltbook credentials per agent
2. **Backend function** proxies all Moltbook API calls (keeps the API key server-side)
3. **Frontend page** provides registration, feed browsing, and posting UI

```text
User UI (Moltbook Page)
    |
    v
Backend Function (moltbook-proxy)
    |
    v
Moltbook API (www.moltbook.com/api/v1)
```

### Database Changes

**New table: `moltbook_connections`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | NOT NULL, references auth user |
| agent_id | uuid | FK to agents.id |
| moltbook_api_key | text | NOT NULL, the `moltbook_xxx` key |
| moltbook_agent_name | text | NOT NULL |
| claim_url | text | nullable |
| claim_status | text | default 'pending_claim' |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

RLS policies:
- Users can only SELECT/INSERT/UPDATE/DELETE their own rows (where `user_id = auth.uid()`)

### Backend Function: `moltbook-proxy`

A single edge function that handles all Moltbook API interactions:

**Actions:**

| Action | What it does |
|--------|-------------|
| `register` | Calls `POST /agents/register`, stores credentials in DB, returns claim URL |
| `status` | Calls `GET /agents/status`, updates claim_status in DB |
| `profile` | Calls `GET /agents/me` |
| `feed` | Calls `GET /posts?sort=X&limit=Y` |
| `post` | Calls `POST /posts` with title/content/submolt |
| `submolts` | Calls `GET /submolts` |
| `disconnect` | Deletes the moltbook_connections row |

The function:
- Authenticates the user via JWT
- Looks up the user's agent and moltbook_connections row
- For `register`: no existing connection needed; creates one
- For all other actions: reads the stored API key and forwards to `https://www.moltbook.com/api/v1/...`
- Always uses `www.moltbook.com` (per Moltbook docs, without `www` strips the auth header)

### Frontend: New Page `src/pages/Moltbook.tsx`

The page has two states:

**State 1: Not Registered**
- Card with Moltbook logo/description explaining what it is
- Agent name input (pre-filled from agent name in DB)
- Agent description input (pre-filled based on user's role: dancer/fan/organiser)
- "Register on Moltbook" button
- After registration: shows the claim URL with a link for the user to verify via tweet

**State 2: Registered (with tabs)**
- Connection status badge (pending_claim / claimed)
- Claim URL link (if still pending)
- Three tabs:
  - **Feed**: Shows latest posts from Moltbook with title, author, upvotes, submolt
  - **Post**: Form to create a new post (submolt selector, title, content)
  - **Profile**: Shows the agent's Moltbook profile (name, karma, followers)
- Disconnect button to remove the connection

### Sidebar and Routing Changes

**Sidebar (`src/components/dashboard/Sidebar.tsx`)**:
- Add a new nav item: `{ to: "/moltbook", label: "Moltbook", icon: MessageSquare }` (using `MessageSquare` from lucide-react, which fits a social/forum concept)
- Place it between "Network" and "Docs"

**App.tsx**:
- Import the new `Moltbook` page
- Add `<Route path="/moltbook" element={<MoltbookPage />} />` inside the protected dashboard routes

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | `moltbook_connections` table + RLS policies |
| `supabase/functions/moltbook-proxy/index.ts` | Create | Edge function proxying Moltbook API calls |
| `src/pages/Moltbook.tsx` | Create | Main Moltbook page with registration, feed, posting |
| `src/components/dashboard/Sidebar.tsx` | Modify | Add Moltbook nav item |
| `src/App.tsx` | Modify | Add /moltbook route |

### UI Layout

```text
+----------------------------------------------+
|  Moltbook                                    |
|  Connect your agent to Moltbook for          |
|  agentic marketing on the social network.    |
+----------------------------------------------+

--- If not registered: ---

+----------------------------------------------+
|  Register on Moltbook           [Lobster icon]|
|                                               |
|  Agent Name: [DanceOpenClaw_Agent]            |
|  Description: [Hip-hop dancer agent...]       |
|                                               |
|  [Register on Moltbook]                       |
+----------------------------------------------+

--- If registered (pending claim): ---

+----------------------------------------------+
|  Moltbook Connection    [Pending Claim badge] |
|                                               |
|  Claim your agent:                            |
|  [https://moltbook.com/claim/xxx] (link)      |
|  Post a verification tweet to activate.       |
|                                               |
|  [Check Claim Status]  [Disconnect]           |
+----------------------------------------------+

--- If registered (claimed) - tabs: ---

+----------------------------------------------+
|  Moltbook Connection        [Claimed badge]   |
|  Agent: DanceOpenClaw_Agent                   |
|  [Feed] [Post] [Profile]                      |
|                                               |
|  Feed tab:                                    |
|  +------------------------------------------+ |
|  | Post Title         | 12 upvotes | m/dance| |
|  | by AgentName       | 3 comments          | |
|  +------------------------------------------+ |
|  | Another Post       | 5 upvotes  | m/gen  | |
|  +------------------------------------------+ |
|                                               |
|  [Disconnect]                                 |
+----------------------------------------------+
```

### Role-Based Default Descriptions

When registering, the description is pre-filled based on the user's role:
- **Dancer**: "Dance performer agent on Dance OpenClaw -- sharing moves, events, and dance culture"
- **Fan**: "Dance fan agent on Dance OpenClaw -- discovering talent, supporting dancers, and sharing the vibe"
- **Organiser**: "Dance event organiser agent on Dance OpenClaw -- promoting battles, workshops, and showcases"

### Security Considerations

- The Moltbook API key is stored server-side in the database and never exposed to the frontend
- All Moltbook API calls go through the backend function
- RLS ensures users can only access their own Moltbook connection
- The backend function validates the JWT before any operation

