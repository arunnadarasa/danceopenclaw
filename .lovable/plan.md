

# Dance OpenClaw — Where Dance Meets Agentic Commerce

An all-in-one platform for the global dance community, connecting dancers, fans, and organisers through autonomous AI agents with multi-chain wallets, x402 payments, and Shopify-powered commerce.

---

## 1. Landing Page

- **⚠️ Autonomy warning banner** at the top: *"OpenClaw agents act autonomously. Some actions may be beneficial, others unpredictable. Use a burner email to sign in."*
- **Hero section**: "Where Dance Meets Agentic Commerce" — showcasing the diversity of dance styles (hip-hop, breaking, contemporary, popping, ballet, Krump, and more)
- Visual diagram of Dancer ↔ Fan ↔ Organiser agent interactions
- Explainer sections: How x402 works, what agents do, USDC payments
- Role showcase cards: Dancer, Fan, Organiser — what each agent does for you
- **In-app hackathon setup guide** section with API keys, faucets, and getting started steps
- FAQ section and CTA buttons to sign in

## 2. Authentication & Onboarding

- **Google Sign-In via Supabase Auth** — primary login method
- Prominent "burner email" recommendation on the sign-in screen
- **Mandatory disclaimer checkbox**: *"I understand that OpenClaw agents operate autonomously and may perform actions — some beneficial, some potentially undesirable — on my behalf. I accept full responsibility."*
- Role selection after first sign-in: **Dancer**, **Fan**, or **Organiser**
- Dancers select their dance style(s) during onboarding (hip-hop, breaking, popping, locking, contemporary, ballet, Krump, house, waacking, etc.)
- Auto-creation of profile, wallet record, and initial agent on signup

## 3. Database Schema (Supabase)

- **profiles**: user_id, display_name, avatar_url, bio, wallet_address, dance_styles (array — for dancers)
- **user_roles**: user_id, role (dancer/fan/organiser)
- **agents**: agent_id, user_id, name, status, budget_limit, auto_tip_enabled, config
- **agent_wallets**: agent_id, wallet_id (Privy), address, chain_type (ethereum/solana/story)
- **agent_tips**: sender/recipient agent IDs, amount, chain_type, tx_hash, status
- **agent_native_transfers**: agent_id, recipient, amount, chain_type, tx_hash, status
- **agent_payments**: agent_id, recipient, amount, network, target_url, tx_hash, status (x402)
- **events**: organiser_id, title, description, date, venue, ticket_price, capacity, dance_styles (array), status
- **wallets**: user_id, usdc_balance
- Row-Level Security on all tables

## 4. Edge Functions (Privy + Multi-Chain)

- **create-agent-wallet**: Creates wallets via Privy for Base (ETH), Solana, or Story (IP)
- **get-agent-wallet**: Fetches wallet info + live on-chain balances
- **send-native-token**: ETH/SOL/IP test transfers via Privy RPC
- **tip-agent**: Agent-to-agent tipping across all three chains
- **execute-x402-payment**: EVM x402 USDC payments (Base + Story)
- **execute-x402-payment-solana**: Solana x402 USDC payments

## 5. Agent Dashboard (Post-Login Home)

- Personal **Agent card**: name, status, multi-chain wallet balances
- **Chain tabs** (ETH / SOL / Story) with native + USDC balances
- Wallet creation buttons per chain with testnet faucet links
- Agent configuration: daily budget, auto-tip rules, spending limits
- Activity feed: tips, purchases, payouts, x402 payments in real time
- Quick actions: Tip a dancer, Browse shop, View events, Test x402

## 6. Shopify-Powered Marketplace

- Real Shopify products in a browsable grid — dance merch, content packs, gear for all styles
- Product cards with images, titles, prices from Storefront API
- Product detail pages with Add to Cart (Zustand-managed cart)
- Cart drawer → Shopify hosted checkout
- Empty state with guidance to add products via chat

## 7. Events Hub

- Browse upcoming events: battles, cyphers, workshops, showcases — across all dance styles
- Filter events by dance style, date, location
- Event detail page with ticket purchase flow
- Organisers create/manage events, tagging relevant dance styles
- Post-event payout dashboard with revenue split visualisation
- Live tipping during events

## 8. Tipping & x402 Payment Flows

- Tip button on profiles/posts: select chain → confirm → send
- Tips history with blockchain explorer links
- Self-tip test button for trying the flow
- x402 echo test: one-click USDC micro-payment to test endpoint
- Native transfer + x402 payment history views
- Visual x402 flow: Request → 402 → Sign → Pay → Access Unlocked

## 9. Dance Network View

- Interactive visualisation of agent connections across the dance ecosystem
- Nodes for dancers (colour-coded by style), fans, organisers
- Edges for payment/tip flows between agents
- Leaderboard: top-tipped dancers, most active fans, biggest events
- Stats: total transactions, volume, active agents

## 10. Hackathon Documentation (In-App)

- Setup guide: Privy keys, secrets, testnet wallet funding
- Network reference: chain IDs, RPCs, USDC addresses, explorers
- Faucet links for Base ETH, USDC, SOL, Story IP
- Architecture diagram: Frontend → Edge Functions → Privy/RPC → Database
- Code snippets for wallet creation, tipping, x402 patterns

## 11. Navigation & Layout

- Sidebar: Dashboard, Shop, Events, Wallet, Network, Docs, Settings
- Top bar: avatar, agent status, wallet balance, cart icon with badge
- Responsive for desktop and mobile
- Dark mode with vibrant accent colours

## 12. Design System

- Clean, modern fintech-meets-dance aesthetic — inclusive of all styles
- Card-based layouts with smooth transitions
- Chain-specific colours (blue for Base, purple for Solana, teal for Story)
- Dance-style colour tags and iconography throughout
- Status indicators and micro-animations for agent activity

