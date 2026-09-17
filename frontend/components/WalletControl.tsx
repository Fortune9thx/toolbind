"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

/** Connect-wallet pill, backed by RainbowKit's ConnectButton.Custom so it
 * works with every connector type (injected, WalletConnect, Coinbase
 * Smart Wallet, Safe) instead of only a single window.ethereum extension --
 * styled with this app's own .gl-btn classes rather than RainbowKit's
 * default look. */
export function WalletControl() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
          >
            {!connected ? (
              <button onClick={openConnectModal} className="gl-btn gl-btn-primary mono" style={{ fontSize: 13 }}>
                Connect wallet
              </button>
            ) : chain.unsupported ? (
              <button onClick={openChainModal} className="gl-btn gl-btn-destructive mono" style={{ fontSize: 13 }}>
                Wrong network
              </button>
            ) : (
              <button onClick={openAccountModal} className="gl-btn gl-btn-secondary mono" style={{ fontSize: 13 }}>
                {account.displayName}
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
