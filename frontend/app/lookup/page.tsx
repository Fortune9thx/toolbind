"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readContract } from "@/lib/genlayer";

export default function LookupPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const trimmed = id.trim();
    try {
      if (trimmed.startsWith("seal-")) {
        await readContract<string>("get_seal", [trimmed]);
        router.push(`/seal/${trimmed}`);
        return;
      }
      if (trimmed.startsWith("tool-")) {
        await readContract<string>("get_tool", [trimmed]);
        router.push(`/tools/${trimmed}`);
        return;
      }
      if (trimmed.startsWith("0x")) {
        const raw = await readContract<string>("list_tools_by_owner", [trimmed]);
        const ids = JSON.parse(raw);
        if (Array.isArray(ids) && ids.length > 0) {
          router.push(`/tools/${ids[0]}`);
          return;
        }
        throw new Error("Nothing matched.");
      }
      throw new Error("Enter a tool id (tool-N), a seal id (seal-N), or a 0x address.");
    } catch (err) {
      setError(err instanceof Error && err.message === "Nothing matched." ? "Nothing matched." : "Nothing matched.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "clamp(40px, 6vw, 72px) clamp(16px, 4vw, 48px) 80px",
        maxWidth: 640,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <h1 className="display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", color: "var(--c-photon)", margin: 0 }}>
        Lookup
      </h1>
      <p style={{ color: "var(--c-chassis)", fontSize: 14, marginTop: 10 }}>
        Paste a tool id, a seal id, or an owner address. No wallet required.
      </p>

      <form onSubmit={onLookup} style={{ marginTop: 28, display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="lookup-id" className="gl-label">
            ID or address
          </label>
          <input
            id="lookup-id"
            className="gl-input mono"
            placeholder="tool-0, seal-0, or 0x…"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading} className="gl-btn gl-btn-primary">
          {loading ? "Looking up…" : "Look up"}
        </button>
      </form>

      {error && (
        <p className="mono" style={{ color: "var(--c-error)", fontSize: 13, marginTop: 16 }}>
          {error}
        </p>
      )}
    </div>
  );
}
