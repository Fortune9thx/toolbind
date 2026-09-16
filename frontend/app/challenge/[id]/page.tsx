"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { writeContract, type TxStage } from "@/lib/genlayer";
import { TxLifecycle } from "@/components/TxLifecycle";
import { PerspectiveGrid } from "@/components/PerspectiveGrid";
import { PixelArrow } from "@/components/PixelArrow";

export default function ChallengePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [stage, setStage] = useState<TxStage>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTxHash(null);
    try {
      await writeContract("challenge", [params.id, evidenceUrl.trim()], {
        onStage: setStage,
        onTxHash: setTxHash,
        onError: (err) => setError(String((err as Error)?.message ?? err)),
      });
    } catch {
      // handled via onError
    }
  }

  const busy = stage !== "idle" && stage !== "finalized" && stage !== "error";

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <PerspectiveGrid />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "clamp(32px, 6vw, 64px) clamp(16px, 4vw, 48px) 80px",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(1.9rem, 4.5vw, 2.6rem)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--ink-on-b)",
            margin: 0,
          }}
        >
          Challenge <span className="mono" style={{ color: "var(--lime-hot)", fontSize: "0.7em" }}>{params.id}</span>
        </h1>
        <p className="mono text-xs" style={{ color: "var(--mute)", marginTop: 14, lineHeight: 1.7, maxWidth: 480 }}>
          Submitting a challenge does not overturn the seal by itself — it flags the
          seal as CHALLENGED and surfaces your counter-evidence to anyone viewing it,
          including the owner, who can reseal once it expires or a new SHA is set.
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 32, display: "grid", gap: 24, maxWidth: 480 }}>
          <label>
            <span className="hr-label">Counter-evidence URL</span>
            <input
              className="mono hr-field"
              required
              placeholder="https://example.com/evidence-that-contradicts-the-seal"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="mono tb-cta"
            data-on-light="true"
            style={{
              border: "none",
              width: "fit-content",
              cursor: busy ? "default" : "pointer",
              fontSize: 14,
              padding: "4px 0",
              opacity: busy ? 0.5 : 1,
            }}
          >
            Submit challenge
            <PixelArrow size={13} color="currentColor" />
          </button>
        </form>

        <TxLifecycle functionName="challenge" stage={stage} txHash={txHash} error={error} />

        {stage === "finalized" && (
          <button
            onClick={() => router.push(`/seal/${params.id}`)}
            className="mono tb-cta text-xs"
            data-on-light="true"
            style={{ marginTop: 18, border: "none", cursor: "pointer", padding: 0 }}
          >
            View seal
            <PixelArrow size={11} color="currentColor" />
          </button>
        )}
      </div>
    </div>
  );
}
