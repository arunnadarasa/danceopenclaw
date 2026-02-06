import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Users, ShoppingBag } from "lucide-react";

const danceStyles = [
  "Hip-Hop", "Breaking", "Popping", "Locking", "Contemporary",
  "Ballet", "Krump", "House", "Waacking", "Dancehall",
  "Afrobeats", "Voguing", "Tutting", "Animation",
];

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-24 lg:py-36">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Dance styles ticker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex flex-wrap items-center justify-center gap-2"
          >
            {danceStyles.map((style, i) => (
              <span
                key={style}
                className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {style}
              </span>
            ))}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl"
          >
            Where Dance Meets{" "}
            <span className="text-gradient-primary">Agentic Commerce</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            Autonomous AI agents connect dancers, fans, and organisers — handling tips,
            payments, and merch sales across multiple blockchains so you can focus on the art.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Button size="lg" className="gap-2 text-base">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base">
              Learn More
            </Button>
          </motion.div>

          {/* Stat bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-4 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm"
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-primary">
                <Users className="h-4 w-4" />
                <span className="font-display text-2xl font-bold">3</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Agent Roles</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-accent">
                <Zap className="h-4 w-4" />
                <span className="font-display text-2xl font-bold">3</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Blockchains</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-dance-glow">
                <ShoppingBag className="h-4 w-4" />
                <span className="font-display text-2xl font-bold">x402</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Payments</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
