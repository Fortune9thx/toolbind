/** Minimal outlined triangle mark + wordmark. No load animation, no
 * gimmick -- a fixed brand lockup that reads the same on every route. */
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path
        d="M12 2.5 L21.5 20.5 L2.5 20.5 Z"
        fill="none"
        stroke="var(--c-photon)"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span
      className="display"
      style={{ fontSize: "1rem", color: "var(--c-photon)", lineHeight: 1 }}
    >
      ToolBind
    </span>
  );
}
