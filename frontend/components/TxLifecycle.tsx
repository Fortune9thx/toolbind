"use client";

import { motion } from "framer-motion";
import type { TxStage } from "@/lib/genlayer";
import { explorerTxUrl } from "@/lib/genlayer";
import { estimateFee } from "@/lib/fees";

const STEPS: { key: TxStage; label: string }[] = [
  { key: "estimating", label: "Fee estimate" },
  { key: "awaiting_signature", label: "Wallet confirm" },
  { key: "pending", label: "Pending" },
  { key: "awaiting_decision", label: "Decision" },
  { key: "finalized", label: "Finalized" },
];

/** Renders the full fee-estimate -> sign -> pending -> decision ->
 * finalized/error lifecycle for a mutating call. Used identically across
 * /register, /tools/[id], /seal/[id], and /challenge/[id]. */
export function TxLifecycle({
  functionName,
  stage,
  txHash,
  error,
}: {
  functionName: string;
  stage: TxStage;
  txHash: string | null;
  error: string | null;
}) {
  if (stage === "idle") return null;

  const fee = estimateFee(functionName);
  const currentIndex = STEPS.findIndex((s) => s.key === stage);

  return (
    <div className="gl-card mono text-xs" style={{ padding: 16, marginTop: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
        {STEPS.map((s, i) => {
          const done = currentIndex > i || stage === "finalized";
          const active = s.key === stage;
          const color = stage === "error" && active ? "var(--c-error)" : "var(--c-cobalt)";
          return (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <motion.span
                animate={{
                  backgroundColor: done || active ? color : "transparent",
                  scale: active && stage !== "finalized" ? [1, 1.25, 1] : 1,
                }}
                transition={
                  active && stage !== "finalized"
                    ? { duration: 1, repeat: Infinity, repeatType: "loop" }
                    : { duration: 0.2 }
                }
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  border: `1px solid ${done || active ? color : "var(--c-asphalt)"}`,
                  display: "inline-block",
                }}
              />
              <span style={{ color: done || active ? "var(--c-photon)" : "var(--c-asphalt)" }}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {stage === "estimating" && (
        <p style={{ color: "var(--c-chassis)" }}>
          Estimated fee for <b>{functionName}</b>: {fee.estimatedGen} GEN — {fee.note}
        </p>
      )}
      {stage === "error" && <p style={{ color: "var(--c-error)" }}>Error: {error ?? "transaction failed"}</p>}
      {txHash && (
        <p style={{ marginTop: 8, color: "var(--c-chassis)" }}>
          tx:{" "}
          <a href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer" style={{ color: "var(--c-cobalt)" }}>
            {txHash.slice(0, 10)}...{txHash.slice(-6)} ↗
          </a>
        </p>
      )}
    </div>
  );
}
