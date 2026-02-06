import { motion } from "framer-motion";
import { Music, Heart, CalendarDays } from "lucide-react";

const roles = [
  {
    icon: Music,
    title: "Dancer",
    subtitle: "Perform & Earn",
    items: [
      "Auto-wallet on Base, Solana & Story",
      "Receive tips from fans in USDC",
      "Sell merch through your agent",
      "Get event payout splits automatically",
    ],
    accent: "border-primary/40 hover:border-primary",
    iconBg: "bg-primary/10 text-primary",
  },
  {
    icon: Heart,
    title: "Fan",
    subtitle: "Support & Discover",
    items: [
      "Tip any dancer across chains",
      "Browse & buy dance merch via Shopify",
      "Follow events & purchase tickets",
      "Your agent discovers new talent for you",
    ],
    accent: "border-accent/40 hover:border-accent",
    iconBg: "bg-accent/10 text-accent",
  },
  {
    icon: CalendarDays,
    title: "Organiser",
    subtitle: "Create & Manage",
    items: [
      "Create battles, workshops & showcases",
      "Automated ticket sales and payouts",
      "Revenue split dashboards per event",
      "Your agent handles logistics autonomously",
    ],
    accent: "border-dance-glow/40 hover:border-dance-glow",
    iconBg: "bg-dance-glow/10 text-dance-glow",
  },
];

export const RoleCards = () => {
  return (
    <section id="roles" className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Choose Your <span className="text-gradient-primary">Role</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every role comes with a dedicated AI agent and multi-chain wallet.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className={`rounded-2xl border-2 bg-card p-7 transition-all ${role.accent}`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${role.iconBg}`}>
                <role.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold">{role.title}</h3>
              <p className="text-sm text-muted-foreground">{role.subtitle}</p>
              <ul className="mt-5 space-y-2.5">
                {role.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
