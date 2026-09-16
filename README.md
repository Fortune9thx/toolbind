# ToolBind

**Bind the tool. Then let the agent in.**

Trust infrastructure for AI agents that need to decide whether to use a tool they didn't write.

[**Live App**](https://toolbind.vercel.app) · [**Contract Explorer**](https://explorer-studio-dev.genlayer.com/address/0x0a2813d5fCC663b4F95fCf2c77e5D509104663b6) · [SECURITY.md](./SECURITY.md)

---

## The problem

AI agents increasingly choose and invoke tools they've never seen a human review — an MCP server, an API wrapper, a payments integration — based on nothing but the tool's own self-description. A GitHub URL and a star count aren't evidence: nothing pins them to what the code actually does today, and nothing expires when that stops being true.

**ToolBind is that missing signal.** A **Seal** binds together a pinned commit SHA, a named policy, evidence the contract fetches itself, and GenLayer consensus — with an expiry. It's a verifiable, time-boxed claim: *as of this commit, under this policy, independently fetched evidence supported these claims.*

ToolBind is **not** escrow, **not** a payment or settlement channel, **not** facilitator scoring, and **not** an "LLM decides off-chain, then a contract stamps the output" pattern. No funds are ever held or moved by this contract.

## How it works

```
  register_tool()                    seal(tool_id)
  ────────────────                   ──────────────────────────────────
  repo, sha, claims,      ┌─────────────────────────────────────────┐
  endpoint, policy   ───▶ │  Stage A — Bind          Stage B — Judge │ ───▶  Seal
                          │  (fail closed)           (LLM, gated)    │       {verdict, confidence,
                          │                                          │        risk, reason, expiry}
                          │  Fetch repo@sha.          Only runs if   │
                          │  Confirm the SHA          Stage A bound. │
                          │  is actually visible      Judge claims   │
                          │  on the fetched page.     against bound  │
                          │  If not, Stage B          evidence under │
                          │  never runs.              the policy.    │
                          └─────────────────────────────────────────┘
```

1. **Register** — a publisher submits a repo URL, a pinned commit SHA, capability claims, an optional live endpoint, and a policy (`general` / `mcp-safe` / `payments-safe`).
2. **Seal** — anyone calls `seal(tool_id)`. The contract independently fetches the repo at that SHA (Stage A). If the SHA isn't actually visible in the fetched evidence, judgment is skipped entirely and the seal is recorded `REJECTED`/`INCONCLUSIVE` — a publisher cannot talk their way past a failed identity check. If evidence binds, an LLM judges the claims against it under the named policy (Stage B), with Python backstops that force a safe verdict on low confidence or an internally inconsistent answer.
3. **Consume** — any agent (or human) looks up the seal, with or without a wallet, and decides whether to trust the tool.
4. **Expire & reseal** — every seal expires 30 days after issuance. The owner can reseal after expiry or after moving to a new commit. Anyone can challenge a seal with fresh evidence, marking it `CHALLENGED` for downstream consumers.

## Design principles

| Principle | Implementation |
| --- | --- |
| Real trust problem | Agents currently have no verifiable, expiring signal before invoking an unfamiliar tool |
| Live, authoritative evidence | The contract fetches GitHub at the pinned SHA (and optional live endpoint) itself, inside `seal()` — never trusts a caller's claim about what evidence says |
| Fail-closed identity binding | Stage A is plain, deterministic verification; Stage B (the LLM) is never reached unless identity is confirmed to bind |
| Full transaction lifecycle | Every mutating screen runs fee estimate → sign → pending → decision → finalized/error, via `lib/genlayer.ts` |
| Durable by design | Seals expire; owners reseal on new commits; agents are expected to refuse a missing, expired, or rejected seal |

## Live deployment

| | |
| --- | --- |
| Network | GenLayer Studio Devnet (`studio-dev`) |
| Chain ID | `61997` |
| Contract | [`0x0a2813d5fCC663b4F95fCf2c77e5D509104663b6`](https://explorer-studio-dev.genlayer.com/address/0x0a2813d5fCC663b4F95fCf2c77e5D509104663b6) |
| App | [toolbind.vercel.app](https://toolbind.vercel.app) |
| RPC | `https://studio-dev.genlayer.com/api` |

> **Studio Devnet state is temporary and resets periodically.** Every `tool_id`, `seal_id`, and stored record on this deployment can be wiped without notice. Treat this deployment as a staging environment, not a permanent record — production use would target a persistent GenLayer network.

The contract runs on the GenVM v0.3.0 API surface (`gl.contract.Contract`, `gl.chain.Event`, `gl.vm.run_nondet`, bare `TreeMap[...]` field annotations) that Studio Devnet's consensus runtime executes. This is a different API generation from GenVM v0.2.16 (`gl.Contract`, `gl.Event`, `run_nondet_unsafe`, explicit `TreeMap()` construction) — the two are not interchangeable, and porting this contract to a v0.2.16 network would require reverting those calls.

`tool_id` and `seal_id` values returned by `register_tool`/`seal` are **strings** (`"tool-0"`, `"seal-0"`, ...), not integers. Pass them back exactly as returned.

**Consensus verified live**, not just in local tests: a real `seal()` call reached full validator consensus on Studio Devnet (`MAJORITY_AGREE`, 3/5 AGREE) and correctly recorded a fail-closed `bind_failed` result against an unreachable test SHA — proof both the two-stage bind-then-judge flow and the independent-re-derivation validator pattern hold up under real multi-validator execution, not only gltest's direct-mode mock (which cannot exercise validator logic at all).

## Using ToolBind

**Register a tool** — [`/register`](https://toolbind.vercel.app/register): submit a repo URL, a pinned commit SHA, capability claims, an optional live endpoint, and a policy. You become the tool's owner.

**Seal it** — [`/tools/[id]`](https://toolbind.vercel.app/tools), *Seal*: triggers the two-stage bind-then-judge flow described above.

**Look up a seal** — [`/lookup`](https://toolbind.vercel.app/lookup): no wallet required. Paste a `tool-N` or `seal-N` id to read the record directly.

### How an agent should interpret a seal

| Condition | Action |
| --- | --- |
| No seal / `tool_seal_ids` empty | Unverified — do not invoke |
| Latest seal `status != "ACTIVE"` (`EXPIRED` / `SUPERSEDED` / `CHALLENGED`) | Not currently trusted — re-check or wait for a reseal |
| `verdict != "SEALED"` (`REJECTED` / `INCONCLUSIVE`) | Do not invoke — the tool failed the bind or judgment check |
| A cached seal_id | Re-fetch via `get_seal` / `get_latest_seal` before relying on it — never hold a `"SEALED"` status in memory past your own polling interval |

## Repository structure

```
contracts/ToolBind.py     Python Intelligent Contract
tests/direct/              gltest direct-mode test suite
frontend/                  Next.js 15 (App Router) + TypeScript + Tailwind + Framer Motion
scripts/deploy.mjs         genlayer-js deploy script (alternative to the CLI flow below)
scripts/peek-tx.mjs        transaction status utility
SECURITY.md                threat model, prompt-injection posture, SSRF posture
```

## Running your own instance

### 1. Deploy the contract

```bash
genlayer network use studio-dev
FEES=$(genlayer estimate-fees --json)
genlayer deploy --contract contracts/ToolBind.py --fees "$FEES"
```

Studio Devnet's consensus requires an explicit, non-zero fee on every write or deploy — omitting `--fees` fails with `FeeValueMustBeNonZero`. Fee estimates are per-call; regenerate one with `genlayer estimate-fees --json` before each deploy or write.

### 2. Configure the frontend

```bash
cd frontend
cp .env.example .env.local
```

```
NEXT_PUBLIC_TOOLBIND_CONTRACT=0x...   # address from step 1
NEXT_PUBLIC_GENLAYER_RPC=https://studio-dev.genlayer.com/api
NEXT_PUBLIC_CHAIN_ID=61997
```

### 3. Run or deploy

```bash
npm install && npm run dev     # local development
vercel deploy --prod           # production deploy
```

Set the same three `NEXT_PUBLIC_*` variables in your Vercel project's environment settings.

## Known limitations

- **GitHub rate limits** can degrade Stage A's fetches under heavy call volume; a rate-limited fetch fails closed (non-binding), never open.
- **Rendered content only** — `gl.nondet.web.render(mode="text")` reads served/rendered text, not a JS-executed DOM; a JS-heavy page's real content may read as incomplete evidence.
- **LLM agreement is not truth** — see [SECURITY.md](./SECURITY.md)'s "LLM consensus ≠ correctness" section for the full threat model.
- **Studio Devnet state resets** — nothing on this deployment is a permanent record.

## Testing

```bash
cd tests/direct
pytest
```

27 direct-mode tests cover registration, access control, the two-stage seal flow, bind-failure paths, malformed-judgment handling, and challenge/reseal semantics. `genvm-lint contracts/ToolBind.py` runs clean.
