"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { readContract, writeContract, type TxStage } from "@/lib/genlayer";
import { TxLifecycle } from "@/components/TxLifecycle";

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
    <div style={{ padding: "40px 24px", maxWidth: 800, margin: "0 auto" }}>
      <p className="mono text-xs" style={{ color: "var(--mute)" }}>
        {tool.tool_id}
      </p>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 600, color: "var(--ink-on-b)", margin: "4px 0 0" }}>
        {tool.repo.replace("https://github.com/", "")}
      </h1>

      <dl className="mono text-xs" style={{ marginTop: 24, display: "grid", gap: 10, color: "var(--ink-on-b)" }}>
        <Row label="Pinned SHA" value={tool.sha} />
        <Row label="Policy" value={tool.policy} />
        <Row label="Owner" value={tool.owner} />
        <Row label="Endpoint" value={tool.endpoint || "(none declared)"} />
        <Row label="Claims" value={tool.claims} />
        <Row label="Updated" value={tool.updated_at} />
      </dl>

      {editing ? (
        <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
          <label className="mono text-xs" style={{ color: "var(--mute)" }}>
            New pinned SHA (must differ from the current one)
            <input
              value={editSha}
              onChange={(e) => setEditSha(e.target.value)}
              className="mono text-xs"
              style={{ width: "100%", padding: "8px 0", borderBottom: "1px solid var(--ink-on-b)", background: "none" }}
            />
          </label>
          <label className="mono text-xs" style={{ color: "var(--mute)" }}>
            Updated claims
            <textarea
              value={editClaims}
              onChange={(e) => setEditClaims(e.target.value)}
              rows={3}
              className="mono text-xs"
              style={{ width: "100%", padding: "8px 0", borderBottom: "1px solid var(--ink-on-b)", background: "none" }}
            />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={submitEdit}
              className="mono text-sm"
              style={{ color: "#000", background: "var(--lime)", padding: "8px 16px", border: "none", cursor: "pointer" }}
            >
              Submit update
            </button>
            <button
              onClick={() => setEditing(false)}
              className="mono text-sm"
              style={{ color: "var(--ink-on-b)", background: "none", border: "1px solid var(--ink-on-b)", padding: "8px 16px", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startEditing}
          className="mono text-xs"
          style={{ marginTop: 12, color: "var(--ink-on-b)", background: "none", border: "none", textDecoration: "underline", cursor: "pointer", padding: 0 }}
        >
          Edit claims (owner only)
        </button>
      )}

      <div style={{ marginTop: 24 }}>
        <p className="mono text-xs" style={{ color: "var(--mute)" }}>
          LATEST SEAL
        </p>
        {latestSeal ? (
          <Link href={`/seal/${latestSeal.seal_id}`} className="mono text-sm" style={{ color: "var(--lime-hot)" }}>
            {latestSeal.seal_id} — {latestSeal.verdict} ({latestSeal.status}) →
          </Link>
        ) : (
          <p className="mono text-xs" style={{ color: "var(--mute)" }}>
            Not sealed yet.
          </p>
        )}
      </div>

      <div style={{ marginTop: 28, display: "flex", gap: 12 }}>
        <button
          onClick={() => doSeal("seal")}
          className="mono text-sm"
          style={{ color: "#000", background: "var(--lime)", padding: "10px 18px", border: "none", cursor: "pointer" }}
        >
          Seal
        </button>
        <button
          onClick={() => doSeal("reseal")}
          className="mono text-sm"
          style={{ color: "var(--ink-on-b)", background: "none", border: "1px solid var(--ink-on-b)", padding: "10px 18px", cursor: "pointer" }}
        >
          Reseal
        </button>
        <Link
          href={`/challenge/${latestSeal?.seal_id ?? ""}`}
          className="mono text-sm"
          style={{ color: "var(--ink-on-b)", padding: "10px 18px", textDecoration: "underline" }}
        >
          Challenge latest seal
        </Link>
      </div>

      <TxLifecycle functionName="seal" stage={stage} txHash={txHash} error={txError} />
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
