/**
 * ToolBind client setup + contract read/write helpers, targeting
 * GenLayer studio-dev (chainId 61997) via genlayer-js. Reads use a
 * wallet-free client; writes use useToolBindClient() (below), which
 * binds to whatever wallet RainbowKit/wagmi actually connected through
 * -- via connector.getProvider(), not a raw window.ethereum guess.
 * Reading window.ethereum directly only ever sees a single injected
 * extension; any other connector (WalletConnect, Coinbase Smart
 * Wallet, Safe, or a second installed extension shadowing
 * window.ethereum) left wagmi correctly connected while a
 * window.ethereum-based client silently never appeared -- confirmed as
 * the root cause of a real "No injected wallet found" report on this
 * exact app before this fix.
 *
 * genlayer-js is pinned to the 2.0.0-rc.1 pre-release, not a stable 1.x
 * version -- this is required, not cosmetic. Studio Devnet's Consensus
 * v0.6 rejects every write/deploy with no attached fee
 * (FeeValueMustBeNonZero), and the stable 1.x line has zero fee-
 * estimation code path at all (grepped the installed package: no
 * reference to estimateTransactionFees or its underlying RPC method
 * anywhere), so every write from this app silently could not have
 * worked before this pin -- confirmed by testing, not assumed. Only
 * 2.0.0-rc.1+ exposes `client.estimateTransactionFees()` and
 * `writeContract`'s `fees` option, matching what studio-dev's fee-
 * mandatory consensus needs. Do not downgrade this without re-adding
 * an equivalent fee-attachment path first.
 *
 * NEXT_PUBLIC_TOOLBIND_CONTRACT points at the live studio-dev deployment
 * by default (see README.md "Live deployment"); override it in
 * frontend/.env.local to point at a different deploy.
 */

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import type { GenLayerClient, GenLayerChain, TransactionHash } from "genlayer-js/types";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "61997");
export const RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC ?? "https://studio-dev.genlayer.com/api";
// Display label only. RPC_URL stays on the confirmed-working studio-dev
// endpoint -- studio-next.genlayer.com is not verified reachable, and
// chain 61997 is the same network either name resolves to.
export const NETWORK_LABEL = "Studio Next";
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_TOOLBIND_CONTRACT ??
  "0x70Bb4A318Bb143167e065483A39e581CCB7fe868") as `0x${string}`;

// genlayer-js@2.0.0-rc.1's packaged studioDevnet preset already carries
// the exact chain id (61997) and RPC (https://studio-dev.genlayer.com/api)
// this project uses -- confirmed by inspecting it directly rather than
// assumed. Spread + override only in case an env var ever points at a
// different studio-dev-compatible endpoint.
export const studioDevChain: GenLayerChain = {
  ...studioDevnet,
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
 * A connected client bound to whichever wallet RainbowKit/wagmi
 * actually established the connection through -- via
 * connector.getProvider(), which resolves to the correct EIP-1193
 * provider for every connector type (injected, WalletConnect, Coinbase
 * Smart Wallet, Safe), unlike reading window.ethereum directly, which
 * only ever sees one injected extension and silently fails to notice
 * a real, connected wallet through any other path.
 *
 * Pages that write to the contract call this hook, then pass the
 * resulting `client` into writeContract() below rather than that
 * function constructing its own client internally.
 */
export function useToolBindClient(): {
  client: GenLayerClient<GenLayerChain> | null;
  address: `0x${string}` | undefined;
  isConnected: boolean;
} {
  const { address, isConnected, connector } = useAccount();
  const [client, setClient] = useState<GenLayerClient<GenLayerChain> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isConnected || !address || !connector) {
      setClient(null);
      return;
    }
    connector
      .getProvider()
      .then((provider) => {
        if (cancelled) return;
        setClient(
          createClient({
            chain: studioDevChain,
            account: address,
            // wagmi types connector.getProvider() as Promise<unknown> --
            // it is a real EIP-1193 provider at runtime for every
            // connector type, exactly the shape genlayer-js expects here.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            provider: provider as any,
          })
        );
      })
      .catch(() => {
        if (!cancelled) setClient(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, address, connector]);

  return { client, address, isConnected };
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

// Every terminal status the poll loop below should stop on. Deliberately
// broader than SUCCESS_STATUSES -- a stalled/disagreed transaction still
// needs to stop polling, it just must not be reported as "finalized".
const DECIDED_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.ACCEPTED,
  TransactionStatus.FINALIZED,
  TransactionStatus.UNDETERMINED,
  TransactionStatus.CANCELED,
  TransactionStatus.VALIDATORS_TIMEOUT,
  TransactionStatus.LEADER_TIMEOUT,
]);

