# Dance OpenClaw 🕺🤖💸

**Agentic commerce for the dance community — powered by AI agents, multi-chain wallets, and micro-payments.**

> Built for the Privy × OpenClaw Hackathon

---

## What Is It?

Dance OpenClaw is a platform where dance professionals, fans, and event organisers interact through AI-powered agents that can hold funds, tip each other, pay for API calls, and trade merchandise — all autonomously.

### Key Features

- **Multi-Chain Agent Wallets** — Each user gets Privy server wallets across Base, Solana, and Story (testnet + mainnet share the same address)
- **OpenClaw AI Agent** — Real-time streaming chat via WebSocket bridge (SSE to browser)
- **x402 Micro-Payments** — USDC payments for API access using the x402 protocol
- **Agent-to-Agent Tipping** — Native token and USDC transfers between agent wallets
- **Merch Marketplace** — Shopify Storefront API-powered dance merchandise shop
- **Role-Based Access** — Dancer, Fan, and Organiser roles with tailored experiences

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser   │────▶│  Lovable Cloud   │────▶│   Privy API     │
│  (React)    │ SSE │  Edge Functions   │     │  Server Wallets │
└─────────────┘     └──────────────────┘     └─────────────────┘
                           │                         │
                    ┌──────┴──────┐            ┌─────┴──────┐
                    │  OpenClaw   │            │  On-Chain   │
                    │  AI Agent   │            │  Base/Sol/  │
                    │  (your VPS) │            │  Story      │
                    └─────────────┘            └────────────┘
```

### Edge Functions

| Function | Purpose |
|----------|---------|
| `agent-wallet` | Create, query, and transact with Privy server wallets |
| `openclaw-chat` | WebSocket-to-SSE bridge for real-time agent streaming |
| `openclaw-proxy` | HTTP proxy for OpenClaw webhook commands |
| `openclaw-status` | Health check for connected OpenClaw instances |
| `openclaw-register` | Register new OpenClaw agent connections |
| `openclaw-webhook-callback` | Receive async agent task results |

---

## Supported Chains

| Family | Testnet | Mainnet | Token |
|--------|---------|---------|-------|
| **Base** | Base Sepolia | Base | ETH + USDC |
| **Solana** | Solana Devnet | Solana | SOL |
| **Story** | Story Aeneid | Story | IP |

> Testnet and mainnet wallets in the same family share the same Privy wallet address.

---

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion
- **UI**: shadcn/ui component library
- **Backend**: Lovable Cloud (Supabase) — Auth, Database, Edge Functions
- **Wallets**: Privy Server Wallets (multi-chain)
- **AI Agent**: OpenClaw (self-hosted on DigitalOcean)
- **AI Provider**: OpenRouter
- **Payments**: x402 protocol for USDC micro-payments
- **Commerce**: Shopify Storefront API

---

## Getting Started

### Prerequisites

- A [Privy](https://dashboard.privy.io) account (App ID + App Secret)
- An [OpenRouter](https://openrouter.ai) API key
- A DigitalOcean account (for OpenClaw hosting)

### 1. Deploy OpenClaw

Use the DigitalOcean 1-Click Droplet (4GB RAM recommended):

👉 [How to Run OpenClaw on DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-run-openclaw)

After deployment:
- SSH in and configure your OpenRouter API key
- Note your server's public IP (this becomes your webhook URL)

### 2. Configure Privy

1. Create an app at [dashboard.privy.io](https://dashboard.privy.io)
2. Copy your **App ID** and **App Secret**
3. Add them as secrets in the project backend

### 3. Fund Testnet Wallets

Grab test tokens from faucets:
- **Base ETH**: [Coinbase Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- **USDC**: [Circle Faucet](https://faucet.circle.com/)
- **SOL**: [Solana Faucet](https://faucet.solana.com/)
- **IP**: Story Foundation faucet

### 4. Connect & Test

1. Sign in with Google
2. Complete onboarding (choose your dance role)
3. Create agent wallets from the Wallet page
4. Connect your OpenClaw instance from the Dashboard
5. Chat with your agent and try a test tip!

---

## Project Structure

```
src/
├── components/
│   ├── dashboard/      # Dashboard UI (chat, sidebar, agent panel)
│   ├── landing/        # Landing page sections
│   ├── wallet/         # Wallet cards, create panel, send form
│   └── ui/             # shadcn/ui components
├── contexts/           # Auth context
├── hooks/              # useAgentWallet, custom hooks
├── lib/                # Utilities (openclaw-stream, utils)
├── pages/              # Route pages
└── integrations/       # Supabase client

supabase/
└── functions/          # Edge functions (agent-wallet, openclaw-chat, etc.)
```

---

## License

MIT

---

*Built with [Lovable](https://lovable.dev)*
