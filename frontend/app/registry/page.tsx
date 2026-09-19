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

type Row = ToolRecord & { latestSeal: SealRecord | null };
type FilterKey = "all" | "sealed" | "pending" | "expired";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sealed", label: "Sealed" },
  { key: "pending", label: "Pending" },
  { key: "expired", label: "Expired" },
];

const COLUMNS = "1.8fr 0.9fr 1fr 0.7fr 0.9fr";

export default function RegistryPage() {
  const [tools, setTools] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const found: Row[] = [];
        for (let i = 0; i < 200; i++) {
          // get_tool throws both for "this id was never registered" (the
          // real stop condition) and for a transient RPC hiccup on a
          // freshly-written id -- confirmed live: a tool_id that just
          // accepted its register_tool tx can briefly fail this exact
          // read before becoming visible. One retry after a short delay
          // tells the two apart without needing a contract-side count.
          let raw: string | null = null;
          for (let attempt = 0; attempt < 2 && raw === null; attempt++) {
            try {
              raw = await readContract<string>("get_tool", [`tool-${i}`]);
            } catch {
              if (attempt === 0) await new Promise((r) => setTimeout(r, 1200));
            }
          }
          if (raw === null) break;
          const tool: ToolRecord = JSON.parse(raw);
          let latestSeal: SealRecord | null = null;
          try {
            const sealRaw = await readContract<string>("get_latest_seal", [tool.tool_id]);
            latestSeal = JSON.parse(sealRaw);
          } catch {
            latestSeal = null;
          }
          found.push({ ...tool, latestSeal });
        }
        if (!cancelled) {
          setTools(found);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const stats = useMemo(() => {
    let sealed = 0;
    let pending = 0;
    let expired = 0;
    for (const t of tools) {
      if (!t.latestSeal) pending++;
      else if (t.latestSeal.status === "EXPIRED") expired++;
      else if (t.latestSeal.verdict === "SEALED" && t.latestSeal.status === "ACTIVE") sealed++;
      else pending++;
    }
    return { total: tools.length, sealed, pending, expired };
  }, [tools]);

  const filtered = useMemo(() => {
    return tools.filter((t) => {
      const q = query.trim().toLowerCase();
      if (q) {
        const hay = `${t.owner} ${t.repo} ${t.sha}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "all") return true;
      if (filter === "sealed") return t.latestSeal?.verdict === "SEALED" && t.latestSeal.status === "ACTIVE";
      if (filter === "pending") return !t.latestSeal;
      if (filter === "expired") return t.latestSeal?.status === "EXPIRED";
      return true;
    });
  }, [tools, query, filter]);

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
        <h1 className="gl-page-title display">Registry</h1>
        <Link href="/register" className="gl-btn gl-btn-primary">
          Register a tool
        </Link>
      </div>

      <div className="gl-stats" style={{ marginTop: 24 }}>
        <div className="gl-stat">
          <div className="gl-stat-label">Tools</div>
          <div className="gl-stat-value mono">{loading ? "—" : stats.total}</div>
        </div>
        <div className="gl-stat">
          <div className="gl-stat-label">Sealed</div>
          <div className="gl-stat-value mono" style={{ color: stats.sealed ? "var(--c-success)" : undefined }}>
            {loading ? "—" : stats.sealed}
          </div>
        </div>
        <div className="gl-stat">
          <div className="gl-stat-label">Pending</div>
          <div className="gl-stat-value mono">{loading ? "—" : stats.pending}</div>
        </div>
        <div className="gl-stat">
          <div className="gl-stat-label">Expired</div>
          <div className="gl-stat-value mono" style={{ color: stats.expired ? "var(--c-error)" : undefined }}>
            {loading ? "—" : stats.expired}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
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
                border: "1px solid var(--hairline-strong)",
                background: filter === f.key ? "var(--s-hover)" : "transparent",
                color: filter === f.key ? "var(--c-photon)" : "var(--c-asphalt)",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--c-asphalt)" }}>
          {loading ? "" : `${filtered.length} tool${filtered.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="gl-panel" style={{ marginTop: 20, minHeight: "calc(100vh - 380px)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 640 }}>
            <div
              className="mono"
              style={{
                display: "grid",
                gridTemplateColumns: COLUMNS,
                gap: 16,
                padding: "12px 16px",
                borderBottom: "1px solid var(--hairline)",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "var(--c-asphalt)",
              }}
            >
              <span>TOOL</span>
              <span>POLICY</span>
              <span>COMMIT</span>
              <span>STATUS</span>
              <span>EXPIRY</span>
            </div>

            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="gl-row" style={{ display: "grid", gridTemplateColumns: COLUMNS, gap: 16 }}>
                  <span className="gl-skeleton" style={{ height: 14, width: "70%" }} />
                  <span className="gl-skeleton" style={{ height: 14, width: "50%" }} />
                  <span className="gl-skeleton" style={{ height: 14, width: "60%" }} />
                  <span className="gl-skeleton" style={{ height: 20, width: 70, borderRadius: 999 }} />
                  <span className="gl-skeleton" style={{ height: 14, width: "50%" }} />
                </div>
              ))}

            {!loading &&
              !failed &&
              filtered.map((t) => (
                <Link
                  key={t.tool_id}
                  href={`/tools/${t.tool_id}`}
                  className="gl-row"
                  style={{ display: "grid", gridTemplateColumns: COLUMNS, gap: 16, color: "var(--c-photon)" }}
                >
                  <span style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                    <span className="mono" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.repo.replace("https://github.com/", "")}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--c-asphalt)" }}>
                      {t.tool_id}
                    </span>
                  </span>
                  <span className="mono" style={{ fontSize: 13, color: "var(--c-chassis)", alignSelf: "center" }}>
                    {t.policy}
                  </span>
                  <span className="mono" style={{ fontSize: 13, color: "var(--c-chassis)", alignSelf: "center" }}>
                    {t.sha.slice(0, 10)}
                  </span>
                  <span style={{ alignSelf: "center" }}>
                    <StatusBadge value={t.latestSeal ? t.latestSeal.status : "UNSEALED"} />
                  </span>
                  <span className="mono" style={{ fontSize: 13, color: "var(--c-chassis)", alignSelf: "center" }}>
                    {t.latestSeal?.status === "ACTIVE" ? expiryLabel(t.latestSeal.expiry_at) : "—"}
                  </span>
                </Link>
              ))}
          </div>
        </div>

        {failed && (
          <div className="gl-empty">
            <p style={{ color: "var(--c-photon)", fontSize: 15 }}>Couldn&apos;t load the registry.</p>
            <p style={{ color: "var(--c-asphalt)", fontSize: 13 }}>The read may have hit a transient node error.</p>
            <button onClick={() => setReloadKey((k) => k + 1)} className="gl-btn gl-btn-secondary" style={{ marginTop: 12 }}>
              Retry
            </button>
          </div>
        )}

        {!loading && !failed && filtered.length === 0 && (
          <div className="gl-empty">
            <p style={{ color: "var(--c-photon)", fontSize: 15 }}>
              {tools.length === 0 ? "No tools on Studio Next yet." : "Nothing matched that search."}
            </p>
            <p style={{ color: "var(--c-asphalt)", fontSize: 13 }}>
              {tools.length === 0 ? "Pin a repo at a commit to create the first bind." : "Try a different owner, repo, or SHA."}
            </p>
            {tools.length === 0 && (
              <Link href="/register" className="gl-btn gl-btn-primary" style={{ marginTop: 14 }}>
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
