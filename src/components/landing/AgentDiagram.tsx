import { motion } from "framer-motion";

const nodes = [
  { label: "Dancer Agent", emoji: "💃", x: "50%", y: "10%", color: "primary" },
  { label: "Fan Agent", emoji: "🎤", x: "15%", y: "75%", color: "accent" },
  { label: "Organiser Agent", emoji: "🎪", x: "85%", y: "75%", color: "dance-glow" },
];

export const AgentDiagram = () => {
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Autonomous Agent <span className="text-gradient-primary">Ecosystem</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Each role gets an AI agent with its own multi-chain wallet. Agents interact
            autonomously — tipping dancers, purchasing merch, and managing event payouts.
          </p>
        </div>

        {/* Diagram */}
        <div className="relative mx-auto mt-16 h-[360px] max-w-lg">
          {/* Connection lines */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 360">
            <motion.line
              x1="200" y1="80" x2="70" y2="280"
              stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="6 4"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
              viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 }}
            />
            <motion.line
              x1="200" y1="80" x2="330" y2="280"
              stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="6 4"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
              viewport={{ once: true }} transition={{ duration: 1, delay: 0.5 }}
            />
            <motion.line
              x1="70" y1="280" x2="330" y2="280"
              stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="6 4"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
              viewport={{ once: true }} transition={{ duration: 1, delay: 0.7 }}
            />
          </svg>

          {/* Flow labels */}
          <div className="absolute left-[18%] top-[42%] -rotate-[35deg] text-[10px] font-medium text-muted-foreground">
            Tips & Support
          </div>
          <div className="absolute right-[14%] top-[42%] rotate-[35deg] text-[10px] font-medium text-muted-foreground">
            Events & Payouts
          </div>
          <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground">
            Merch & Tickets
          </div>

          {/* Nodes */}
          {nodes.map((node, i) => (
            <motion.div
              key={node.label}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: node.x, top: node.y }}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.2 }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-lg animate-float"
                  style={{ animationDelay: `${i * 2}s` }}
                >
                  <span className="text-2xl">{node.emoji}</span>
                </div>
                <span className="text-sm font-medium">{node.label}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
