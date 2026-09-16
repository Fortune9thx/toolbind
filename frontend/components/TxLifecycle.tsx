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
    <div
      className="mono text-xs border"
      style={{ borderColor: "var(--lime)", padding: 16, marginTop: 16 }}
    >
      <div className="flex flex-wrap gap-4 mb-3">
        {STEPS.map((s, i) => {
          const done = currentIndex > i || stage === "finalized";
          const active = s.key === stage;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <motion.span
                animate={{
                  backgroundColor: done || active ? "var(--lime)" : "transparent",
                  scale: active && stage !== "finalized" ? [1, 1.3, 1] : 1,
                }}
                transition={
                  active && stage !== "finalized"
                    ? { duration: 1, repeat: Infinity, repeatType: "loop" }
                    : { duration: 0.3 }
                }
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                  border: "1px solid var(--lime)",
                  display: "inline-block",
                }}
              />
              <span style={{ opacity: done || active ? 1 : 0.4 }}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {stage === "estimating" && (
        <p style={{ opacity: 0.8 }}>
          Estimated fee for <b>{functionName}</b>: {fee.estimatedGen} GEN — {fee.note}
        </p>
      )}
      {stage === "error" && (
        <p style={{ color: "#ff6b6b" }}>Error: {error ?? "transaction failed"}</p>
      )}
      {txHash && (
        <p className="mt-2">
          tx:{" "}
          <a href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer" style={{ color: "var(--lime)" }}>
            {txHash.slice(0, 10)}...{txHash.slice(-6)} ↗
          </a>
        </p>
      )}
    </div>
  );
}
