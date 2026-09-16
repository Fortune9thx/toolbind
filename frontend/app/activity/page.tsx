"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readContract, explorerAddressUrl, CONTRACT_ADDRESS } from "@/lib/genlayer";
import { StatusBadge } from "@/components/StatusBadge";
import { CertificatePreview } from "@/components/CertificatePreview";

interface SealRecord {
  seal_id: string;
  tool_id: string;
  verdict: string;
  status: string;
  created_at: string;
  sha?: string;
  policy?: string;
  expiry_at?: string;
}

const COLUMNS = "1.3fr 0.7fr 0.7fr 0.9fr 0.8fr 0.6fr";

export default function ActivityPage() {
  const [seals, setSeals] = useState<SealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SealRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found: SealRecord[] = [];
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
        padding: "32px clamp(16px, 3vw, 48px) 64px",
        maxWidth: 1280,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div className="gl-page-header">
        <h1 className="gl-page-title display">Activity</h1>
      </div>
      <p style={{ color: "var(--c-chassis)", fontSize: 14, marginTop: 8 }}>
        Seals and consensus outcomes, newest first.
      </p>

      <div className="gl-split gl-split-62" style={{ marginTop: 24 }}>
        <div className="gl-panel" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 640 }}>
              <div
                className="mono"
                style={{
                  display: "grid",
                  gridTemplateColumns: COLUMNS,
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--hairline)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  color: "var(--c-asphalt)",
                }}
              >
                <span>TIME</span>
                <span>SEAL</span>
                <span>TOOL</span>
                <span>VERDICT</span>
                <span>STATE</span>
                <span>TX</span>
              </div>

              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="gl-row" style={{ display: "grid", gridTemplateColumns: COLUMNS, gap: 12 }}>
                    <span className="gl-skeleton" style={{ height: 14, width: "80%" }} />
                    <span className="gl-skeleton" style={{ height: 14, width: "50%" }} />
                    <span className="gl-skeleton" style={{ height: 14, width: "50%" }} />
                    <span className="gl-skeleton" style={{ height: 20, width: 70, borderRadius: 999 }} />
                    <span className="gl-skeleton" style={{ height: 20, width: 60, borderRadius: 999 }} />
                    <span className="gl-skeleton" style={{ height: 14, width: "40%" }} />
                  </div>
                ))}

              {!loading &&
                seals.map((s) => (
                  <button
                    key={s.seal_id}
                    onClick={() => setSelected(s)}
                    className="gl-row mono"
                    data-selected={selected?.seal_id === s.seal_id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: COLUMNS,
                      gap: 12,
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "var(--c-asphalt)" }}>{s.created_at.slice(0, 19)}</span>
                    <span style={{ color: "var(--c-photon)" }}>{s.seal_id}</span>
                    <span style={{ color: "var(--c-chassis)" }}>{s.tool_id}</span>
                    <span>
                      <StatusBadge value={s.verdict} />
                    </span>
                    <span>
                      <StatusBadge value={s.status} />
                    </span>
                    <span style={{ color: "var(--c-asphalt)" }}>—</span>
                  </button>
                ))}
            </div>
          </div>

          {!loading && seals.length === 0 && (
            <div className="gl-empty">
              <p style={{ color: "var(--c-photon)", fontSize: 15 }}>No seals on Studio Next yet.</p>
              <p style={{ color: "var(--c-asphalt)", fontSize: 13 }}>Seal a registered tool to start the ledger.</p>
            </div>
          )}
        </div>

        <div style={{ position: "sticky", top: "calc(var(--header-h) + 24px)" }}>
          {selected ? (
            <SealInspector seal={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="gl-panel gl-empty" style={{ minHeight: 240 }}>
              <p style={{ color: "var(--c-asphalt)", fontSize: 14 }}>Select a seal.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SealInspector({ seal, onClose }: { seal: SealRecord; onClose: () => void }) {
  return (
    <div className="gl-panel" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--c-asphalt)", letterSpacing: "0.06em" }}>
          SEAL INSPECTOR
        </span>
        <button
          onClick={onClose}
          className="gl-btn gl-btn-ghost"
          style={{ height: 24, padding: "0 8px", fontSize: 16 }}
          aria-label="Close inspector"
        >
          ×
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <CertificatePreview
          slug={seal.tool_id}
          sha={seal.sha ?? "—"}
          policy={seal.policy ?? "—"}
          status={seal.status === "ACTIVE" && seal.verdict === "SEALED" ? "SEALED" : seal.verdict}
          expiry={expiryLabel(seal.expiry_at)}
          pipelineIndex={4}
        />
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
        <Link href={`/tools/${seal.tool_id}`} className="gl-btn gl-btn-primary" style={{ width: "100%" }}>
          Open tool
        </Link>
        <Link href={`/seal/${seal.seal_id}`} className="gl-btn gl-btn-secondary" style={{ width: "100%" }}>
          View seal detail
        </Link>
        <a
          href={explorerAddressUrl(CONTRACT_ADDRESS)}
          target="_blank"
          rel="noreferrer"
          className="gl-btn gl-btn-ghost"
          style={{ width: "100%" }}
        >
          View on explorer
        </a>
      </div>
    </div>
  );
}

function expiryLabel(expiryIso?: string): string {
  if (!expiryIso) return "—";
  const ms = new Date(expiryIso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / 86_400_000);
  return `${days}d remaining`;
}
