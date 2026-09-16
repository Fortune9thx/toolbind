"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { readContract, writeContract, type TxStage } from "@/lib/genlayer";
import { TxLifecycle } from "@/components/TxLifecycle";
import { PerspectiveGrid } from "@/components/PerspectiveGrid";
import { PixelArrow } from "@/components/PixelArrow";

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

export default function ToolDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tool, setTool] = useState<ToolRecord | null>(null);
  const [latestSeal, setLatestSeal] = useState<SealRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      // handled via onError -- update_claims is owner-only and requires a
      // new sha, so a non-owner call or an unchanged sha surfaces here as
      // a clear contract-side revert message rather than failing silently.
    }
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <p className="mono text-xs" style={{ color: "#c0392b" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!tool) {
    return (
      <div style={{ padding: 40 }}>
        <p className="mono text-xs" style={{ color: "var(--mute)" }}>
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <PerspectiveGrid />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "clamp(32px, 6vw, 64px) clamp(16px, 4vw, 48px) 80px",
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <p className="mono text-xs" style={{ color: "var(--mute)" }}>
          {tool.tool_id}
        </p>
        <h1
          style={{
            fontSize: "clamp(1.9rem, 4.5vw, 2.6rem)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--ink-on-b)",
            margin: "4px 0 0",
          }}
        >
          {tool.repo.replace("https://github.com/", "")}
        </h1>

        <dl className="mono text-xs" style={{ marginTop: 28, display: "grid", gap: 12, color: "var(--ink-on-b)" }}>
          <Row label="Pinned SHA" value={tool.sha} />
          <Row label="Policy" value={tool.policy} />
          <Row label="Owner" value={tool.owner} />
          <Row label="Endpoint" value={tool.endpoint || "(none declared)"} />
          <Row label="Claims" value={tool.claims} />
          <Row label="Updated" value={tool.updated_at} />
        </dl>

        {editing ? (
          <div style={{ marginTop: 28, display: "grid", gap: 20, maxWidth: 480 }}>
            <label>
              <span className="hr-label">New pinned SHA (must differ from the current one)</span>
              <input
                className="mono hr-field"
                value={editSha}
                onChange={(e) => setEditSha(e.target.value)}
              />
            </label>
            <label>
              <span className="hr-label">Updated claims</span>
              <textarea
                className="mono hr-field"
                value={editClaims}
                onChange={(e) => setEditClaims(e.target.value)}
                rows={3}
              />
            </label>
            <div style={{ display: "flex", gap: 28 }}>
              <button
                onClick={submitEdit}
                className="mono tb-cta"
                data-on-light="true"
                style={{ border: "none", cursor: "pointer", fontSize: 13, padding: 0 }}
              >
                Submit update
                <PixelArrow size={12} color="currentColor" />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="mono tb-nav-link"
                style={{ border: "none", cursor: "pointer", fontSize: 13, padding: 0 }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={startEditing}
            className="mono tb-nav-link text-xs"
            style={{ marginTop: 16, border: "none", cursor: "pointer", padding: 0 }}
          >
            Edit claims (owner only)
          </button>
        )}

        <div style={{ marginTop: 32 }}>
          <p className="hr-label" style={{ marginBottom: 8 }}>
            Latest seal
          </p>
          {latestSeal ? (
            <Link href={`/seal/${latestSeal.seal_id}`} className="mono tb-cta text-sm" data-on-light="true">
              {latestSeal.seal_id} — {latestSeal.verdict} ({latestSeal.status})
              <PixelArrow size={11} color="currentColor" />
            </Link>
          ) : (
            <p className="mono text-xs" style={{ color: "var(--mute)" }}>
              Not sealed yet.
            </p>
          )}
        </div>

        <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 32 }}>
          <button
            onClick={() => doSeal("seal")}
            disabled={busy}
            className="mono tb-cta"
            data-on-light="true"
            style={{ border: "none", cursor: busy ? "default" : "pointer", fontSize: 14, padding: 0, opacity: busy ? 0.5 : 1 }}
          >
            Seal
            <PixelArrow size={12} color="currentColor" />
          </button>
          <button
            onClick={() => doSeal("reseal")}
            disabled={busy}
            className="mono tb-nav-link"
            style={{ border: "none", cursor: busy ? "default" : "pointer", fontSize: 14, padding: 0, opacity: busy ? 0.5 : 1 }}
          >
            Reseal
          </button>
          <Link href={`/challenge/${latestSeal?.seal_id ?? ""}`} className="mono tb-nav-link text-sm">
            Challenge latest seal
          </Link>
        </div>

        <TxLifecycle functionName="seal" stage={stage} txHash={txHash} error={txError} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12 }}>
      <span style={{ color: "var(--mute)" }}>{label}</span>
      <span style={{ wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}
