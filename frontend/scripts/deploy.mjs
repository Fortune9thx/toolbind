#!/usr/bin/env node
/**
 * ToolBind deploy script -- UNVERIFIED against studio-dev, likely to
 * fail as written. The actually-confirmed-working deploy path is the
 * `genlayer` CLI flow in README.md ("Running your own instance"),
 * which every deploy in this project's history has used.
 *
 * The specific gap: this script calls `client.deployContract({ code,
 * args })` with no `fees` argument. Studio Devnet's Consensus v0.6
 * requires an explicit, non-zero fee on every write/deploy
 * (`FeeValueMustBeNonZero` otherwise) -- confirmed live, repeatedly,
 * this session. `genlayer-js@1.1.8` (this project's pinned version)
 * does not expose the fee-estimation call needed to compute that value
 * client-side (no `estimateTransactionFees`-shaped method on its
 * `createClient()` result); only the newer `genlayer` CLI
 * (`genlayer estimate-fees --json` piped into `--fees`) has been
 * confirmed to produce a fee shape studio-dev actually accepts.
 *
 * Kept in the repo as a starting point for a genlayer-js-based deploy
 * path (e.g. once a fee-estimation API is available at this pin), not
 * as a proven alternative to the CLI flow. If you need a script-based
 * deploy today, extend this to accept a pre-computed `fees` object
 * (see the shape `genlayer estimate-fees --json` prints) rather than
 * assuming `deployContract` will work with none supplied.
 *
 * Usage (once the fee gap above is addressed):
 *   GENLAYER_PRIVATE_KEY=0x... node frontend/scripts/deploy.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "61997");
const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC ?? "https://studio-dev.genlayer.com/api";

const studioDevChain = {
  ...studionet,
  id: CHAIN_ID,
  rpcUrls: { default: { http: [RPC_URL] } },
};

async function main() {
  const privateKey = process.env.GENLAYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Set GENLAYER_PRIVATE_KEY to a funded studio-dev account's private key.");
    process.exit(1);
  }

  const account = createAccount(privateKey);
  const client = createClient({ chain: studioDevChain, account });

  const contractCode = readFileSync(join(__dirname, "..", "..", "contracts", "ToolBind.py"), "utf-8");

  console.log(`Deploying ToolBind.py to studio-dev (chainId ${CHAIN_ID}) via ${RPC_URL}...`);
  const hash = await client.deployContract({ code: contractCode, args: [] });
  console.log(`Deploy tx: ${hash}`);

  const receipt = await client.getTransaction({ hash });
  console.log(`Status: ${receipt.statusName}`);
  console.log(`Deployed contract address: ${receipt.data?.contract_address ?? "(check explorer)"}`);
  console.log("\nNext: copy this address into frontend/.env.local as NEXT_PUBLIC_TOOLBIND_CONTRACT.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
