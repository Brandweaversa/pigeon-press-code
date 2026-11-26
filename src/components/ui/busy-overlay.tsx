"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useBusy } from "@/lib/busy";

/** Full-screen frosted-glass overlay with a spinner and a short label
 *  ("Saving…", "Deleting…", …). Blocks every click while an action runs. */
export function BusyOverlay() {
  const text = useBusy((s) => s.text);
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key="busy-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="glass fixed inset-0 z-[95] grid place-items-center"
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-3 rounded-full bg-white/90 px-5 py-3 shadow-xl ring-1 ring-black/10"
          >
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            <span className="text-sm font-semibold text-black">{text}</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
