import { StatusBadge } from "./StatusBadge";
import { Pipeline } from "./Pipeline";

/** The tool-certificate module, reused as: the landing page's static
 * marketing example, Register's live-updating preview, and Lookup's hit
 * result. Every field is optional so a partially-filled form still
 * renders something instead of the panel appearing broken. */
export function CertificatePreview({
  slug,
  sha,
  policy,
  status = "UNSEALED",
  expiry,
  pipelineIndex = 0,
}: {
  slug: string;
  sha: string;
  policy: string;
  status?: string;
  expiry?: string;
  pipelineIndex?: number;
}) {
  return (
    <div className="gl-panel" style={{ position: "relative", padding: 24, overflow: "hidden" }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-40% -20% auto auto",
          width: 320,
          height: 320,
          background: "var(--c-cobalt)",
          opacity: 0.08,
          filter: "blur(80px)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--c-asphalt)" }}>
          TOOL CERTIFICATE
        </span>
        <StatusBadge value={status} />
      </div>

      <p
        className="display"
        style={{
          position: "relative",
          fontSize: 20,
          color: slug ? "var(--c-photon)" : "var(--c-asphalt)",
          margin: "18px 0 0",
          minHeight: 26,
          wordBreak: "break-all",
        }}
      >
        {slug || "owner/repo"}
      </p>

      <div style={{ position: "relative", marginTop: 18 }}>
        <span className="gl-label">Commit</span>
        <span className="mono" style={{ fontSize: 14, color: sha ? "var(--c-chassis)" : "var(--c-asphalt)" }}>
          {sha || "—"}
        </span>
      </div>

      <div style={{ position: "relative", height: 1, background: "var(--hairline)", margin: "18px 0" }} />

      <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
        <div>
          <span className="gl-label">Policy</span>
          <span className="mono" style={{ fontSize: 14, color: "var(--c-photon)" }}>
            {policy || "—"}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className="gl-label">Expiry</span>
          <span className="mono" style={{ fontSize: 14, color: "var(--c-photon)" }}>
            {expiry || "—"}
          </span>
        </div>
      </div>

      <div style={{ position: "relative", marginTop: 24 }}>
        <Pipeline activeIndex={pipelineIndex} />
      </div>
    </div>
  );
}
