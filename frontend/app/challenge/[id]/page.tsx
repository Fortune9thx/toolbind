"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { writeContract, useToolBindClient, type TxStage } from "@/lib/genlayer";
import { TxLifecycle } from "@/components/TxLifecycle";

export default function ChallengePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { client, isConnected } = useToolBindClient();
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [stage, setStage] = useState<TxStage>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTxHash(null);
    if (!client) {
      setError("Connect a wallet first.");
      return;
    }
    try {
      await writeContract(client, "challenge", [params.id, evidenceUrl.trim()], {
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
    <div
      style={{
        flex: 1,
        padding: "clamp(40px, 6vw, 72px) clamp(16px, 4vw, 48px) 80px",
        maxWidth: 640,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <h1 className="display" style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.1rem)", color: "var(--c-photon)", margin: 0 }}>
        Challenge <span className="mono" style={{ color: "var(--c-warn)", fontSize: "0.7em" }}>{params.id}</span>
      </h1>
      <p style={{ color: "var(--c-chassis)", fontSize: 14, marginTop: 14, lineHeight: 1.7, maxWidth: 480 }}>
        Submitting a challenge does not overturn the seal by itself — it flags the
        seal as CHALLENGED and surfaces your counter-evidence to anyone viewing it,
        including the owner, who can reseal once it expires or a new SHA is set.
      </p>

      <form onSubmit={onSubmit} className="gl-card" style={{ marginTop: 28, padding: 24, display: "grid", gap: 20, maxWidth: 480 }}>
        <div>
          <label htmlFor="evidence" className="gl-label">
            Counter-evidence URL
          </label>
          <input
            id="evidence"
            className="gl-input mono"
            required
            placeholder="https://example.com/evidence-that-contradicts-the-seal"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
          />
        </div>
        <button type="submit" disabled={busy || !isConnected} className="gl-btn gl-btn-primary" style={{ width: "fit-content" }}>
          {isConnected ? "Submit challenge" : "Connect wallet to submit"}
        </button>
      </form>

      <TxLifecycle functionName="challenge" stage={stage} txHash={txHash} error={error} />

      {stage === "finalized" && (
        <button onClick={() => router.push(`/seal/${params.id}`)} className="gl-btn gl-btn-secondary" style={{ marginTop: 18 }}>
          View seal
        </button>
      )}
    </div>
  );
}
