"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readContract } from "@/lib/genlayer";
import { PerspectiveGrid } from "@/components/PerspectiveGrid";

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
    <div style={{ position: "relative", flex: 1 }}>
      <PerspectiveGrid />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "clamp(32px, 6vw, 64px) clamp(16px, 4vw, 48px) 80px",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(2.2rem, 5vw, 3.4rem)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "var(--ink-on-b)",
            margin: 0,
          }}
        >
          Tools
        </h1>

        {loading && (
          <p className="mono text-xs" style={{ color: "var(--mute)", marginTop: 20 }}>
            Loading…
          </p>
        )}
        {error && (
          <p className="mono text-xs" style={{ color: "#c0392b", marginTop: 20 }}>
            {error}
          </p>
        )}
        {!loading && !error && tools.length === 0 && (
          <div style={{ marginTop: 40, maxWidth: 420 }}>
            <p className="mono text-xs" style={{ color: "var(--mute)", lineHeight: 1.7 }}>
              No tools registered yet on this deployment.
            </p>
            <Link
              href="/register"
              className="mono tb-cta"
              data-on-light="true"
              style={{ marginTop: 14, fontSize: 13, display: "inline-flex" }}
            >
              Register the first one →
            </Link>
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          {tools.map((t) => (
            <Link key={t.tool_id} href={`/tools/${t.tool_id}`} className="mono tb-row">
              <span className="tb-dot" />
              <span style={{ flex: 1, fontSize: 14, color: "var(--ink-on-b)" }}>
                {t.tool_id} — {t.repo.replace("https://github.com/", "")}
              </span>
              <span style={{ fontSize: 12, color: "var(--mute)" }}>
                {t.policy} · {t.sha.slice(0, 7)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
