import { motion } from "framer-motion";

const nodes = [
  { label: "Dancer Agent", emoji: "💃", x: "50%", y: "8%" },
  { label: "Fan Agent", emoji: "🎤", x: "20%", y: "78%" },
  { label: "Organiser Agent", emoji: "🎪", x: "80%", y: "78%" },
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
        <div className="relative mx-auto mt-16 h-[420px] max-w-md sm:max-w-lg">
          {/* Connection lines */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
            <motion.line
              x1="200" y1="75" x2="80" y2="310"
              stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="6 4"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
              viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 }}
            />
            <motion.line
              x1="200" y1="75" x2="320" y2="310"
              stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="6 4"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
              viewport={{ once: true }} transition={{ duration: 1, delay: 0.5 }}
            />
            <motion.line
              x1="80" y1="310" x2="320" y2="310"
              stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="6 4"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
              viewport={{ once: true }} transition={{ duration: 1, delay: 0.7 }}
            />

            {/* Flow labels along edges */}
            <text
              x="120" y="195"
              fill="hsl(var(--muted-foreground))"
              fontSize="11"
              fontWeight="500"
              textAnchor="middle"
              transform="rotate(-44, 120, 195)"
            >
              Tips &amp; Support
            </text>
            <text
              x="280" y="195"
              fill="hsl(var(--muted-foreground))"
              fontSize="11"
              fontWeight="500"
              textAnchor="middle"
              transform="rotate(44, 280, 195)"
            >
              Events &amp; Payouts
            </text>
            <text
              x="200" y="345"
              fill="hsl(var(--muted-foreground))"
              fontSize="11"
              fontWeight="500"
              textAnchor="middle"
            >
              Merch &amp; Tickets
            </text>
          </svg>

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
                <div
                  className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-lg animate-float"
                  style={{ animationDelay: `${i * 2}s` }}
                >
                  <span className="text-xl sm:text-2xl">{node.emoji}</span>
                </div>
                <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">{node.label}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};