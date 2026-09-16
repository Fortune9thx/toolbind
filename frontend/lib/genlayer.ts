/**
 * ToolBind client setup + contract read/write helpers, targeting
 * GenLayer studio-dev (chainId 61997) via genlayer-js and window.ethereum
 * (MetaMask). Mirrors the confirmed-working client-setup + status-polling
 * pattern from this account's Vulcan frontend (frontend/lib/genlayer-
 * client.ts there) -- createClient({chain, account, provider}) for a
 * connected write client, createClient({chain}) alone (no account) for a
 * read-only client, and getTransaction({hash}).statusName for polling,
 * rather than an unconfirmed waitForTransactionReceipt-style helper.
 *
 * NEXT_PUBLIC_TOOLBIND_CONTRACT is a PLACEHOLDER until the contract is
 * actually deployed -- see README.md "NOT YET DEPLOYED" for the manual
 * deploy step and how to fill this in afterward.
 */

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import type { GenLayerClient, GenLayerChain, TransactionHash } from "genlayer-js/types";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "61997");
export const RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC ?? "https://studio-dev.genlayer.com/api";
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_TOOLBIND_CONTRACT ??
  "0xPLACEHOLDER_TOOLBIND_CONTRACT_ADDRESS") as `0x${string}`;

// studio-dev network config: genlayer-js's packaged `studionet` chain is
// overridden with this project's explicit id/RPC so a redeploy to a
// different studio-dev-compatible endpoint needs only an env change, not
// a code change.
export const studioDevChain: GenLayerChain = {
  ...studionet,
  id: CHAIN_ID,
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
};

export type TxStage =
  | "idle"
  | "estimating"
  | "awaiting_signature"
  | "pending"
  | "awaiting_decision"
  | "finalized"
  | "error";

let _readOnlyClient: GenLayerClient<GenLayerChain> | null = null;

/** A wallet-free client for view calls -- confirmed pattern: createClient
 * with no account/provider still executes readContract successfully. */
export function getReadOnlyClient(): GenLayerClient<GenLayerChain> {
  if (!_readOnlyClient) {
    _readOnlyClient = createClient({ chain: studioDevChain });
  }
  return _readOnlyClient;
}

/**
 * A connected client bound to window.ethereum (MetaMask), used for
 * mutating calls. Requires the user to already have called
 * `eth_requestAccounts` (done by the WalletControl "Connect" button) --
 * never triggers a connection prompt implicitly on its own.
 */
export async function getBrowserClient(): Promise<GenLayerClient<GenLayerChain>> {
  const eth = (window as any).ethereum;
  if (!eth) {
    throw new Error(
      "No injected wallet found. Install MetaMask and switch to the studio-dev network to continue."
    );
  }
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  const address = accounts?.[0];
  if (!address) {
    throw new Error("No wallet account available. Connect a wallet and try again.");
  }
  return createClient({
    chain: studioDevChain,
    account: address as `0x${string}`,
    provider: eth,
  });
}

export async function readContract<T = unknown>(
  functionName: string,
  args: any[] = []
): Promise<T> {
  const client = getReadOnlyClient();
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  } as any) as Promise<T>;
}

export interface WriteLifecycleHandlers {
  onStage?: (stage: TxStage) => void;
  onTxHash?: (hash: string) => void;
  onError?: (error: unknown) => void;
}

const DECIDED_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.ACCEPTED,
  TransactionStatus.FINALIZED,
  TransactionStatus.UNDETERMINED,
  TransactionStatus.CANCELED,
  TransactionStatus.VALIDATORS_TIMEOUT,
  TransactionStatus.LEADER_TIMEOUT,
]);

/**
 * Full write lifecycle: estimate -> sign (wallet prompt) -> pending ->
 * awaiting_decision (polls real consensus status) -> finalized/error.
 * Every mutating page in this app funnels through this helper so the
 * lifecycle UI (see components/TxLifecycle.tsx) is identical everywhere.
 */
export async function writeContract(
  functionName: string,
  args: any[],
  handlers: WriteLifecycleHandlers = {}
): Promise<{ hash: string; result: unknown }> {
  const { onStage, onTxHash, onError } = handlers;
  try {
    onStage?.("estimating");
    const client = await getBrowserClient();

    onStage?.("awaiting_signature");
    const hash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
    } as any);
    onTxHash?.(String(hash));

    onStage?.("pending");
    let lastStatus: TransactionStatus | null = null;
    let result: unknown = null;
    for (let attempt = 0; attempt < 100; attempt++) {
      const tx = await client.getTransaction({ hash: hash as TransactionHash });
      const status = tx.statusName ?? TransactionStatus.PENDING;
      if (status !== lastStatus) {
        onStage?.(status === TransactionStatus.PENDING ? "pending" : "awaiting_decision");
        lastStatus = status;
      }
      if (DECIDED_STATUSES.has(status)) {
        result = (tx as any).result ?? (tx as any).data ?? null;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    onStage?.("finalized");
    return { hash: String(hash), result };
  } catch (error) {
    onStage?.("error");
    onError?.(error);
    throw error;
  }
}

export function explorerTxUrl(hash: string): string {
  return `https://explorer-studio-dev.genlayer.com/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `https://explorer-studio-dev.genlayer.com/address/${address}`;
}
