// Standalone script: decrypts the exported V3 keystore, then drives the
// real register/seal/challenge/reseal flow directly via genlayer-js,
// bypassing genlayer CLI's documented empty-string --args bug entirely
// (a real JS array has no shell-argv ambiguity).
import { readFileSync } from "node:fs";
import { scryptSync, createDecipheriv } from "node:crypto";
import { keccak256, toBytes, bytesToHex } from "viem";
import { createAccount, createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const KEYSTORE_PATH = process.argv[2];
const PASSWORD = process.argv[3];

function decryptV3Keystore(keystore, password) {
  const crypto = keystore.Crypto || keystore.crypto;
  const kdfparams = crypto.kdfparams;
  const salt = Buffer.from(kdfparams.salt, "hex");
  const derivedKey = scryptSync(Buffer.from(password, "utf8"), salt, kdfparams.dklen, {
    N: kdfparams.n,
    r: kdfparams.r,
    p: kdfparams.p,
    maxmem: 1024 * 1024 * 1024,
  });

  const ciphertext = Buffer.from(crypto.ciphertext, "hex");
  const macCheck = keccak256(bytesToHex(Buffer.concat([derivedKey.subarray(16, 32), ciphertext])));
  const macExpected = "0x" + crypto.mac;
  if (macCheck.toLowerCase() !== macExpected.toLowerCase()) {
    throw new Error("MAC mismatch -- wrong password or corrupted keystore");
  }

  const iv = Buffer.from(crypto.cipherparams.iv, "hex");
  const decipher = createDecipheriv("aes-128-ctr", derivedKey.subarray(0, 16), iv);
  const privateKey = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  if (privateKey.length !== 32) {
    throw new Error(`decrypted key is ${privateKey.length} bytes, expected 32`);
  }
  return "0x" + privateKey.toString("hex");
}

const keystore = JSON.parse(readFileSync(KEYSTORE_PATH, "utf8"));
const privateKey = decryptV3Keystore(keystore, PASSWORD);

const account = createAccount(privateKey);
const expectedAddress = "0x" + keystore.address;
if (account.address.toLowerCase() !== expectedAddress.toLowerCase()) {
  throw new Error(`derived address ${account.address} does not match keystore address ${expectedAddress}`);
}
console.error(`Decrypted OK. Address: ${account.address}`);

const CHAIN_ID = 61997;
const RPC_URL = "https://studio-dev.genlayer.com/api";
const CONTRACT = "0x659F653f4dEc47a2Fedb2A11B11a1894efF71fac";

const chain = { ...studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC_URL] } } };
const client = createClient({ chain, account });

function extractReturnValue(tx) {
  const receipts = tx?.consensus_data?.leader_receipt ?? [];
  const leader = receipts.find((r) => r?.mode === "leader") ?? receipts[0];
  const readable = leader?.result?.payload?.readable;
  if (typeof readable !== "string") return null;
  try {
    return JSON.parse(readable);
  } catch {
    return readable;
  }
}

async function writeAndWait(functionName, args, label) {
  console.error(`\n--- ${label} ---`);
  console.error(`${functionName}(${JSON.stringify(args)})`);

  const fees = await client.estimateTransactionFees({});

  const hash = await client.writeContract({
    address: CONTRACT,
    functionName,
    args,
    fees,
  });
  console.error(`tx: ${hash}`);

  let result = null;
  let status = null;
  let execResult = null;
  for (let i = 0; i < 60; i++) {
    const tx = await client.getTransaction({ hash });
    status = tx.statusName;
    execResult = tx.txExecutionResultName;
    if (["ACCEPTED", "FINALIZED", "UNDETERMINED", "CANCELED", "VALIDATORS_TIMEOUT", "LEADER_TIMEOUT"].includes(status)) {
      result = extractReturnValue(tx);
      break;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.error(`status: ${status}`);
  console.error(`txExecutionResultName: ${execResult}`);
  console.error(`result: ${JSON.stringify(result)}`);
  // statusName alone is not sufficient -- confirmed live: a real write
  // against this contract reached "ACCEPTED" while its leader crashed
  // (execResult FINISHED_WITH_ERROR, no state written).
  const executionOk = execResult == null || execResult === "FINISHED_WITH_RETURN" || execResult === "FINISHED_WITHOUT_RETURN";
  if (!["ACCEPTED", "FINALIZED"].includes(status) || !executionOk) {
    throw new Error(`${label} did not complete successfully: status=${status}, execution=${execResult}`);
  }
  return { hash, result };
}

async function main() {
  const step = process.argv[4];
  const rest = process.argv.slice(5);

  if (step === "register") {
    const [repo, sha, claims, endpoint, policy] = rest;
    const { result } = await writeAndWait("register_tool", [repo, sha, claims, endpoint, policy], `register ${repo}@${sha.slice(0, 7)}`);
    console.log(JSON.stringify({ tool_id: result }));
  } else if (step === "seal") {
    const [toolId] = rest;
    const { result } = await writeAndWait("seal", [toolId], `seal ${toolId}`);
    console.log(JSON.stringify({ seal_id: result }));
  } else if (step === "challenge") {
    const [sealId, evidenceUrl] = rest;
    await writeAndWait("challenge", [sealId, evidenceUrl], `challenge ${sealId}`);
    console.log(JSON.stringify({ ok: true }));
  } else if (step === "update_claims") {
    const [toolId, claims, sha] = rest;
    await writeAndWait("update_claims", [toolId, claims, sha], `update_claims ${toolId}`);
    console.log(JSON.stringify({ ok: true }));
  } else if (step === "reseal") {
    const [toolId] = rest;
    const { result } = await writeAndWait("reseal", [toolId], `reseal ${toolId}`);
    console.log(JSON.stringify({ seal_id: result }));
  } else {
    throw new Error(`unknown step: ${step}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
