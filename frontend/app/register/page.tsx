"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { writeContract, type TxStage } from "@/lib/genlayer";
import { TxLifecycle } from "@/components/TxLifecycle";

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

  return (
    <div style={{ padding: "40px 24px", maxWidth: 900, margin: "0 auto" }}>
      <GridBg />
      <h1
        style={{
          fontSize: "clamp(2rem, 5vw, 3.4rem)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--ink-on-b)",
          margin: 0,
          lineHeight: 1,
        }}
      >
        Seal it →<span style={{ color: "var(--lime-hot)" }}> Seal it</span>
      </h1>
      <p className="mono" style={{ color: "var(--mute)", fontSize: 13, marginTop: 12 }}>
        Register a tool at a pinned commit. Anyone can seal it afterward.
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 32, display: "grid", gap: 20, maxWidth: 560 }}>
        <label className="mono text-xs" style={{ color: "var(--mute)" }}>
          REPO (github.com URL)
          <input
            className="hr-field"
            required
            placeholder="https://github.com/acme/mcp-tool"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
          />
        </label>
        <label className="mono text-xs" style={{ color: "var(--mute)" }}>
          COMMIT SHA
          <input
            className="hr-field"
            required
            placeholder="abc1234"
            value={sha}
            onChange={(e) => setSha(e.target.value)}
          />
        </label>
        <label className="mono text-xs" style={{ color: "var(--mute)" }}>
          CLAIMS
          <textarea
            className="hr-field"
            required
            rows={3}
            placeholder="What this tool claims to do and how it's scoped/safe"
            value={claims}
            onChange={(e) => setClaims(e.target.value)}
          />
        </label>
        <label className="mono text-xs" style={{ color: "var(--mute)" }}>
          LIVE ENDPOINT (optional)
          <input
            className="hr-field"
            placeholder="https://api.acme.dev/health"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
          />
        </label>
        <label className="mono text-xs" style={{ color: "var(--mute)" }}>
          POLICY
          <select
            className="hr-field"
            value={policy}
            onChange={(e) => setPolicy(e.target.value)}
          >
            {POLICIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={stage !== "idle" && stage !== "finalized" && stage !== "error"}
          className="mono text-sm"
          style={{
            color: "#000",
            background: "var(--lime)",
            padding: "12px 20px",
            border: "none",
            width: "fit-content",
            cursor: "pointer",
          }}
        >
          Register tool
        </button>
      </form>

      <TxLifecycle functionName="register_tool" stage={stage} txHash={txHash} error={error} />

      {stage === "finalized" && toolId && (
        <p className="mono text-xs" style={{ marginTop: 16, color: "var(--ink-on-b)" }}>
          Registered as <b>{toolId}</b>.{" "}
          <button
            onClick={() => router.push(`/tools/${toolId}`)}
            style={{ color: "var(--lime-hot)", background: "none", border: "none", cursor: "pointer" }}
          >
            View tool →
          </button>
        </p>
      )}
    </div>
  );
}

function GridBg() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: -1, opacity: 0.15, width: "100%", height: "100%" }}
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--lime)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}
