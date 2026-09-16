"use client";

import { useState, useEffect } from "react";

/** Typographic lime-text wallet control -- deliberately not a rounded,
 * rainbow-style "Connect Wallet" button. Reads window.ethereum directly
 * rather than pulling in a wallet-connection library. */
export function WalletControl({ dark }: { dark: boolean }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    eth
      .request({ method: "eth_accounts" })
      .then((accts: string[]) => setAddress(accts?.[0] ?? null))
      .catch(() => {});
  }, []);

  async function connect() {
    const eth = (window as any).ethereum;
    if (!eth) {
      alert("No injected wallet found. Install MetaMask to continue.");
      return;
    }
    setConnecting(true);
    try {
      const accts: string[] = await eth.request({ method: "eth_requestAccounts" });
      setAddress(accts?.[0] ?? null);
    } catch {
      // user rejected -- no-op
    } finally {
      setConnecting(false);
    }
  }

  return (
    <button
      onClick={connect}
      className="mono text-xs uppercase tracking-wide"
      style={{ color: "var(--lime)", background: "none", border: "none", cursor: "pointer" }}
    >
      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : connecting ? "Connecting..." : "Connect"}
    </button>
  );
}
