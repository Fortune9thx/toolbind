/** Maps the contract's actual status/verdict vocabulary to a color --
 * success is reserved for SEALED/EQUIVALENT/FINALIZED, warn for
 * INCONCLUSIVE, error for REJECTED, chassis/asphalt for everything else
 * (UNSEALED, ACTIVE, EXPIRED, SUPERSEDED, CHALLENGED). */
function statusColor(value: string): string {
  const v = value.toUpperCase();
  if (v === "SEALED" || v === "EQUIVALENT" || v === "FINALIZED" || v === "ACCEPTED") {
    return "var(--c-success)";
  }
  if (v === "INCONCLUSIVE") return "var(--c-warn)";
  if (v === "REJECTED" || v === "ERROR" || v === "EXPIRED") return "var(--c-error)";
  return "var(--c-chassis)";
}

export function StatusBadge({ value }: { value: string }) {
  const color = statusColor(value);
  return (
    <span className="gl-badge mono" style={{ color }}>
      <span className="gl-dot" style={{ background: color }} />
      {value.toUpperCase()}
    </span>
  );
}

export function StatusDot({ value }: { value: string }) {
  return <span className="gl-dot" style={{ background: statusColor(value) }} />;
}
