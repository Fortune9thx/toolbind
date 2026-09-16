"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readContract } from "@/lib/genlayer";

interface SealRecord {
  seal_id: string;
  tool_id: string;
  verdict: string;
  status: string;
  created_at: string;
}

export default function ActivityPage() {
  const [seals, setSeals] = useState<SealRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found: SealRecord[] = [];
      // seal_id is sequential (seal-0, seal-1, ...) with no bulk-listing
      // view on-chain, so this walks forward from 0 and stops at the
      // first miss -- a fixed, small number of calls no matter how many
      // seals actually exist, unlike walking backward from an arbitrary
      // ceiling (which costs one failed call per UNUSED id below the
      // ceiling -- up to 199 wasted round-trips against a live network
      // when only a handful of seals exist).
      for (let i = 0; i < 200; i++) {
        try {
          const raw = await readContract<string>("get_seal", [`seal-${i}`]);
          found.push(JSON.parse(raw));
        } catch {
          break;
        }
      }
      // Most recent first, capped to the last 30.
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
        padding: "clamp(32px, 6vw, 64px) clamp(16px, 4vw, 48px) 80px",
        maxWidth: 900,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(2.2rem, 5vw, 3rem)",
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color: "var(--ink-on-a)",
          margin: 0,
        }}
      >
        Activity
      </h1>
      <p className="mono text-xs" style={{ color: "var(--mute)", marginTop: 10 }}>
        Recent seals, most recent first.
      </p>

      {loading && (
        <p className="mono text-xs" style={{ color: "var(--mute)", marginTop: 24 }}>
          Loading…
        </p>
      )}

      <div className="mono" style={{ marginTop: 32, fontSize: 12 }}>
        {seals.map((s) => (
          <Link
            key={s.seal_id}
            href={`/seal/${s.seal_id}`}
            style={{
              display: "flex",
              flexWrap: "wrap",
              rowGap: 4,
              columnGap: 16,
              alignItems: "baseline",
              padding: "10px 0",
              borderBottom: "1px solid rgba(124,255,77,0.12)",
              color: "var(--ink-on-a)",
            }}
          >
            <span style={{ color: "var(--mute)", flex: "0 0 auto" }}>{s.created_at.slice(0, 19)}</span>
            <span style={{ color: "var(--ink-on-a)", flex: "0 0 60px" }}>{s.seal_id}</span>
            <span style={{ color: "var(--mute)", flex: "0 0 60px" }}>{s.tool_id}</span>
            <span
              style={{
                color: s.verdict === "SEALED" ? "var(--lime-hot)" : "var(--mute)",
                flex: "0 0 100px",
              }}
            >
              {s.verdict}
            </span>
            <span style={{ color: "var(--mute)" }}>{s.status}</span>
          </Link>
        ))}
        {!loading && seals.length === 0 && (
          <p style={{ color: "var(--mute)" }}>No seals yet on this deployment.</p>
        )}
      </div>
    </div>
  );
}
