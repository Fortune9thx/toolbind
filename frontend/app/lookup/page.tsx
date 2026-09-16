"use client";

import { useState } from "react";
import { readContract } from "@/lib/genlayer";

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
    <div style={{ padding: "40px 24px", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 600, color: "var(--ink-on-b)", margin: 0 }}>
        Lookup
      </h1>
      <p className="mono text-xs" style={{ color: "var(--mute)", marginTop: 10 }}>
        No wallet required. Paste a tool_id (tool-N) or seal_id (seal-N).
      </p>

      <form onSubmit={onLookup} style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <input
          className="hr-field"
          placeholder="tool-0 or seal-0"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <button
          type="submit"
          className="mono text-sm"
          style={{ color: "#000", background: "var(--lime)", padding: "10px 18px", border: "none", cursor: "pointer" }}
        >
          Look up
        </button>
      </form>

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

      {record && (
        <div className="mono text-xs" style={{ marginTop: 24, display: "grid", gap: 8, color: "var(--ink-on-b)" }}>
          <p style={{ color: "var(--mute)" }}>{kind?.toUpperCase()}</p>
          {Object.entries(record).map(([k, v]) => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12 }}>
              <span style={{ color: "var(--mute)" }}>{k}</span>
              <span style={{ wordBreak: "break-all" }}>{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
