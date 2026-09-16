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
  created_at: string;
}

type ProbeState = { status: "idle" | "checking" | "ok" | "error"; detail: string };

export default function ToolDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tool, setTool] = useState<ToolRecord | null>(null);
  const [latestSeal, setLatestSeal] = useState<SealRecord | null>(null);
  const [seals, setSeals] = useState<SealRecord[]>([]);
  const [sealsLoading, setSealsLoading] = useState(true);
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
    setSealsLoading(true);
    try {
      const idsRaw = await readContract<string>("list_seals", [params.id]);
      const ids: string[] = JSON.parse(idsRaw);
      const records = await Promise.all(
        ids
          .slice()
          .reverse()
          .map((sealId) =>
            readContract<string>("get_seal", [sealId])
              .then((r) => JSON.parse(r) as SealRecord)
              .catch(() => null)
          )
      );
      setSeals(records.filter((r): r is SealRecord => r !== null));
    } catch {
      setSeals([]);
    } finally {
      setSealsLoading(false);
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
      <div style={{ flex: 1, padding: "32px clamp(16px, 3vw, 48px)", maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <span className="gl-skeleton" style={{ height: 28, width: 320, display: "block" }} />
        <span className="gl-skeleton" style={{ height: 200, width: "100%", display: "block", marginTop: 24 }} />
      </div>
    );
  }

  const sealed = latestSeal?.verdict === "SEALED" && latestSeal.status === "ACTIVE";
  const pipelineIndex = latestSeal ? 4 : tool.endpoint ? 2 : 1;

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
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", minWidth: 0 }}>
          <div>
            <p className="mono" style={{ fontSize: 12, color: "var(--c-asphalt)", margin: 0 }}>
              {tool.tool_id}
            </p>
            <h1 className="display" style={{ fontSize: "clamp(20px, 3vw, 28px)", color: "var(--c-photon)", margin: "2px 0 0" }}>
              {tool.repo.replace("https://github.com/", "")}
            </h1>
          </div>
          <StatusBadge value={sealed ? "SEALED" : latestSeal ? latestSeal.verdict : "UNSEALED"} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => doSeal("seal")} disabled={busy} className="gl-btn gl-btn-primary">
            Seal this tool
          </button>
          <a href={tool.repo} target="_blank" rel="noreferrer" className="gl-btn gl-btn-secondary">
            View repo
          </a>
          <button onClick={() => navigator.clipboard?.writeText(tool.sha)} className="gl-btn gl-btn-secondary">
            Copy SHA
          </button>
        </div>
      </div>

      <div className="gl-split gl-split-62" style={{ marginTop: 28 }}>
        {/* Primary column: certificate, stepper, seals table */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="gl-panel" style={{ padding: 24 }}>
            <Pipeline activeIndex={pipelineIndex} />
          </div>

          {editing ? (
            <div className="gl-panel" style={{ padding: 24, display: "grid", gap: 18 }}>
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
            <div className="gl-panel" style={{ padding: 24 }}>
              <span className="gl-label" style={{ marginBottom: 12 }}>
                Claim
              </span>
              <p className="mono" style={{ fontSize: 14, color: "var(--c-chassis)", margin: 0 }}>
                {tool.claims}
              </p>
              <button onClick={startEditing} className="gl-btn gl-btn-ghost mono" style={{ marginTop: 16, paddingLeft: 0 }}>
                Edit claim (owner only)
              </button>
            </div>
          )}

          {(stage !== "idle" || txError) && (
            <TxLifecycle functionName="seal" stage={stage} txHash={txHash} error={txError} />
          )}

          <div className="gl-panel" style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 480 }}>
                <div
                  className="mono"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--hairline)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    color: "var(--c-asphalt)",
                  }}
                >
                  <span>SEAL</span>
                  <span>VERDICT</span>
                  <span>STATUS</span>
                  <span>CREATED</span>
                </div>

                {sealsLoading &&
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="gl-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                      <span className="gl-skeleton" style={{ height: 14, width: "60%" }} />
                      <span className="gl-skeleton" style={{ height: 20, width: 70, borderRadius: 999 }} />
                      <span className="gl-skeleton" style={{ height: 20, width: 60, borderRadius: 999 }} />
                      <span className="gl-skeleton" style={{ height: 14, width: "70%" }} />
                    </div>
                  ))}

                {!sealsLoading &&
                  seals.map((s) => (
                    <Link
                      key={s.seal_id}
                      href={`/seal/${s.seal_id}`}
                      className="gl-row mono"
                      style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, fontSize: 12, color: "var(--c-photon)" }}
                    >
                      <span>{s.seal_id}</span>
                      <span>
                        <StatusBadge value={s.verdict} />
                      </span>
                      <span>
                        <StatusBadge value={s.status} />
                      </span>
                      <span style={{ color: "var(--c-asphalt)" }}>{s.created_at.slice(0, 19)}</span>
                    </Link>
                  ))}
              </div>
            </div>

            {!sealsLoading && seals.length === 0 && (
              <div className="gl-empty">
                <p style={{ color: "var(--c-asphalt)", fontSize: 13 }}>Not sealed yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Secondary column: probe, policy, expiry, tx links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: "calc(var(--header-h) + 24px)" }}>
          <div className="gl-panel" style={{ padding: 20 }}>
            <dl className="mono" style={{ display: "grid", gap: 14, fontSize: 13 }}>
              <Row label="Pinned SHA" value={tool.sha} />
              <Row label="Policy" value={tool.policy} />
              <Row label="Owner" value={tool.owner} />
              <Row label="Updated" value={tool.updated_at} />
              {latestSeal && <Row label="Expiry" value={latestSeal.expiry_at} />}
              {tool.endpoint && (
                <Row
                  label="Live endpoint"
                  value={tool.endpoint}
                  trailing={
                    probe.status === "idle" || probe.status === "checking" ? (
                      <span style={{ color: "var(--c-asphalt)" }}>{probe.status === "checking" ? "probing…" : ""}</span>
                    ) : (
                      <span style={{ color: probe.status === "ok" ? "var(--c-success)" : "var(--c-error)" }}>{probe.detail}</span>
                    )
                  }
                />
              )}
            </dl>
          </div>

          <div className="gl-panel" style={{ padding: 20, display: "grid", gap: 10 }}>
            {latestSeal && (
              <button onClick={() => doSeal("reseal")} disabled={busy} className="gl-btn gl-btn-secondary" style={{ width: "100%" }}>
                Reseal
              </button>
            )}
            {tool.endpoint && (
              <a href={tool.endpoint} target="_blank" rel="noreferrer" className="gl-btn gl-btn-secondary" style={{ width: "100%" }}>
                Open live endpoint
              </a>
            )}
            {latestSeal && (
              <Link href={`/seal/${latestSeal.seal_id}`} className="gl-btn gl-btn-ghost" style={{ width: "100%" }}>
                View latest seal
              </Link>
            )}
            <a
              href={explorerAddressUrl(CONTRACT_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="gl-btn gl-btn-ghost"
              style={{ width: "100%" }}
            >
              View on explorer
            </a>
            {latestSeal && (
              <Link href={`/challenge/${latestSeal.seal_id}`} className="gl-btn gl-btn-destructive" style={{ width: "100%" }}>
                Challenge latest seal
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, trailing }: { label: string; value: string; trailing?: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 4 }}>
      <span style={{ color: "var(--c-asphalt)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ wordBreak: "break-all", color: "var(--c-chassis)" }}>{value}</span>
        {trailing}
      </span>
    </div>
  );
}
