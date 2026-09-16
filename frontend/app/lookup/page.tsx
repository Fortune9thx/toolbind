"use client";

import { useState } from "react";
import { readContract } from "@/lib/genlayer";
import { PerspectiveGrid } from "@/components/PerspectiveGrid";
import { PixelArrow } from "@/components/PixelArrow";

export default function LookupPage() {
  const [id, setId] = useState("");
  const [record, setRecord] = useState<any | null>(null);
  const [kind, setKind] = useState<"seal" | "tool" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRecord(null);
    setLoading(true);
    const trimmed = id.trim();
    try {
      if (trimmed.startsWith("seal-")) {
        const raw = await readContract<string>("get_seal", [trimmed]);
        setRecord(JSON.parse(raw));
        setKind("seal");
      } else if (trimmed.startsWith("tool-")) {
        const raw = await readContract<string>("get_tool", [trimmed]);
        setRecord(JSON.parse(raw));
        setKind("tool");
      } else {
        throw new Error("id must start with 'tool-' or 'seal-'");
      }
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <PerspectiveGrid />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "clamp(32px, 6vw, 64px) clamp(16px, 4vw, 48px) 80px",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 2.8rem)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--ink-on-b)",
            margin: 0,
          }}
        >
          Lookup
        </h1>
        <p className="mono text-xs" style={{ color: "var(--mute)", marginTop: 12 }}>
          No wallet required. Paste a tool_id (tool-N) or seal_id (seal-N).
        </p>

        <form onSubmit={onLookup} style={{ marginTop: 32, display: "flex", alignItems: "flex-end", gap: 24 }}>
          <label style={{ flex: 1 }}>
            <span className="hr-label">ID</span>
            <input
              className="mono hr-field"
              placeholder="tool-0 or seal-0"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="mono tb-cta"
            data-on-light="true"
            style={{ border: "none", cursor: "pointer", fontSize: 14, padding: "10px 0" }}
          >
            Look up
            <PixelArrow size={13} color="currentColor" />
          </button>
        </form>

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

        {record && (
          <div style={{ marginTop: 36 }}>
            <p className="mono" style={{ color: "var(--lime-hot)", fontSize: 11, letterSpacing: "0.18em" }}>
              {kind?.toUpperCase()}
            </p>
            <div className="mono text-xs" style={{ marginTop: 12, display: "grid", gap: 10, color: "var(--ink-on-b)" }}>
              {Object.entries(record).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr",
                    gap: 12,
                    borderBottom: "1px solid rgba(17,17,17,0.08)",
                    paddingBottom: 8,
                  }}
                >
                  <span style={{ color: "var(--mute)" }}>{k}</span>
                  <span style={{ wordBreak: "break-all" }}>
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
