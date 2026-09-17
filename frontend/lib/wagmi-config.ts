import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { CHAIN_ID, RPC_URL } from "./genlayer";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId && typeof window !== "undefined") {
  console.warn(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set -- the WalletConnect QR " +
      "flow won't work until you add one (see frontend/.env.example). " +
      "Browser-extension wallets (MetaMask, Rabby, etc.) still connect fine."
  );
}

/** wagmi/viem's own Chain shape, distinct from genlayer-js's GenLayerChain --
 * both point at the same network, defined separately because RainbowKit's
 * connect/network-switch UI needs a plain viem Chain, not a GenLayerChain. */
export const studioDevViemChain = defineChain({
  id: CHAIN_ID,
  name: "GenLayer Studio Devnet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: {
    default: { name: "GenLayer Explorer", url: "https://explorer-studio-dev.genlayer.com" },
  },
});

export const wagmiConfig = getDefaultConfig({
  appName: "ToolBind",
  // getDefaultConfig throws synchronously on a falsy projectId, which
  // crashes SSR/build entirely (every route that renders the root
  // Providers hits this at build time), not just the WalletConnect QR
  // flow -- fall back to a syntactically-valid placeholder so injected
  // wallets keep working normally. A real WalletConnect Cloud project id
  // requires an external account only the user can create.
  projectId: projectId || "00000000000000000000000000000000",
  chains: [studioDevViemChain],
  ssr: true,
});
