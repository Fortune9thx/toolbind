"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { writeContract, type TxStage } from "@/lib/genlayer";
import { TxLifecycle } from "@/components/TxLifecycle";

const POLICIES = [
  { value: "general", label: "General" },
  { value: "mcp-safe", label: "Restricted" },
  { value: "payments-safe", label: "Internal" },
];

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
      if (newId) router.push(`/tools/${newId}`);
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
        maxWidth: 720,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <h1 className="display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", color: "var(--c-photon)", margin: 0 }}>
        Register a tool
      </h1>
      <p style={{ color: "var(--c-chassis)", fontSize: 14, marginTop: 10 }}>
        Pin a GitHub repo at a commit. Anyone can seal it afterward.
      </p>

      <form onSubmit={onSubmit} className="gl-card" style={{ marginTop: 28, padding: 28, display: "grid", gap: 20 }}>
        <div>
          <label htmlFor="repo" className="gl-label">
            Repo
          </label>
          <input
            id="repo"
            className="gl-input mono"
            required
            placeholder="https://github.com/acme/payments-mcp"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="sha" className="gl-label">
            Commit SHA
          </label>
          <input
            id="sha"
            className="gl-input mono"
            required
            placeholder="8f3c1a2b9d4e"
            value={sha}
            onChange={(e) => setSha(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="claim" className="gl-label">
            Claim
          </label>
          <textarea
            id="claim"
            className="gl-input"
            required
            rows={3}
            placeholder="Read-only MCP server for Stripe payment status. No write methods. Scoped to a single merchant account."
            value={claims}
            onChange={(e) => setClaims(e.target.value)}
          />
          <p style={{ color: "var(--c-asphalt)", fontSize: 12, marginTop: 6 }}>
            What this tool does, how it is scoped, and why an agent can treat it as safe.
          </p>
        </div>
        <div>
          <label htmlFor="endpoint" className="gl-label">
            Live endpoint <span style={{ color: "var(--c-asphalt)" }}>optional</span>
          </label>
          <input
            id="endpoint"
            className="gl-input mono"
            placeholder="https://mcp.acme.dev/health"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
          />
        </div>
        <div>
          <span className="gl-label">Policy</span>
          <div
            role="radiogroup"
            aria-label="Policy"
            style={{
              display: "flex",
              border: "1.2px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {POLICIES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={policy === p.value}
                onClick={() => setPolicy(p.value)}
                className="mono"
                style={{
                  flex: 1,
                  padding: "10px 0",
                  fontSize: 13,
                  cursor: "pointer",
                  color: policy === p.value ? "var(--c-photon)" : "var(--c-asphalt)",
                  background: policy === p.value ? "var(--c-graphite)" : "transparent",
                  borderRight: p !== POLICIES[POLICIES.length - 1] ? "1.2px solid rgba(255,255,255,0.12)" : "none",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <button
            type="button"
            onClick={() => router.back()}
            className="gl-btn gl-btn-ghost"
          >
            Cancel
          </button>
          <button type="submit" disabled={busy} className="gl-btn gl-btn-primary">
            Register tool
          </button>
        </div>

        <p style={{ color: "var(--c-asphalt)", fontSize: 12 }}>
          Registration writes the bind on-chain. Sealing is a separate consensus transaction.
        </p>
      </form>

      <TxLifecycle functionName="register_tool" stage={stage} txHash={txHash} error={error} />
    </div>
  );
}
