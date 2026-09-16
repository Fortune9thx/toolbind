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

/** Persistent lime-frame layout chrome, present on every page. The frame
 * itself never animates after first paint (no infinite pulsing); page
 * transitions get a short lime flicker instead, applied via the
 * AnimatePresence key on pathname. */
export function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dark = pathname === "/";

  return (
    <div
      style={{
        padding: "12px",
        minHeight: "100vh",
        background: "var(--frame)",
      }}
    >
      <div
        style={{
          minHeight: "calc(100vh - 24px)",
          background: dark ? "var(--field-a)" : "var(--field-b)",
          border: "1px solid var(--frame)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          className="flex items-center justify-between px-4 sm:px-6"
          style={{
            height: 56,
            borderBottom: `1px solid ${dark ? "rgba(124,255,77,0.25)" : "rgba(0,0,0,0.1)"}`,
          }}
        >
          <Link href="/" className="flex items-center gap-2">
            <Logo animate={false} size={18} />
            <Wordmark dark={dark} />
          </Link>
          <nav className="hidden sm:flex items-center gap-5 mono text-xs uppercase tracking-wide">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  color: pathname.startsWith(l.href)
                    ? "var(--lime)"
                    : dark
                    ? "var(--mute)"
                    : "var(--ink-on-b)",
                  opacity: pathname.startsWith(l.href) ? 1 : 0.75,
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <WalletControl dark={dark} />
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.4 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            {children}
          </motion.main>
        </AnimatePresence>

        <footer
          className="mono text-[11px] px-4 sm:px-6 py-3"
          style={{
            color: "var(--mute)",
            borderTop: `1px solid ${dark ? "rgba(124,255,77,0.15)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          studio-dev · chainId 61997 · state resets periodically
        </footer>
      </div>
    </div>
  );
}
