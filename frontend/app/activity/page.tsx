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
      // seal_id is sequential (seal-0, seal-1, ...); walk backwards from
      // a reasonable ceiling for a "recent activity" log rather than
      // requiring a bulk-listing view on-chain.
      for (let i = 199; i >= 0; i--) {
        try {
          const raw = await readContract<string>("get_seal", [`seal-${i}`]);
          found.push(JSON.parse(raw));
          if (found.length >= 30) break;
        } catch {
          continue;
        }
      }
      if (!cancelled) {
        setSeals(found);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: "40px 24px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 600, color: "var(--ink-on-b)", margin: 0 }}>
        Activity
      </h1>
      {loading && (
        <p className="mono text-xs" style={{ color: "var(--mute)", marginTop: 16 }}>
          Loading…
        </p>
      )}
      <div className="mono text-xs" style={{ marginTop: 24, color: "var(--ink-on-b)" }}>
        {seals.map((s) => (
          <Link
            key={s.seal_id}
            href={`/seal/${s.seal_id}`}
            style={{ display: "block", padding: "6px 0", color: "var(--ink-on-b)" }}
          >
            {s.created_at} · {s.seal_id.padEnd(10)} · {s.tool_id.padEnd(10)} ·{" "}
            <span style={{ color: s.verdict === "SEALED" ? "var(--lime-hot)" : "var(--mute)" }}>
              {s.verdict}
            </span>{" "}
            · {s.status}
          </Link>
        ))}
        {!loading && seals.length === 0 && (
          <p style={{ color: "var(--mute)" }}>No seals yet on this deployment.</p>
        )}
      </div>
    </div>
  );
}
