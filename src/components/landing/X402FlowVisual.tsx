import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const steps = [
  { label: "Request", sublabel: "GET /content", bg: "bg-secondary" },
  { label: "402 Price", sublabel: "$0.01 USDC", bg: "bg-warning/10" },
  { label: "Agent Signs", sublabel: "EIP-3009", bg: "bg-primary/10" },
  { label: "Access ✓", sublabel: "Content unlocked", bg: "bg-success/10" },
];

export const X402FlowVisual = () => {
  return (
    <section className="border-t border-border py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            The <span className="text-gradient-accent">x402</span> Payment Flow
          </h2>
          <p className="mt-4 text-muted-foreground">
            HTTP-native micro-payments in a single round-trip.
          </p>
        </div>

        <div className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className="flex items-center gap-3"
            >
              <div className={`rounded-xl border border-border ${step.bg} px-5 py-4 text-center`}>
                <p className="font-display text-sm font-bold">{step.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.sublabel}</p>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
