import { motion } from "framer-motion";
import { KeyRound, Coins, Rocket, Terminal, ExternalLink } from "lucide-react";

const steps = [
  {
    icon: KeyRound,
    step: "01",
    title: "Get Your Privy Keys",
    description:
      "Create a Privy app at dashboard.privy.io. Copy your App ID and App Secret — these power wallet creation and signing.",
    link: { label: "Privy Dashboard", url: "https://dashboard.privy.io" },
  },
  {
    icon: Coins,
    step: "02",
    title: "Fund Testnet Wallets",
    description:
      "Grab test tokens from faucets: Base ETH from Coinbase, USDC from Circle, SOL from Solana, and IP from Story Foundation.",
    link: { label: "Circle Faucet", url: "https://faucet.circle.com/" },
  },
  {
    icon: Terminal,
    step: "03",
    title: "Connect OpenClaw",
    description:
      "Install OpenClaw, enable webhooks in your config, then paste your webhook URL and token into the dashboard.",
    link: { label: "OpenClaw Docs", url: "https://openclaw.ai" },
  },
  {
    icon: Rocket,
    step: "04",
    title: "Deploy & Test",
    description:
      "Sign in with Google, create your agent wallet, send a test tip, and try the x402 echo payment — all from the dashboard.",
    link: null,
  },
];

const networks = [
  { name: "Base Sepolia", token: "ETH", chainId: "84532", color: "bg-chain-eth" },
  { name: "Solana Devnet", token: "SOL", chainId: "—", color: "bg-chain-sol" },
  { name: "Story Aeneid", token: "IP", chainId: "1315", color: "bg-chain-story" },
];

export const SetupGuide = () => {
  return (
    <section id="setup" className="border-t border-border bg-secondary/30 py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Getting <span className="text-gradient-accent">Started</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Get up and running in four steps.
          </p>
        </div>

        {/* Steps */}
        <div className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <span className="font-display text-3xl font-bold text-primary/20">{s.step}</span>
              <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
              {s.link && (
                <a
                  href={s.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {s.link.label} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </motion.div>
          ))}
        </div>

        {/* Network reference */}
        <div className="mx-auto mt-14 max-w-2xl">
          <h3 className="text-center font-display text-lg font-semibold">Supported Networks</h3>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {networks.map((n) => (
              <div key={n.name} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className={`h-3 w-3 rounded-full ${n.color}`} />
                <div>
                  <p className="text-sm font-medium">{n.name}</p>
                  <p className="text-xs text-muted-foreground">{n.token} · Chain {n.chainId}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
