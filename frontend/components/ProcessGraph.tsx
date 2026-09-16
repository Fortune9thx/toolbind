"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const STEPS = ["REPO", "SHA", "EVIDENCE", "CONSENSUS", "SEAL"];

const VIEW_W = 1000;
const VIEW_H = 300;

/** A single smooth bezier the nodes are placed ONTO — node coordinates are
 * sampled from the rendered path via getPointAtLength rather than being
 * hand-positioned next to it, so no node can drift off the curve. */
const PATH_D = `M 60 190
  C 170 190, 190 120, 290 120
  S 420 205, 520 200
  S 660 120, 740 112
  S 880 78, 945 62`;

export function ProcessGraph() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [nodes, setNodes] = useState<{ x: number; y: number }[]>([]);
  const inView = useInView(wrapRef, { once: true, amount: 0.4 });

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    // Sample each node's position directly off the curve.
    const sampled = STEPS.map((_, i) => {
      const at = (i / (STEPS.length - 1)) * total;
      const p = path.getPointAtLength(at);
      return { x: p.x, y: p.y };
    });
    setNodes(sampled);
  }, []);

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
      >
        <motion.path
          ref={pathRef}
          d={PATH_D}
          fill="none"
          stroke="var(--lime)"
          strokeWidth={1.5}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {nodes.map((n, i) => {
          const isSeal = i === STEPS.length - 1;
          const delay = 0.35 + (i / (STEPS.length - 1)) * 1.15;
          return (
            <motion.g
              key={STEPS[i]}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.3, delay }}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={isSeal ? 13 : 5}
                fill="var(--lime)"
                stroke="var(--lime)"
                strokeWidth={isSeal ? 0 : 1}
              />
              <text
                x={n.x}
                y={n.y + (isSeal ? 36 : 28)}
                textAnchor="middle"
                className="mono"
                style={{
                  fill: isSeal ? "var(--lime)" : "var(--mute)",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                }}
              >
                {STEPS[i]}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
