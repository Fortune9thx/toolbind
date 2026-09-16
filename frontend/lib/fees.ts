/**
 * Fee estimation helper shown in the "fee estimate" step of every
 * mutating page's tx lifecycle UI, before the wallet signing prompt.
 * genlayer-js does not currently expose a standalone dry-run gas
 * estimate for every method shape used here, so this presents a
 * best-effort static estimate per method, clearly labeled as an
 * estimate -- the wallet's own confirmation screen remains the source
 * of truth for the actual fee before signing.
 */

export interface FeeEstimate {
  functionName: string;
  estimatedGen: string;
  note: string;
}

const BASE_ESTIMATES: Record<string, { gen: string; note: string }> = {
  register_tool: { gen: "~0.002", note: "Deterministic write, no LLM/web fetch." },
  update_claims: { gen: "~0.002", note: "Deterministic write, no LLM/web fetch." },
  seal: {
    gen: "~0.01-0.03",
    note: "Two-stage: live web fetch(es) + one LLM judgment call, run by every validator.",
  },
  reseal: {
    gen: "~0.01-0.03",
    note: "Re-runs the full seal() flow if the tool qualifies for reseal.",
  },
  challenge: { gen: "~0.002", note: "Deterministic write, no LLM/web fetch." },
};

export function estimateFee(functionName: string): FeeEstimate {
  const base = BASE_ESTIMATES[functionName] ?? {
    gen: "~0.002",
    note: "Deterministic write.",
  };
  return {
    functionName,
    estimatedGen: base.gen,
    note: base.note,
  };
}
