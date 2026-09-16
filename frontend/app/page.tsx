"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Pipeline } from "@/components/Pipeline";
import { StatusBadge } from "@/components/StatusBadge";

export default function LandingPage() {
  return (
    <div style={{ position: "relative", flex: 1 }}>
      <section
        style={{
          position: "relative",
          display: "grid",
          gap: 48,
          padding: "clamp(56px, 9vw, 110px) clamp(16px, 4vw, 48px) clamp(48px, 8vw, 88px)",
          maxWidth: 1180,
          margin: "0 auto",
        }}
        className="landing-grid"
      >
        <div style={{ maxWidth: 620 }}>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="display"
            style={{
              fontSize: "clamp(2.2rem, 4.6vw, 3.4rem)",
              lineHeight: 1.05,
              color: "var(--c-photon)",
              margin: 0,
            }}
          >
            Bind a tool at a commit. Seal it before the agent can call it.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{ color: "var(--c-chassis)", fontSize: 15, marginTop: 20, maxWidth: 480, lineHeight: 1.6 }}
          >
            A pinned SHA, a scoped claim, live evidence, and validator consensus —
            finalized on GenLayer with an expiry.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}
          >
            <Link href="/register" className="gl-btn gl-btn-primary">
              Register a tool
            </Link>
            <Link href="/registry" className="gl-btn gl-btn-secondary">
              Browse the registry
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="gl-card"
          style={{
            position: "relative",
            padding: 24,
            maxWidth: 440,
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "-40% -20% auto auto",
              width: 320,
              height: 320,
              background: "var(--c-cobalt)",
              opacity: 0.08,
              filter: "blur(80px)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--c-asphalt)" }}>
              TOOL CERTIFICATE
            </span>
            <StatusBadge value="SEALED" />
          </div>

          <p className="display" style={{ position: "relative", fontSize: 22, color: "var(--c-photon)", margin: "18px 0 0" }}>
            acme/payments-mcp
          </p>

          <div style={{ position: "relative", marginTop: 18 }}>
            <span className="gl-label">Commit</span>
            <span className="mono" style={{ fontSize: 14, color: "var(--c-chassis)" }}>
              1a2b3c4d
            </span>
          </div>

          <div style={{ position: "relative", height: 1, background: "rgba(255,255,255,0.08)", margin: "18px 0" }} />

          <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
            <div>
              <span className="gl-label">Policy</span>
              <span className="mono" style={{ fontSize: 14, color: "var(--c-photon)" }}>
                general
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="gl-label">Expiry</span>
              <span className="mono" style={{ fontSize: 14, color: "var(--c-photon)" }}>
                14d remaining
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      <section
        style={{
          padding: "0 clamp(16px, 4vw, 48px) clamp(64px, 9vw, 96px)",
          maxWidth: 1180,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 40 }} />
        <Pipeline activeIndex={4} />
      </section>

      <style jsx>{`
        .landing-grid {
          grid-template-columns: 1fr;
        }
        @media (min-width: 860px) {
          .landing-grid {
            grid-template-columns: 1fr auto;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}
