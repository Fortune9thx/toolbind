"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { readContract } from "@/lib/genlayer";

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
      <div style={{ padding: 40, background: "var(--field-a)", minHeight: "60vh" }}>
        <p className="mono text-xs" style={{ color: "#ff6b6b" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!record) {
    return (
      <div style={{ padding: 40, background: "var(--field-a)", minHeight: "60vh" }}>
        <p className="mono text-xs" style={{ color: "var(--mute)" }}>
          Loading…
        </p>
      </div>
    );
  }

  const filled = record.verdict === "SEALED";

  return (
    <div style={{ padding: "40px 24px", background: "var(--field-a)", minHeight: "80vh" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Link href={`/tools/${record.tool_id}`} className="mono text-xs" style={{ color: "var(--mute)" }}>
          ← {record.tool_id}
        </Link>

        <svg viewBox="0 0 900 100" width="100%" style={{ marginTop: 20 }} aria-hidden="true">
          <path d="M50,50 C 200,10 300,90 450,50 S 700,10 850,50" fill="none" stroke="rgba(124,255,77,0.3)" strokeWidth={1} />
          {NODES.map((label, i) => {
            const x = 50 + i * 200;
            const isSeal = label === "SEAL";
            return (
              <g key={label}>
                <motion.circle
                  cx={x}
                  cy={50}
                  r={6}
                  fill={isSeal && filled ? "var(--lime)" : "none"}
                  stroke="var(--lime)"
                  strokeWidth={1}
                  initial={isSeal ? { scale: 0.6 } : false}
                  animate={isSeal && filled ? { scale: [0.6, 1.3, 1] } : {}}
                  transition={{ duration: 0.6 }}
                />
                <text x={x} y={78} textAnchor="middle" className="mono" fontSize={10} fill="var(--ink-on-a)">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>

        <div style={{ marginTop: 32 }}>
          <span
            className="mono text-xs"
            style={{
              color: filled ? "#000" : "var(--ink-on-a)",
              background: filled ? "var(--lime)" : "rgba(255,255,255,0.08)",
              padding: "4px 10px",
              border: filled ? "none" : "1px solid var(--mute)",
            }}
          >
            {record.verdict}
          </span>
          <span className="mono text-xs" style={{ marginLeft: 10, color: "var(--mute)" }}>
            {record.status}
          </span>
        </div>

        <dl className="mono text-xs" style={{ marginTop: 24, display: "grid", gap: 10, color: "var(--ink-on-a)" }}>
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

        <div style={{ marginTop: 28, display: "flex", gap: 16 }}>
          <Link href={`/challenge/${record.seal_id}`} className="mono text-xs" style={{ color: "var(--lime)" }}>
            Challenge this seal →
          </Link>
          <a
            href={`https://explorer-studio-dev.genlayer.com/address/${record.tool_id}`}
            target="_blank"
            rel="noreferrer"
            className="mono text-xs"
            style={{ color: "var(--mute)" }}
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