// Whitelist, not a blacklist (a decided-but-not-explicitly-listed status
// must never be treated as success by default) -- only these two mean
// consensus actually agreed on and committed a result. UNDETERMINED
// (validators disagreed), CANCELED, and the two TIMEOUT statuses all
// mean nothing was written on-chain, even though the outer transaction
// reads as "decided" rather than "still pending".
const SUCCESS_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.ACCEPTED,
  TransactionStatus.FINALIZED,
]);

/**
 * Pulls the contract's actual decoded return value out of a
 * getTransaction() response. This is NOT tx.result (a bare status-code
 * number, confirmed by direct inspection -- e.g. `1`, not `"seal-3"`)
 * and NOT tx.data (the ORIGINAL REQUEST payload, not a return value).
 * The real decoded value lives nested at
 * consensus_data.leader_receipt[].result.payload.readable, itself a
 * JSON-encoded string (e.g. the four characters `"seal-3"` including
 * the quotes) that needs one more JSON.parse to unwrap. Every page
 * that redirects to `/tools/<id>` or `/seal/<id>` after a write
 * depends on this being correct -- confirmed against a real live
 * seal() call before shipping, not assumed from a types file. */
function extractReturnValue(tx: any): unknown {
  const receipts: any[] = tx?.consensus_data?.leader_receipt ?? [];
  const leader = receipts.find((r) => r?.mode === "leader") ?? receipts[0];
  const readable = leader?.result?.payload?.readable;
  if (typeof readable !== "string") return null;
  try {
    return JSON.parse(readable);
  } catch {
    return readable;
  }
}

/**
 * Full write lifecycle: estimate -> sign (wallet prompt) -> pending ->
 * awaiting_decision (polls real consensus status) -> finalized/error.
 * Every mutating page in this app funnels through this helper so the
 * lifecycle UI (see components/TxLifecycle.tsx) is identical everywhere.
 *
 * Takes an already-connected `client` (from useToolBindClient()) rather
 * than constructing its own -- the caller owns the wallet-connection
 * lifecycle via wagmi's hooks, this only owns the tx lifecycle.
 */
export async function writeContract(
  client: GenLayerClient<GenLayerChain>,
  functionName: string,
  args: any[],
  handlers: WriteLifecycleHandlers = {}
): Promise<{ hash: string; result: unknown }> {
  const { onStage, onTxHash, onError } = handlers;
  try {
    onStage?.("estimating");

    // Studio Devnet's Consensus v0.6 rejects any write with no attached
    // fee (FeeValueMustBeNonZero) -- this generic estimate (no
    // simulation, matching `genlayer estimate-fees --json` with no
    // target) has been confirmed sufficient for every plain write on
    // this contract; only an internal-message-triggering write would
    // need the heavier estimateTransactionFeesForWrite path instead,
    // and ToolBind has no such method.
    const fees = await (client as any).estimateTransactionFees({});

    onStage?.("awaiting_signature");
    const hash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
      fees,
    } as any);
    onTxHash?.(String(hash));

    onStage?.("pending");
    let lastStatus: TransactionStatus | null = null;
    let result: unknown = null;
    let finalStatus: TransactionStatus | null = null;
    let finalTx: any = null;
    for (let attempt = 0; attempt < 100; attempt++) {
      const tx = await client.getTransaction({ hash: hash as TransactionHash });
      const status = tx.statusName ?? TransactionStatus.PENDING;
      if (status !== lastStatus) {
        onStage?.(status === TransactionStatus.PENDING ? "pending" : "awaiting_decision");
        lastStatus = status;
      }
      if (DECIDED_STATUSES.has(status)) {
        result = extractReturnValue(tx);
        finalStatus = status;
        finalTx = tx;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // Two independent checks are both required -- confirmed necessary
    // live, not theoretical: a real transaction against this exact
    // contract reached statusName "ACCEPTED" (passing the whitelist
    // below on its own) while its leader had actually crashed
    // (txExecutionResultName "FINISHED_WITH_ERROR", result_name
    // "NO_MAJORITY" -- a GenVM web-render backend fetch failure,
    // "GenVM crashed 3 times... Protocol error: Connection closed").
    // statusName alone reads identical to a genuine success in that
    // case; only txExecutionResultName exposes that nothing was
    // actually written.
    const executionOk =
      finalTx?.txExecutionResultName == null ||
      finalTx.txExecutionResultName === "FINISHED_WITH_RETURN" ||
      finalTx.txExecutionResultName === "FINISHED_WITHOUT_RETURN";
    if (finalStatus === null || !SUCCESS_STATUSES.has(finalStatus) || !executionOk) {
      const error = new Error(
        finalStatus
          ? `Transaction did not complete successfully: status=${finalStatus}, execution=${finalTx?.txExecutionResultName ?? "unknown"}. No state was written.`
          : "Timed out waiting for a decided transaction status."
      );
      onStage?.("error");
      onError?.(error);
      throw error;
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
