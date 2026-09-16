"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { readContract, writeContract, explorerAddressUrl, CONTRACT_ADDRESS, type TxStage } from "@/lib/genlayer";
import { TxLifecycle } from "@/components/TxLifecycle";
import { StatusBadge } from "@/components/StatusBadge";
import { Pipeline } from "@/components/Pipeline";

interface ToolRecord {
  tool_id: string;
  owner: string;
  repo: string;
  sha: string;
  claims: string;
  endpoint: string;
  policy: string;
  created_at: string;
  updated_at: string;
}

interface SealRecord {
  seal_id: string;
  verdict: string;
  status: string;
  expiry_at: string;
}

type ProbeState = { status: "idle" | "checking" | "ok" | "error"; detail: string };

export default function ToolDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tool, setTool] = useState<ToolRecord | null>(null);
  const [latestSeal, setLatestSeal] = useState<SealRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [probe, setProbe] = useState<ProbeState>({ status: "idle", detail: "" });

  const [stage, setStage] = useState<TxStage>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editClaims, setEditClaims] = useState("");
  const [editSha, setEditSha] = useState("");

  async function load() {
    try {
      const raw = await readContract<string>("get_tool", [params.id]);
      setTool(JSON.parse(raw));
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
      return;
    }
    try {
      const raw = await readContract<string>("get_latest_seal", [params.id]);
      setLatestSeal(JSON.parse(raw));
    } catch {
      setLatestSeal(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (!tool?.endpoint) return;
    let cancelled = false;
    setProbe({ status: "checking", detail: "" });
    const started = performance.now();
    const timeout = setTimeout(() => {
      if (!cancelled) setProbe({ status: "error", detail: "timed out" });
    }, 5000);
    fetch(tool.endpoint, { mode: "cors" })
      .then((res) => {
        if (cancelled) return;
        clearTimeout(timeout);
        const ms = Math.round(performance.now() - started);
        setProbe({ status: res.ok ? "ok" : "error", detail: `${res.status} · ${ms}ms` });
      })
      .catch(() => {
        if (cancelled) return;
        clearTimeout(timeout);
        setProbe({ status: "error", detail: "unreachable from this browser (CORS or offline)" });
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [tool?.endpoint]);

  const busy = stage !== "idle" && stage !== "finalized" && stage !== "error";

  async function doSeal(fn: "seal" | "reseal") {
    setTxError(null);
    setTxHash(null);
    try {
      const { result } = await writeContract(fn, [params.id], {
        onStage: setStage,
        onTxHash: setTxHash,
        onError: (err) => setTxError(String((err as Error)?.message ?? err)),
      });
      const sealId = typeof result === "string" ? result : (result as any)?.data ?? null;
      if (sealId) router.push(`/seal/${sealId}`);
      else await load();
    } catch {
      // handled via onError
    }
  }

  function startEditing() {
    setEditClaims(tool?.claims ?? "");
    setEditSha(tool?.sha ?? "");
    setEditing(true);
  }

  async function submitEdit() {
    setTxError(null);
    setTxHash(null);
    try {
      await writeContract("update_claims", [params.id, editClaims, editSha], {
        onStage: setStage,
        onTxHash: setTxHash,
        onError: (err) => setTxError(String((err as Error)?.message ?? err)),
      });
      setEditing(false);
      await load();
    } catch {
      // handled via onError
    }
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <p className="mono text-xs" style={{ color: "var(--c-error)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!tool) {
    return (
      <div style={{ padding: 40 }}>
        <p className="mono text-xs" style={{ color: "var(--c-asphalt)" }}>
          Loading…
        </p>
      </div>
    );
  }

  const sealed = latestSeal?.verdict === "SEALED" && latestSeal.status === "ACTIVE";
  const pipelineIndex = latestSeal ? 4 : tool.endpoint ? 2 : 1;

  return (
    <div
      style={{
        flex: 1,
        padding: "clamp(40px, 6vw, 72px) clamp(16px, 4vw, 48px) 80px",
        maxWidth: 900,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <p className="mono" style={{ fontSize: 12, color: "var(--c-asphalt)" }}>
        {tool.tool_id}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
        <h1 className="display" style={{ fontSize: "clamp(1.7rem, 4vw, 2.2rem)", color: "var(--c-photon)", margin: 0 }}>
          {tool.repo.replace("https://github.com/", "")}
        </h1>
        <StatusBadge value={sealed ? "SEALED" : latestSeal ? latestSeal.verdict : "UNSEALED"} />
      </div>

      <div style={{ marginTop: 24 }}>
        <Pipeline activeIndex={pipelineIndex} />
      </div>

      <div className="gl-card" style={{ marginTop: 28, padding: 24 }}>
        <dl className="mono" style={{ display: "grid", gap: 14, fontSize: 13 }}>
          <Row label="Pinned SHA" value={tool.sha} />
          <Row label="Policy" value={tool.policy} />
          <Row label="Owner" value={tool.owner} />
          <Row label="Claim" value={tool.claims} />
          <Row label="Updated" value={tool.updated_at} />
          {tool.endpoint && (
            <Row
              label="Live endpoint"
              value={tool.endpoint}
              trailing={
                probe.status === "idle" || probe.status === "checking" ? (
                  <span style={{ color: "var(--c-asphalt)" }}>{probe.status === "checking" ? "probing…" : ""}</span>
                ) : (
                  <span style={{ color: probe.status === "ok" ? "var(--c-success)" : "var(--c-error)" }}>
                    {probe.detail}
                  </span>
                )
              }
            />
          )}
        </dl>
      </div>

      {editing ? (
        <div className="gl-card" style={{ marginTop: 20, padding: 24, display: "grid", gap: 18, maxWidth: 520 }}>
          <div>
            <label htmlFor="edit-sha" className="gl-label">
              New pinned SHA (must differ from the current one)
            </label>
            <input id="edit-sha" className="gl-input mono" value={editSha} onChange={(e) => setEditSha(e.target.value)} />
          </div>
          <div>
            <label htmlFor="edit-claims" className="gl-label">
              Updated claim
            </label>
            <textarea id="edit-claims" className="gl-input" rows={3} value={editClaims} onChange={(e) => setEditClaims(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={submitEdit} className="gl-btn gl-btn-primary">
              Submit update
            </button>
            <button onClick={() => setEditing(false)} className="gl-btn gl-btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={startEditing} className="gl-btn gl-btn-ghost mono" style={{ marginTop: 16, paddingLeft: 0 }}>
          Edit claim (owner only)
        </button>
      )}

      <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button onClick={() => doSeal("seal")} disabled={busy} className="gl-btn gl-btn-primary">
          Seal this tool
        </button>
        {latestSeal && (
          <button onClick={() => doSeal("reseal")} disabled={busy} className="gl-btn gl-btn-secondary">
            Reseal
          </button>
        )}
        <a href={tool.repo} target="_blank" rel="noreferrer" className="gl-btn gl-btn-secondary">
          View repo
        </a>
        <button
          onClick={() => navigator.clipboard?.writeText(tool.sha)}
          className="gl-btn gl-btn-secondary"
        >
          Copy SHA
        </button>
        {tool.endpoint && (
          <a href={tool.endpoint} target="_blank" rel="noreferrer" className="gl-btn gl-btn-secondary">
            Open live endpoint
          </a>
        )}
        {latestSeal && (
          <Link href={`/seal/${latestSeal.seal_id}`} className="gl-btn gl-btn-ghost">
            View seal
          </Link>
        )}
        <a href={explorerAddressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer" className="gl-btn gl-btn-ghost">
          View on explorer
        </a>
        {latestSeal && (
          <Link href={`/challenge/${latestSeal.seal_id}`} className="gl-btn gl-btn-destructive">
            Challenge latest seal
          </Link>
        )}
      </div>

      <TxLifecycle functionName="seal" stage={stage} txHash={txHash} error={txError} />
    </div>
  );
}

function Row({ label, value, trailing }: { label: string; value: string; trailing?: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, alignItems: "baseline" }}>
      <span style={{ color: "var(--c-asphalt)" }}>{label}</span>
      <span style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ wordBreak: "break-all", color: "var(--c-chassis)" }}>{value}</span>
        {trailing}
      </span>
    </div>
  );
}
