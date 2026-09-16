import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        cobalt: "var(--c-cobalt)",
        void: "var(--c-void)",
        ceramic: "var(--c-ceramic)",
        photon: "var(--c-photon)",
        chassis: "var(--c-chassis)",
        asphalt: "var(--c-asphalt)",
        graphite: "var(--c-graphite)",
        success: "var(--c-success)",
        error: "var(--c-error)",
        warn: "var(--c-warn)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
