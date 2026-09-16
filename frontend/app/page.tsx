"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { WireframeTube } from "@/components/WireframeTube";
import { PixelArrow } from "@/components/PixelArrow";
import { ProcessGraph } from "@/components/ProcessGraph";

export default function LandingPage() {
  return (
    <div>
      {/* Hero — black field, headline bottom-left, tube right */}
      <section
        style={{
          minHeight: "72vh",
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            right: "-8%",
          }}
        >
          <WireframeTube />
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 640,
            padding: "0 clamp(16px, 4vw, 48px) clamp(40px, 6vw, 64px)",
          }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            style={{
              fontSize: "clamp(2.4rem, 6.4vw, 4.6rem)",
              lineHeight: 0.96,
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mono"
            style={{ color: "var(--mute)", fontSize: 13, marginTop: 18, maxWidth: 400, lineHeight: 1.6 }}
          >
            A commit SHA, a policy, live evidence, and consensus — sealed with an expiry.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.42 }}
            style={{ marginTop: 30 }}
          >
            <Link href="/register" className="mono tb-cta text-sm" style={{ fontSize: 14 }}>
              Register a tool
              <PixelArrow size={14} />
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mono"
          style={{
            position: "absolute",
            right: "clamp(16px, 4vw, 32px)",
            bottom: 18,
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "var(--mute)",
            zIndex: 1,
          }}
        >
          SCROLL TO EXPLORE ↓
        </motion.div>
      </section>

      {/* Process — five nodes on one lime bezier */}
      <section
        style={{
          padding: "clamp(48px, 8vw, 96px) clamp(16px, 4vw, 48px) clamp(64px, 10vw, 110px)",
          background: "var(--field-a)",
        }}
      >
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <ProcessGraph />
        </div>
      </section>
    </div>
  );
}
