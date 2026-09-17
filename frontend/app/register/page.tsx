"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { writeContract, useToolBindClient, type TxStage } from "@/lib/genlayer";
import { TxLifecycle } from "@/components/TxLifecycle";
import { CertificatePreview } from "@/components/CertificatePreview";

const POLICIES = [
  { value: "general", label: "General" },
  { value: "mcp-safe", label: "Restricted" },
  { value: "payments-safe", label: "Internal" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { client, isConnected } = useToolBindClient();
  const [repo, setRepo] = useState("");
  const [sha, setSha] = useState("");
  const [claims, setClaims] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [policy, setPolicy] = useState("general");

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
      const { result } = await writeContract(
        client,
        "register_tool",
        [repo.trim(), sha.trim(), claims.trim(), endpoint.trim(), policy],
        {
          onStage: setStage,
          onTxHash: setTxHash,
          onError: (err) => setError(String((err as Error)?.message ?? err)),
        }
      );
      const newId = typeof result === "string" ? result : null;
      if (newId) router.push(`/tools/${newId}`);
    } catch {
      // handled via onError
    }
  }

  const busy = stage !== "idle" && stage !== "finalized" && stage !== "error";
  const slug = repo.trim().replace(/^https?:\/\/github\.com\//i, "");
  const pipelineIndex = claims.trim() ? 3 : sha.trim() ? 2 : repo.trim() ? 1 : 0;

  return (
    <div
      style={{
        flex: 1,
        padding: "32px clamp(16px, 3vw, 48px) 64px",
        maxWidth: 1280,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div className="gl-page-header">
        <h1 className="gl-page-title display">Register a tool</h1>
      </div>
      <p style={{ color: "var(--c-chassis)", fontSize: 14, marginTop: 8 }}>
        Pin a GitHub repo at a commit. Anyone can seal it afterward.
      </p>

      <div className="gl-split gl-split-58" style={{ marginTop: 28 }}>
        <form onSubmit={onSubmit} className="gl-panel" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 24, display: "grid", gap: 22 }}>
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
              <p className="gl-help">What this tool does, how it is scoped, and why an agent can treat it as safe.</p>
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
                  border: "1px solid var(--hairline-strong)",
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
                      background: policy === p.value ? "var(--s-hover)" : "transparent",
                      borderRight: p !== POLICIES[POLICIES.length - 1] ? "1px solid var(--hairline-strong)" : "none",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {stage !== "idle" && <TxLifecycle functionName="register_tool" stage={stage} txHash={txHash} error={error} />}
          </div>

          <div
            style={{
              marginTop: "auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "18px 24px",
              borderTop: "1px solid var(--hairline)",
            }}
          >
            <button type="button" onClick={() => router.back()} className="gl-btn gl-btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={busy || !isConnected} className="gl-btn gl-btn-primary">
              {isConnected ? "Register tool" : "Connect wallet to register"}
            </button>
          </div>
        </form>

        <div>
          <CertificatePreview slug={slug} sha={sha.trim()} policy={policy} pipelineIndex={pipelineIndex} />
          <p className="mono gl-help" style={{ marginTop: 12 }}>
            {slug || sha.trim() ? "Preview only — nothing is on-chain until you register." : "Nothing is on-chain until you register."}
          </p>
        </div>
      </div>
    </div>
  );
}
