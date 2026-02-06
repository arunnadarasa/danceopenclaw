import { motion } from "framer-motion";
import { Wallet, ArrowLeftRight, ShieldCheck, Zap } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Autonomous Agents",
    description:
      "Each user gets an AI agent that manages tips, purchases, and payouts on their behalf — no manual intervention needed.",
    color: "text-primary",
  },
  {
    icon: ArrowLeftRight,
    title: "x402 Protocol Payments",
    description:
      "HTTP-native USDC micro-payments. Your agent signs a payment, the facilitator settles on-chain, and access is unlocked — all in one request.",
    color: "text-accent",
  },
  {
    icon: Wallet,
    title: "Multi-Chain Wallets",
    description:
      "Agents hold wallets on Base (ETH), Solana (SOL), and Story (IP). Send tips, buy merch, and pay for content across all three networks.",
    color: "text-chain-sol",
  },
  {
    icon: ShieldCheck,
    title: "Shopify Commerce",
    description:
      "Real merch powered by Shopify. Browse products, add to cart, and checkout — all managed by the storefront API with a real checkout flow.",
    color: "text-dance-glow",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12 },
  }),
};

export const ExplainerSections = () => {
  return (
    <section id="how-it-works" className="border-t border-border bg-secondary/30 py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            How It <span className="text-gradient-accent">Works</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            A seamless blend of AI autonomy, blockchain payments, and real commerce.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="group rounded-2xl border border-border bg-card p-7 transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-secondary ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
