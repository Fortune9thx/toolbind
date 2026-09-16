"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readContract } from "@/lib/genlayer";
import { StatusBadge } from "@/components/StatusBadge";

interface SealRecord {
  seal_id: string;
  tool_id: string;
  verdict: string;
  status: string;
  created_at: string;
}

export default function ActivityPage() {
  const router = useRouter();
  const [seals, setSeals] = useState<SealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SealRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found: SealRecord[] = [];
      // seal_id is sequential (seal-0, seal-1, ...) with no bulk-listing
      // view on-chain -- walk forward and stop at the first miss.
      for (let i = 0; i < 200; i++) {
        try {
          const raw = await readContract<string>("get_seal", [`seal-${i}`]);
          found.push(JSON.parse(raw));
        } catch {
          break;
        }
      }
      found.reverse();
      if (!cancelled) {
        setSeals(found.slice(0, 30));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        padding: "clamp(40px, 6vw, 72px) clamp(16px, 4vw, 48px) 80px",
        gap: 32,
        maxWidth: 1180,
        margin: "0 auto",
        width: "100%",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 480px" }}>
        <h1 className="display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", color: "var(--c-photon)", margin: 0 }}>
          Activity
        </h1>
        <p style={{ color: "var(--c-chassis)", fontSize: 14, marginTop: 10 }}>
          Seals and consensus outcomes, newest first.
        </p>

        {loading && (
          <p className="mono" style={{ color: "var(--c-asphalt)", fontSize: 13, marginTop: 24 }}>
            Loading…
          </p>
        )}

        <div style={{ marginTop: 24, overflowX: "auto" }}>
          <table className="mono" style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--c-asphalt)", fontSize: 11, letterSpacing: "0.06em" }}>
                <th style={{ fontWeight: 400, padding: "0 12px 10px 0" }}>TIME</th>
                <th style={{ fontWeight: 400, padding: "0 12px 10px 0" }}>SEAL</th>
                <th style={{ fontWeight: 400, padding: "0 12px 10px 0" }}>TOOL</th>
                <th style={{ fontWeight: 400, padding: "0 12px 10px 0" }}>VERDICT</th>
                <th style={{ fontWeight: 400, padding: "0 0 10px" }}>STATE</th>
              </tr>
            </thead>
            <tbody>
              {seals.map((s) => (
                <tr
                  key={s.seal_id}
                  className="gl-row"
                  style={{
                    cursor: "pointer",
                    background: selected?.seal_id === s.seal_id ? "rgba(17,15,255,0.08)" : undefined,
                  }}
                  onClick={() => setSelected(s)}
                >
                  <td style={{ padding: "0 12px 0 0", color: "var(--c-asphalt)" }}>{s.created_at.slice(0, 19)}</td>
                  <td style={{ padding: "0 12px 0 0", color: "var(--c-photon)" }}>{s.seal_id}</td>
                  <td style={{ padding: "0 12px 0 0", color: "var(--c-chassis)" }}>{s.tool_id}</td>
                  <td style={{ padding: "0 12px 0 0" }}>
                    <StatusBadge value={s.verdict} />
                  </td>
                  <td>
                    <StatusBadge value={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && seals.length === 0 && (
            <p style={{ color: "var(--c-asphalt)", fontSize: 14, marginTop: 24 }}>
              No seals yet on this network.
            </p>
          )}
        </div>
      </div>

      {selected && (
        <div className="gl-card" style={{ flex: "0 0 320px", padding: 20, height: "fit-content" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--c-asphalt)", letterSpacing: "0.06em" }}>
              SEAL INSPECTOR
            </span>
            <button
              onClick={() => setSelected(null)}
              className="gl-btn gl-btn-ghost"
              style={{ height: 24, padding: "0 8px", fontSize: 16 }}
              aria-label="Close inspector"
            >
              ×
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <span className="display" style={{ fontSize: 18, color: "var(--c-photon)" }}>
              {selected.seal_id}
            </span>
            <StatusBadge value={selected.status} />
          </div>

          <div className="mono" style={{ marginTop: 16, display: "grid", gap: 10, fontSize: 12 }}>
            <InspectorRow label="Tool" value={selected.tool_id} />
            <InspectorRow label="Verdict" value={selected.verdict} />
            <InspectorRow label="Created" value={selected.created_at} />
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
            <button onClick={() => router.push(`/tools/${selected.tool_id}`)} className="gl-btn gl-btn-primary" style={{ width: "100%" }}>
              Open tool
            </button>
            <button onClick={() => router.push(`/seal/${selected.seal_id}`)} className="gl-btn gl-btn-secondary" style={{ width: "100%" }}>
              View seal detail
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--c-asphalt)" }}>{label}</span>
      <span style={{ color: "var(--c-chassis)", wordBreak: "break-all", textAlign: "right" }}>{value}</span>
    </div>
  );
}
