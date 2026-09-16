"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { writeContract, type TxStage } from "@/lib/genlayer";
import { TxLifecycle } from "@/components/TxLifecycle";
import { PerspectiveGrid } from "@/components/PerspectiveGrid";
import { PixelArrow } from "@/components/PixelArrow";

const POLICIES = ["general", "mcp-safe", "payments-safe"];

export default function RegisterPage() {
  const router = useRouter();
  const [repo, setRepo] = useState("");
  const [sha, setSha] = useState("");
  const [claims, setClaims] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [policy, setPolicy] = useState("general");

  const [stage, setStage] = useState<TxStage>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolId, setToolId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTxHash(null);
    try {
      const { result } = await writeContract(
        "register_tool",
        [repo.trim(), sha.trim(), claims.trim(), endpoint.trim(), policy],
        {
          onStage: setStage,
          onTxHash: setTxHash,
          onError: (err) => setError(String((err as Error)?.message ?? err)),
        }
      );
      const newId = typeof result === "string" ? result : (result as any)?.data ?? null;
      setToolId(newId);
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
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(2.4rem, 7vw, 4.8rem)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "var(--ink-on-b)",
            margin: 0,
            lineHeight: 0.98,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.32em",
          }}
        >
          <span>Seal it</span>
          <PixelArrow size={30} />
          <span style={{ color: "var(--lime-hot)" }}>Seal it</span>
        </h1>
        <p className="mono" style={{ color: "var(--mute)", fontSize: 13, marginTop: 16 }}>
          Register a tool at a pinned commit. Anyone can seal it afterward.
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 40, display: "grid", gap: 24, maxWidth: 560 }}>
          <label>
            <span className="hr-label">Repo (github.com URL)</span>
            <input
              className="mono hr-field"
              required
              placeholder="https://github.com/acme/mcp-tool"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            />
          </label>
          <label>
            <span className="hr-label">Commit SHA</span>
            <input
              className="mono hr-field"
              required
              placeholder="abc1234"
              value={sha}
              onChange={(e) => setSha(e.target.value)}
            />
          </label>
          <label>
            <span className="hr-label">Claims</span>
            <textarea
              className="mono hr-field"
              required
              rows={3}
              placeholder="What this tool claims to do, and how it's scoped or made safe"
              value={claims}
              onChange={(e) => setClaims(e.target.value)}
            />
          </label>
          <label>
            <span className="hr-label">Live endpoint (optional)</span>
            <input
              className="mono hr-field"
              placeholder="https://api.acme.dev/health"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </label>
          <label>
            <span className="hr-label">Policy</span>
            <select className="mono hr-field" value={policy} onChange={(e) => setPolicy(e.target.value)}>
              {POLICIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
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
            Register tool
            <PixelArrow size={13} color="currentColor" />
          </button>
        </form>

        <TxLifecycle functionName="register_tool" stage={stage} txHash={txHash} error={error} />

        {stage === "finalized" && toolId && (
          <p className="mono text-xs" style={{ marginTop: 16, color: "var(--ink-on-b)" }}>
            Registered as <b>{toolId}</b>.{" "}
            <button
              onClick={() => router.push(`/tools/${toolId}`)}
              style={{ color: "var(--lime-hot)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              View tool →
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
