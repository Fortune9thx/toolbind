import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // The remaining `any` usage in this project is entirely at SDK/
    // browser boundaries (untyped window.ethereum, genlayer-js's
    // loosely-typed readContract/writeContract args) where a hand-
    // written type would be a guess at a surface this project hasn't
    // fully introspected -- worse than an honest `any`. Kept as a
    // warning (visible in review) rather than silenced or hard-banned.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
