"use client";

import { motion } from "framer-motion";

/** Simple 4-petal X mark: four lime petals rotated 90deg apart, drawn on
 * first load then settled -- used as the app's persistent brand mark. */
export function Logo({ size = 22, animate = true }: { size?: number; animate?: boolean }) {
  const petal = (rotate: number, delay: number) => (
    <motion.path
      key={rotate}
      d="M12 2 C14 6 14 10 12 12 C10 10 10 6 12 2 Z"
      fill="var(--lime)"
      transform={`rotate(${rotate} 12 12)`}
      initial={animate ? { opacity: 0, scale: 0.4 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    />
  );

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {petal(0, 0)}
      {petal(90, 0.06)}
      {petal(180, 0.12)}
      {petal(270, 0.18)}
    </svg>
  );
}

export function Wordmark({ dark = true }: { dark?: boolean }) {
  return (
    <span
      className="mono text-sm tracking-tight font-medium"
      style={{ color: dark ? "var(--ink-on-a)" : "var(--ink-on-b)" }}
    >
      ToolBind
    </span>
  );
}
