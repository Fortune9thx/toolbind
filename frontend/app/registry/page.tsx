"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readContract } from "@/lib/genlayer";
import { StatusBadge } from "@/components/StatusBadge";

interface ToolRecord {
  tool_id: string;
  repo: string;
  sha: string;
  policy: string;
  owner: string;
}

interface SealRecord {
  seal_id: string;
  verdict: string;
  status: string;
  expiry_at: string;
}

type FilterKey = "all" | "sealed" | "pending" | "expired";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sealed", label: "Sealed" },
  { key: "pending", label: "Pending" },
  { key: "expired", label: "Expired" },
];

export default function RegistryPage() {
  const [tools, setTools] = useState<(ToolRecord & { latestSeal: SealRecord | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found: (ToolRecord & { latestSeal: SealRecord | null })[] = [];
      // No bulk "list all tools" view exists on-chain by design: tool_id
      // is sequential (tool-0, tool-1, ...), so this walks forward and
      // stops at the first miss.
      for (let i = 0; i < 200; i++) {
        try {
          const raw = await readContract<string>("get_tool", [`tool-${i}`]);
          const tool: ToolRecord = JSON.parse(raw);
          let latestSeal: SealRecord | null = null;
          try {
            const sealRaw = await readContract<string>("get_latest_seal", [tool.tool_id]);
            latestSeal = JSON.parse(sealRaw);
          } catch {
            latestSeal = null;
          }
          found.push({ ...tool, latestSeal });
        } catch {
          break;
        }
      }
      if (!cancelled) {
        setTools(found);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return tools.filter((t) => {
      const q = query.trim().toLowerCase();
      if (q) {
        const hay = `${t.owner} ${t.repo} ${t.sha}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "all") return true;
      const verdict = t.latestSeal?.verdict;
      const status = t.latestSeal?.status;
      if (filter === "sealed") return verdict === "SEALED" && status === "ACTIVE";
      if (filter === "pending") return !t.latestSeal;
      if (filter === "expired") return status === "EXPIRED";
      return true;
    });
  }, [tools, query, filter]);

  return (
    <div
      style={{
        flex: 1,
        padding: "clamp(40px, 6vw, 72px) clamp(16px, 4vw, 48px) 80px",
        maxWidth: 1080,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <h1 className="display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", color: "var(--c-photon)", margin: 0 }}>
        Registry
      </h1>

      <div
        style={{
          marginTop: 24,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        <input
          className="gl-input mono"
          placeholder="Search owner, repo, or SHA"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 320 }}
          aria-label="Search owner, repo, or SHA"
        />
        <div style={{ display: "flex", gap: 8 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="mono"
              style={{
                fontSize: 12,
                padding: "8px 14px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid rgba(255,255,255,0.12)",
                background: filter === f.key ? "var(--c-graphite)" : "transparent",
                color: filter === f.key ? "var(--c-photon)" : "var(--c-asphalt)",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--c-asphalt)" }}>
          {loading ? "loading…" : `${filtered.length} tool${filtered.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <div style={{ marginTop: 28, overflowX: "auto" }}>
        <table className="mono" style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--c-asphalt)", fontSize: 11, letterSpacing: "0.06em" }}>
              <th style={{ fontWeight: 400, padding: "0 0 10px" }}>TOOL</th>
              <th style={{ fontWeight: 400, padding: "0 0 10px" }}>POLICY</th>
              <th style={{ fontWeight: 400, padding: "0 0 10px" }}>COMMIT</th>
              <th style={{ fontWeight: 400, padding: "0 0 10px" }}>STATUS</th>
              <th style={{ fontWeight: 400, padding: "0 0 10px" }}>EXPIRY</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.tool_id} className="gl-row" style={{ cursor: "pointer" }} onClick={() => (window.location.href = `/tools/${t.tool_id}`)}>
                <td style={{ padding: "0 16px 0 0" }}>
                  <Link href={`/tools/${t.tool_id}`} style={{ color: "var(--c-photon)" }}>
                    {t.repo.replace("https://github.com/", "")}
                  </Link>
                </td>
                <td style={{ color: "var(--c-chassis)" }}>{t.policy}</td>
                <td style={{ color: "var(--c-chassis)" }}>{t.sha.slice(0, 10)}</td>
                <td>
                  <StatusBadge value={t.latestSeal ? t.latestSeal.status : "UNSEALED"} />
                </td>
                <td style={{ color: "var(--c-chassis)" }}>
                  {t.latestSeal?.status === "ACTIVE" ? expiryLabel(t.latestSeal.expiry_at) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && filtered.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <p style={{ color: "var(--c-asphalt)", fontSize: 14 }}>
              {tools.length === 0 ? "No tools registered on this network yet." : "Nothing matched that search."}
            </p>
            {tools.length === 0 && (
              <Link href="/register" className="gl-btn gl-btn-secondary" style={{ marginTop: 16, display: "inline-flex" }}>
                Register a tool
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function expiryLabel(expiryIso: string): string {
  const ms = new Date(expiryIso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / 86_400_000);
  return `${days}d remaining`;
}
