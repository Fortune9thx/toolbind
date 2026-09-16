"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readContract } from "@/lib/genlayer";
import { CertificatePreview } from "@/components/CertificatePreview";

interface ToolRecord {
  tool_id: string;
  repo: string;
  sha: string;
  policy: string;
}
interface SealRecord {
  seal_id: string;
  verdict: string;
  status: string;
  expiry_at: string;
  sha: string;
  policy: string;
  tool_id: string;
}

type ResultState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "miss" }
  | { kind: "tool"; id: string; tool: ToolRecord }
  | { kind: "seal"; id: string; seal: SealRecord };

const RECENTS_KEY = "toolbind.lookup.recents";

export default function LookupPage() {
  const [id, setId] = useState("");
  const [result, setResult] = useState<ResultState>({ kind: "idle" });
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      if (raw) setRecents(JSON.parse(raw));
    } catch {
      // per-viewer convenience only -- ignore if storage is unavailable
    }
  }, []);

  function remember(value: string) {
    try {
      const next = [value, ...recents.filter((r) => r !== value)].slice(0, 6);
      setRecents(next);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  async function runLookup(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setResult({ kind: "loading" });
    try {
      if (trimmed.startsWith("seal-") || /^seal[\s#-]?\d+$/i.test(trimmed)) {
        const sealId = trimmed.startsWith("seal-") ? trimmed : `seal-${trimmed.replace(/\D/g, "")}`;
        const sealRaw = await readContract<string>("get_seal", [sealId]);
        setResult({ kind: "seal", id: sealId, seal: JSON.parse(sealRaw) });
        remember(trimmed);
        return;
      }
      if (trimmed.startsWith("tool-") || /^tool[\s#-]?\d+$/i.test(trimmed) || trimmed.includes("/")) {
        let toolId = trimmed;
        if (!trimmed.startsWith("tool-")) {
          if (/^tool[\s#-]?\d+$/i.test(trimmed)) {
            toolId = `tool-${trimmed.replace(/\D/g, "")}`;
          } else {
            // owner/repo slug -- not directly queryable, treat as a miss
            // rather than guessing an id.
            setResult({ kind: "miss" });
            return;
          }
        }
        const toolRaw = await readContract<string>("get_tool", [toolId]);
        setResult({ kind: "tool", id: toolId, tool: JSON.parse(toolRaw) });
        remember(trimmed);
        return;
      }
      if (trimmed.startsWith("0x")) {
        const listRaw = await readContract<string>("list_tools_by_owner", [trimmed]);
        const ids = JSON.parse(listRaw);
        if (Array.isArray(ids) && ids.length > 0) {
          const toolRaw = await readContract<string>("get_tool", [ids[0]]);
          setResult({ kind: "tool", id: ids[0], tool: JSON.parse(toolRaw) });
          remember(trimmed);
          return;
        }
        setResult({ kind: "miss" });
        return;
      }
      // Bare hex, try as a SHA-matching tool walk is out of scope for a
      // single read -- fall back to a plausible commit-shaped 0x-less
      // hex the contract can't directly key on, so report a miss.
      setResult({ kind: "miss" });
    } catch {
      setResult({ kind: "miss" });
    }
  }

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
        <h1 className="gl-page-title display">Lookup</h1>
      </div>
      <p style={{ color: "var(--c-chassis)", fontSize: 14, marginTop: 8 }}>
        No wallet required.
      </p>

      <div className="gl-split gl-split-56" style={{ marginTop: 24 }}>
        <div className="gl-panel" style={{ padding: 24 }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runLookup(id);
            }}
            style={{ display: "flex", gap: 12, alignItems: "flex-end" }}
          >
            <div style={{ flex: 1 }}>
              <label htmlFor="lookup-id" className="gl-label">
                Tool, seal, or owner
              </label>
              <input
                id="lookup-id"
                className="gl-input mono"
                placeholder="acme/payments-mcp, 8f3c1a2b, or 0x…"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </div>
            <button type="submit" disabled={result.kind === "loading"} className="gl-btn gl-btn-primary">
              {result.kind === "loading" ? "Looking up…" : "Look up"}
            </button>
          </form>

          <p className="gl-help" style={{ marginTop: 10 }}>
            Accepts a tool id (tool-N), a seal id (seal-N), or an owner address (0x…).
          </p>

          {recents.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <span className="gl-label">Recent</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recents.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setId(r);
                      runLookup(r);
                    }}
                    className="mono gl-row"
                    style={{
                      justifyContent: "flex-start",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--hairline)",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "var(--c-chassis)",
                      padding: "0 4px",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: "sticky", top: "calc(var(--header-h) + 24px)" }}>
          <ResultPanel result={result} />
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ result }: { result: ResultState }) {
  if (result.kind === "idle") {
    return (
      <div className="gl-panel gl-empty" style={{ minHeight: 240 }}>
        <p style={{ color: "var(--c-asphalt)", fontSize: 14 }}>Paste an identifier. Result opens here.</p>
      </div>
    );
  }

  if (result.kind === "loading") {
    return (
      <div className="gl-panel" style={{ padding: 24 }}>
        <span className="gl-skeleton" style={{ height: 11, width: 100, display: "block" }} />
        <span className="gl-skeleton" style={{ height: 20, width: "70%", display: "block", marginTop: 18 }} />
        <span className="gl-skeleton" style={{ height: 14, width: "40%", display: "block", marginTop: 18 }} />
        <span className="gl-skeleton" style={{ height: 1, width: "100%", display: "block", marginTop: 18 }} />
        <span className="gl-skeleton" style={{ height: 14, width: "60%", display: "block", marginTop: 18 }} />
      </div>
    );
  }

  if (result.kind === "miss") {
    return (
      <div className="gl-panel gl-empty" style={{ minHeight: 240 }}>
        <p style={{ color: "var(--c-photon)", fontSize: 15 }}>Nothing matched on chain 61997.</p>
        <p style={{ color: "var(--c-asphalt)", fontSize: 13 }}>Check the id and try again.</p>
      </div>
    );
  }

  if (result.kind === "tool") {
    return (
      <div>
        <CertificatePreview slug={result.tool.repo.replace("https://github.com/", "")} sha={result.tool.sha} policy={result.tool.policy} pipelineIndex={2} />
        <Link href={`/tools/${result.id}`} className="gl-btn gl-btn-primary" style={{ width: "100%", marginTop: 12 }}>
          Open tool
        </Link>
      </div>
    );
  }

  const sealed = result.seal.verdict === "SEALED" && result.seal.status === "ACTIVE";
  return (
    <div>
      <CertificatePreview
        slug={result.seal.tool_id}
        sha={result.seal.sha}
        policy={result.seal.policy}
        status={sealed ? "SEALED" : result.seal.verdict}
        expiry={result.seal.expiry_at}
        pipelineIndex={4}
      />
      <Link href={`/tools/${result.seal.tool_id}`} className="gl-btn gl-btn-primary" style={{ width: "100%", marginTop: 12 }}>
        Open tool
      </Link>
    </div>
  );
}
