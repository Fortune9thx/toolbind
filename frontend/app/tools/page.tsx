"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readContract } from "@/lib/genlayer";

interface ToolRecord {
  tool_id: string;
  repo: string;
  sha: string;
  policy: string;
  owner: string;
}

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // No bulk "list all tools" view exists on-chain by design (see
        // README): tool_id is sequential (tool-0, tool-1, ...), so this
        // page walks ids until a lookup fails. Intended for a modest
        // studio-dev tool count, not production-scale indexing.
        const found: ToolRecord[] = [];
        for (let i = 0; i < 50; i++) {
          try {
            const raw = await readContract<string>("get_tool", [`tool-${i}`]);
            found.push(JSON.parse(raw));
          } catch {
            break;
          }
        }
        if (!cancelled) setTools(found);
      } catch (err) {
        if (!cancelled) setError(String((err as Error)?.message ?? err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: "40px 24px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 600, color: "var(--ink-on-b)", margin: 0 }}>
        Tools
      </h1>
      {loading && (
        <p className="mono text-xs" style={{ color: "var(--mute)", marginTop: 16 }}>
          Loading…
        </p>
      )}
      {error && (
        <p className="mono text-xs" style={{ color: "#c0392b", marginTop: 16 }}>
          {error}
        </p>
      )}
      {!loading && !error && tools.length === 0 && (
        <p className="mono text-xs" style={{ color: "var(--mute)", marginTop: 16 }}>
          No tools registered yet on this deployment.
        </p>
      )}
      <div style={{ marginTop: 24, display: "grid", gap: 1 }}>
        {tools.map((t) => (
          <Link
            key={t.tool_id}
            href={`/tools/${t.tool_id}`}
            className="mono text-sm"
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "14px 4px",
              borderBottom: "1px solid rgba(0,0,0,0.1)",
              color: "var(--ink-on-b)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                  background: "var(--lime)",
                  display: "inline-block",
                }}
              />
              {t.tool_id} — {t.repo.replace("https://github.com/", "")}
            </span>
            <span style={{ color: "var(--mute)" }}>{t.policy} · {t.sha.slice(0, 7)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
