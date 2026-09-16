"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { readContract } from "@/lib/genlayer";
import { PixelArrow } from "@/components/PixelArrow";

interface SealRecord {
  seal_id: string;
  tool_id: string;
  sha: string;
  policy: string;
  verdict: string;
  approved: boolean;
  confidence: string;
  risk: string;
  reason: string;
  evidence_digest: string;
  created_at: string;
  expiry_at: string;
  challenger: string;
  status: string;
}

const NODES = ["REPO", "SHA", "EVIDENCE", "CONSENSUS", "SEAL"];
const PATH_D = "M50,58 C 190,10 260,102 400,58 S 620,10 750,58";

export default function SealDetailPage() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<SealRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readContract<string>("get_seal", [params.id])
      .then((raw) => setRecord(JSON.parse(raw)))
      .catch((err) => setError(String((err as Error)?.message ?? err)));
  }, [params.id]);

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <p className="mono text-xs" style={{ color: "#ff6b6b" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!record) {
    return (
      <div style={{ padding: 40 }}>
        <p className="mono text-xs" style={{ color: "var(--mute)" }}>
          Loading…
        </p>
      </div>
    );
  }

  const filled = record.verdict === "SEALED";

  return (
    <div style={{ padding: "clamp(32px, 6vw, 56px) clamp(16px, 4vw, 48px) 80px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Link href={`/tools/${record.tool_id}`} className="mono tb-nav-link text-xs">
          ← {record.tool_id}
        </Link>

        <svg viewBox="0 0 800 110" width="100%" style={{ marginTop: 24, maxWidth: 800 }} aria-hidden="true">
          <path d={PATH_D} fill="none" stroke="rgba(124,255,77,0.3)" strokeWidth={1} />
          {NODES.map((label, i) => {
            const x = 50 + i * 175;
            const isSeal = label === "SEAL";
            return (
              <g key={label}>
                <motion.circle
                  cx={x}
                  cy={58}
                  r={isSeal ? 12 : 5}
                  fill={isSeal && filled ? "var(--lime)" : isSeal ? "none" : "var(--lime)"}
                  stroke="var(--lime)"
                  strokeWidth={isSeal ? 1.5 : 0}
                  initial={isSeal ? { scale: 0.6 } : false}
                  animate={isSeal ? { scale: [0.6, 1.25, 1] } : {}}
                  transition={{ duration: 0.55, delay: 0.2 }}
                />
                <text x={x} y={86} textAnchor="middle" className="mono" fontSize={10} letterSpacing={1.5} fill="var(--mute)">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>

        <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 14 }}>
          <span
            className="mono text-xs"
            style={{
              color: filled ? "#000" : "var(--ink-on-a)",
              background: filled ? "var(--lime)" : "transparent",
              border: filled ? "none" : "1px solid var(--mute)",
              padding: "5px 12px",
              letterSpacing: "0.08em",
            }}
          >
            {record.verdict}
          </span>
          <span className="mono text-xs" style={{ color: "var(--mute)" }}>
            {record.status}
          </span>
        </div>

        <dl className="mono text-xs" style={{ marginTop: 28, display: "grid", gap: 12, color: "var(--ink-on-a)" }}>
          <Row label="Seal ID" value={record.seal_id} />
          <Row label="SHA" value={record.sha} />
          <Row label="Policy" value={record.policy} />
          <Row label="Confidence" value={record.confidence} />
          <Row label="Risk" value={record.risk} />
          <Row label="Reason" value={record.reason} />
          <Row label="Bound evidence" value={record.evidence_digest} />
          <Row label="Created" value={record.created_at} />
          <Row label="Expires" value={record.expiry_at} />
          {record.challenger && <Row label="Challenger" value={record.challenger} />}
        </dl>

        <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 32 }}>
          <Link href={`/challenge/${record.seal_id}`} className="mono tb-cta text-sm">
            Challenge this seal
            <PixelArrow size={12} />
          </Link>
          <a
            href={`https://explorer-studio-dev.genlayer.com/address/${record.tool_id}`}
            target="_blank"
            rel="noreferrer"
            className="mono tb-nav-link text-xs"
          >
            Explorer ↗
          </a>
        </div>
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
