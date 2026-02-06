import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const WarningBanner = () => {
  const [visible, setVisible] = useState(true);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-warning/10 border-b border-warning/30"
        >
          <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              <p className="text-foreground/90">
                <span className="font-semibold">OpenClaw agents act autonomously.</span>{" "}
                Some actions may be beneficial, others unpredictable. Use a burner email to sign in.
              </p>
            </div>
            <button
              onClick={() => setVisible(false)}
              className="shrink-0 rounded-md p-1 hover:bg-warning/10 transition-colors"
              aria-label="Dismiss warning"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
