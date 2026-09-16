#!/usr/bin/env node
/**
 * Utility: fetch and print a transaction's current status/receipt from
 * studio-dev, for manually checking a deploy or a seal() call. Unlike
 * scripts/deploy.mjs, this is a read-only call with no fee requirement,
 * and has been confirmed working against a real deployment transaction.
 *
 * Usage:
 *   node frontend/scripts/peek-tx.mjs 0xTRANSACTION_HASH
 */

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "61997");
const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC ?? "https://studio-dev.genlayer.com/api";

const studioDevChain = {
  ...studionet,
  id: CHAIN_ID,
  rpcUrls: { default: { http: [RPC_URL] } },
};

async function main() {
  const hash = process.argv[2];
  if (!hash) {
    console.error("Usage: node frontend/scripts/peek-tx.mjs 0xTRANSACTION_HASH");
    process.exit(1);
  }

  const client = createClient({ chain: studioDevChain });
  const tx = await client.getTransaction({ hash });
  console.log(JSON.stringify(tx, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
