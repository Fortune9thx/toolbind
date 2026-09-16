#!/usr/bin/env node
/**
 * ToolBind deploy script -- WRITTEN BUT NOT EXECUTED as part of this
 * build (see the STRICT CONSTRAINTS in README.md: no wallet creation, no
 * chain deploy performed by the assistant). Run this yourself, manually,
 * once you have a funded studio-dev account.
 *
 * Usage:
 *   GENLAYER_PRIVATE_KEY=0x... node scripts/deploy.mjs
 *
 * Mirrors the createAccount/createClient/deployContract pattern used in
 * this account's other GenLayer projects' deploy scripts (e.g.
 * Desktop/vulcan/scripts/deploy.mjs).
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

  const contractCode = readFileSync(join(__dirname, "..", "contracts", "ToolBind.py"), "utf-8");

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
