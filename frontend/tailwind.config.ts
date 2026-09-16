import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        frame: "var(--frame)",
        "field-a": "var(--field-a)",
        "field-b": "var(--field-b)",
        "ink-on-a": "var(--ink-on-a)",
        "ink-on-b": "var(--ink-on-b)",
        mute: "var(--mute)",
        lime: "var(--lime)",
        "lime-hot": "var(--lime-hot)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
