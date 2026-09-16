"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const NODES = ["REPO", "SHA", "EVIDENCE", "CONSENSUS", "SEAL"];

export default function LandingPage() {
  return (
    <div>
      {/* Frame 1: hero */}
      <section
        style={{
          minHeight: "70vh",
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          padding: "24px",
        }}
      >
        <WireTube />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 760 }}>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              fontSize: "clamp(2.2rem, 7vw, 5rem)",
              lineHeight: 0.98,
              letterSpacing: "-0.03em",
              fontWeight: 600,
              color: "var(--ink-on-a)",
              margin: 0,
            }}
          >
            Bind the tool.
            <br />
            Then let the agent in.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mono"
            style={{ color: "var(--mute)", fontSize: 13, marginTop: 16, maxWidth: 480 }}
          >
            A Seal is a commit SHA, a policy, live public evidence, and GenLayer
            consensus, sealed together with an expiry. Agents refuse a missing,
            expired, or rejected seal.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{ marginTop: 28 }}
          >
            <Link
              href="/register"
              className="mono text-sm"
              style={{
                color: "#000",
                background: "var(--lime)",
                padding: "12px 20px",
                display: "inline-block",
              }}
            >
              Register a tool →
            </Link>
          </motion.div>
        </div>
      </section>

      <div
        className="mono text-[11px]"
        style={{ color: "var(--mute)", textAlign: "center", padding: "12px" }}
      >
        SCROLL TO EXPLORE
      </div>

      {/* Frame 3 style: process diagram */}
      <section style={{ padding: "60px 24px 100px", background: "var(--field-a)" }}>
        <ProcessDiagram />
      </section>
    </div>
  );
}

function WireTube() {
  // Lightweight acid-lime wireframe-tube visual, pure SVG, no heavy libs.
  const rings = Array.from({ length: 14 });
  return (
    <svg
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55 }}
      aria-hidden="true"
    >
      {rings.map((_, i) => {
        const t = i / (rings.length - 1);
        const x = 100 + t * 600;
        const ry = 60 + Math.sin(t * Math.PI) * 90;
        return (
          <motion.ellipse
            key={i}
            cx={x}
            cy={250}
            rx={40 + t * 18}
            ry={ry}
            fill="none"
            stroke="var(--lime)"
            strokeWidth={1}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.5, scale: 1 }}
            transition={{ duration: 1.2, delay: i * 0.05 }}
          />
        );
      })}
    </svg>
  );
}

function ProcessDiagram() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <svg viewBox="0 0 900 160" width="100%" aria-hidden="true">
        <motion.path
          d="M50,80 C 200,20 300,140 450,80 S 700,20 850,80"
          fill="none"
          stroke="var(--lime)"
          strokeWidth={1}
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.7 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
        {NODES.map((label, i) => {
          const x = 50 + i * 200;
          return (
            <g key={label}>
              <motion.circle
                cx={x}
                cy={80}
                r={6}
                fill="var(--lime)"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.25 }}
              />
              <text
                x={x}
                y={110}
                textAnchor="middle"
                className="mono"
                fontSize={11}
                fill="var(--ink-on-a)"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
