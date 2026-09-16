"use client";

import { useState, useEffect } from "react";

/** Connect-wallet pill. Reads window.ethereum directly -- no second
 * wallet stack layered on top of the existing genlayer-js/viem path. */
export function WalletControl() {
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
      className={`gl-btn ${address ? "gl-btn-secondary" : "gl-btn-primary"} mono`}
      style={{ fontSize: 13 }}
    >
      {address
        ? `${address.slice(0, 6)}…${address.slice(-4)}`
        : connecting
        ? "Connecting…"
        : "Connect wallet"}
    </button>
  );
}
