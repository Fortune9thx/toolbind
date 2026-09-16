"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Logo, Wordmark } from "./Logo";
import { WalletControl } from "./WalletControl";

const NAV_LINKS = [
  { href: "/register", label: "Register" },
  { href: "/tools", label: "Tools" },
  { href: "/lookup", label: "Lookup" },
  { href: "/activity", label: "Activity" },
];

/** Routes rendered on the black field. Everything else is the light
 * field-b page with the lime perspective floor grid. */
const DARK_ROUTES = ["/", "/seal", "/activity"];

export function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dark = DARK_ROUTES.some((r) => (r === "/" ? pathname === "/" : pathname.startsWith(r)));

  return (
    // The lime frame itself: a solid 12px band the content never crosses.
    <div
      style={{
        padding: "var(--frame-w)",
        minHeight: "100vh",
        background: "var(--frame)",
      }}
    >
      <div
        style={{
          minHeight: "calc(100vh - (var(--frame-w) * 2))",
          background: dark ? "var(--field-a)" : "var(--field-b)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header className="tb-header" style={{ flex: "0 0 auto", position: "relative", zIndex: 20 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo animate={false} size={20} />
            <Wordmark dark={dark} />
          </Link>

          <nav className="mono tb-header-nav" style={{ marginLeft: "auto", marginRight: 32 }}>
            {NAV_LINKS.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="tb-nav-link"
                  data-active={active}
                  style={!active && !dark ? { color: "rgba(17,17,17,0.55)" } : undefined}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <WalletControl dark={dark} />
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.35 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}
          >
            {children}
          </motion.main>
        </AnimatePresence>

        <footer
          className="mono"
          style={{
            flex: "0 0 auto",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: dark ? "rgba(138,138,134,0.9)" : "rgba(17,17,17,0.45)",
            padding: "14px clamp(16px, 3vw, 32px)",
            position: "relative",
            zIndex: 20,
          }}
        >
          studio-dev · chainId 61997 · state resets periodically
        </footer>
      </div>
    </div>
  );
}
