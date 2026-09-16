"use client";

import { motion } from "framer-motion";

/**
 * 4-petal X mark. On first load the lime polyline DRAWS itself
 * (stroke-dashoffset), then the petals fill — the spec's load sequence.
 * `animate={false}` renders the settled state with no motion, used for
 * the persistent header mark so it doesn't redraw on every navigation.
 */
export function Logo({ size = 22, animate = true }: { size?: number; animate?: boolean }) {
  // One petal, pointing up from center; rotated 4x to form the X mark.
  const d = "M12 2.5 C14.4 6.2 14.4 9.6 12 12 C9.6 9.6 9.6 6.2 12 2.5 Z";
  const rotations = [45, 135, 225, 315];

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      {rotations.map((rotate, i) => (
        <motion.path
          key={rotate}
          d={d}
          transform={`rotate(${rotate} 12 12)`}
          stroke="var(--lime)"
          strokeWidth={1.25}
          strokeLinejoin="round"
          fill="var(--lime)"
          initial={animate ? { pathLength: 0, fillOpacity: 0 } : false}
          animate={{ pathLength: 1, fillOpacity: 1 }}
          transition={{
            pathLength: { duration: 0.42, delay: i * 0.08, ease: "easeInOut" },
            fillOpacity: { duration: 0.3, delay: 0.34 + i * 0.08, ease: "easeOut" },
          }}
        />
      ))}
    </svg>
  );
}

export function Wordmark({ dark = true }: { dark?: boolean }) {
  return (
    <span
      style={{
        fontSize: "0.95rem",
        fontWeight: 500,
        letterSpacing: "-0.01em",
        color: dark ? "var(--ink-on-a)" : "var(--ink-on-b)",
        lineHeight: 1,
      }}
    >
      ToolBind
    </span>
  );
}
