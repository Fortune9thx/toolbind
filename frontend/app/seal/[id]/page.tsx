"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { readContract } from "@/lib/genlayer";
import { StatusBadge } from "@/components/StatusBadge";
import { Pipeline } from "@/components/Pipeline";

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
        <p className="mono text-xs" style={{ color: "var(--c-error)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!record) {
    return (
      <div style={{ padding: 40 }}>
        <p className="mono text-xs" style={{ color: "var(--c-asphalt)" }}>
          Loading…
        </p>
      </div>
    );
  }

  const sealed = record.verdict === "SEALED" && record.status === "ACTIVE";

  return (
    <div
      style={{
        flex: 1,
        padding: "clamp(40px, 6vw, 72px) clamp(16px, 4vw, 48px) 80px",
        maxWidth: 760,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <Link href={`/tools/${record.tool_id}`} className="gl-nav-link mono text-xs">
        ← {record.tool_id}
      </Link>

      <div style={{ marginTop: 20 }}>
        <Pipeline activeIndex={4} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28 }}>
        <StatusBadge value={sealed ? "SEALED" : record.verdict} />
        <StatusBadge value={record.status} />
      </div>

      <div className="gl-card" style={{ marginTop: 20, padding: 24 }}>
        <dl className="mono" style={{ display: "grid", gap: 14, fontSize: 13 }}>
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
      </div>

      <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href={`/tools/${record.tool_id}`} className="gl-btn gl-btn-primary">
          Open tool
        </Link>
        <Link href={`/challenge/${record.seal_id}`} className="gl-btn gl-btn-destructive">
          Challenge this seal
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12 }}>
      <span style={{ color: "var(--c-asphalt)" }}>{label}</span>
      <span style={{ wordBreak: "break-all", color: "var(--c-chassis)" }}>{value}</span>
    </div>
  );
}
