"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Logo, Wordmark } from "./Logo";
import { WalletControl } from "./WalletControl";
import { CHAIN_ID, NETWORK_LABEL } from "@/lib/genlayer";

const NAV_LINKS = [
  { href: "/register", label: "Register" },
  { href: "/registry", label: "Registry" },
  { href: "/lookup", label: "Lookup" },
  { href: "/activity", label: "Activity" },
];

/** One dark shell on every route -- no theme flip between landing, the
 * app, and the ledger. */
export function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100vh", background: "var(--c-void)", display: "flex", flexDirection: "column" }}>
      <header className="gl-header">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={20} />
          <Wordmark />
        </Link>

        <nav className="mono gl-header-nav">
          {NAV_LINKS.map((l) => {
            const active = pathname.startsWith(l.href) || (l.href === "/registry" && pathname.startsWith("/tools"));
            return (
              <Link key={l.href} href={l.href} className="gl-nav-link" data-active={active}>
                {l.label.toUpperCase()}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="gl-badge mono">{NETWORK_LABEL} · {CHAIN_ID}</span>
          <WalletControl />
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0.5 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <footer
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.04em",
          color: "var(--c-asphalt)",
          padding: "14px clamp(16px, 3vw, 32px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        ToolBind · Built on GenLayer · {NETWORK_LABEL} · chain {CHAIN_ID} · state may reset
      </footer>
    </div>
  );
}
