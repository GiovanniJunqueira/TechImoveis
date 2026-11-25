"use client";

import { AnimatePresence, motion } from "motion/react";

const ease = [0.32, 0.72, 0, 1] as const;

/** Bloco que abre e fecha com animação de altura. */
export function Expande({ aberto, children }: { aberto: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {aberto && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.32, ease }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
