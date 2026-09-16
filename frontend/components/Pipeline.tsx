/** The bind → seal pipeline, rendered as typography and hairlines --
 * never a chart, curve, or mesh. Optionally highlights the step a given
 * page/state has reached (`activeIndex`). */
const STEPS = ["Repo", "Commit", "Evidence", "Consensus", "Seal"];

export function Pipeline({ activeIndex = -1 }: { activeIndex?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
      {STEPS.map((step, i) => {
        const reached = activeIndex >= 0 && i <= activeIndex;
        return (
          <div key={step} style={{ display: "flex", alignItems: "center" }}>
            <span
              className="mono"
              style={{
                fontSize: 13,
                color: reached ? "var(--c-photon)" : "var(--c-asphalt)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  border: `1px solid ${reached ? "var(--c-cobalt)" : "var(--c-asphalt)"}`,
                  background: reached ? "var(--c-cobalt)" : "transparent",
                  display: "inline-block",
                }}
              />
              {step}
            </span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                style={{
                  width: 40,
                  height: 1,
                  background: reached && i < activeIndex ? "var(--c-cobalt)" : "rgba(255,255,255,0.14)",
                  margin: "0 10px",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
