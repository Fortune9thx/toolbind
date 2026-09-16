"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { writeContract, type TxStage } from "@/lib/genlayer";
import { TxLifecycle } from "@/components/TxLifecycle";

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

  return (
    <div style={{ padding: "40px 24px", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 600, color: "var(--ink-on-b)", margin: 0 }}>
        Challenge {params.id}
      </h1>
      <p className="mono text-xs" style={{ color: "var(--mute)", marginTop: 10 }}>
        Submitting a challenge does not overturn the seal by itself — it flags the
        seal as CHALLENGED and surfaces your counter-evidence to anyone viewing it,
        including the owner, who can reseal once it expires or a new SHA is set.
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 28, display: "grid", gap: 20 }}>
        <label className="mono text-xs" style={{ color: "var(--mute)" }}>
          COUNTER-EVIDENCE URL
          <input
            className="hr-field"
            required
            placeholder="https://example.com/evidence-that-contradicts-the-seal"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="mono text-sm"
          style={{ color: "#000", background: "var(--lime)", padding: "12px 20px", border: "none", width: "fit-content", cursor: "pointer" }}
        >
          Submit challenge
        </button>
      </form>

      <TxLifecycle functionName="challenge" stage={stage} txHash={txHash} error={error} />

      {stage === "finalized" && (
        <button
          onClick={() => router.push(`/seal/${params.id}`)}
          className="mono text-xs"
          style={{ marginTop: 16, color: "var(--lime-hot)", background: "none", border: "none", cursor: "pointer" }}
        >
          View seal →
        </button>
      )}
    </div>
  );
}
