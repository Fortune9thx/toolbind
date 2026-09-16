# ToolBind

**Bind the tool. Then let the agent in.**

## The problem

AI agents increasingly choose and invoke tools they've never seen a
human review -- an MCP server, an API wrapper, a payments integration --
based on nothing but the tool's own self-description. There is no
lightweight, verifiable, expiring signal an agent can check before
trusting a tool at a specific commit. ToolBind is that signal: a Seal is
a specific commit SHA + a named policy + live public evidence + GenLayer
consensus + an expiry, bound together by a contract that fetches its own
evidence rather than trusting the publisher's word for what that
evidence says.

ToolBind is **not** escrow, **not** a payment/settlement channel, **not**
facilitator scoring, and **not** an "LLM decides off-chain then a
contract just stamps the output" pattern.

## Quality-bar mapping

| Bar | How ToolBind meets it |
| --- | --- |
| Real trust problem | Agents choosing tools with no verifiable, expiring trust signal |
| Live/authoritative data | The contract itself fetches GitHub at the pinned SHA + optional live endpoint inside `seal()` -- never trusts a caller's claim about evidence content |
| Complete, accurate source | Full contract, tests, frontend, and docs in this repo |
| Frontend genuinely writes the contract | Every mutating page (`/register`, `/tools/[id]`, `/challenge/[id]`) runs the full fee-estimate → sign → pending → decision → finalized/error lifecycle via `lib/genlayer.ts` |
| Meaningful with continued use | Seals expire after 30 days; owners reseal on a new commit; agents are expected to refuse a missing/expired/REJECTED seal_id |

## Network

| | |
| --- | --- |
| Network | GenLayer studio-dev |
| Chain ID | 61997 |
| RPC | https://studio-dev.genlayer.com/api |
| Explorer | https://explorer-studio-dev.genlayer.com |
| Studio UI | https://studio-dev.genlayer.com |

**studio-dev state is TEMPORARY.** It resets periodically. Every tool_id,
seal_id, and stored record on this deployment can be wiped without
notice. Treat any studio-dev deployment as a demo/staging environment,
never a permanent record.

- Contract address: `0x91e6Fff36D4082e575391b42149AB006cD18BA35`
- Explorer link: https://explorer-studio-dev.genlayer.com/address/0x91e6Fff36D4082e575391b42149AB006cD18BA35
- Frontend URL: https://toolbind.vercel.app

Deployed and verified live via a real `register_tool` write followed by a
real `get_tool` read (`tool-0`, repo `genlayerlabs/genlayer-studio`) --
both went through full validator consensus (`ACCEPTED`/`AGREE`) on
studio-dev.

Note: the contract's `tool_id`/`seal_id` values returned by
`register_tool`/`seal` are **strings** in the form `"tool-0"`/`"seal-0"`,
not integers -- pass them back exactly as returned to `get_tool`/
`get_seal`/etc.

## How to use it

**Register a tool** (`/register`): submit a github.com repo URL, a
pinned commit SHA, capability claims, an optional live endpoint, and a
policy (`general` / `mcp-safe` / `payments-safe`). You become the
tool's owner.

**Seal it** (`/tools/[id]`, "Seal"): anyone can call `seal(tool_id)`.
The contract fetches the commit page and README at that SHA (Stage A);
if that evidence doesn't bind to the claimed repo/sha, the seal is
recorded REJECTED/INCONCLUSIVE and the LLM is never invoked. If it
binds, an LLM judges the claims against the bound evidence and policy
(Stage B), subject to Python backstops (see SECURITY.md) that force
INCONCLUSIVE on low confidence, malformed output, or an internally
inconsistent answer.

**Look up a seal** (`/lookup`): no wallet required. Paste a `tool-N` or
`seal-N` id and read the record directly.

## How an agent should treat a seal

- **No seal / `tool_seal_ids` empty** -- treat as unverified; do not
  invoke.
- **Latest seal `status != "ACTIVE"`** (EXPIRED / SUPERSEDED /
  CHALLENGED) -- do not treat as current trust; check `get_latest_seal`
  again or wait for a reseal.
- **`verdict != "SEALED"`** (REJECTED / INCONCLUSIVE) -- do not invoke;
  the tool failed either the bind check or the judgment check.
- **A stale seal_id an agent already cached** -- re-fetch via
  `get_seal`/`get_latest_seal` before relying on it; a seal can be
  superseded or challenged after it was first read. Agents should never
  hold a seal_id's "SEALED" status in memory past its own polling
  interval.

## Known limits

- GitHub rate limits can degrade Stage A's fetches under heavy call
  volume; a rate-limited fetch fails closed (non-binding), not open.
- `gl.nondet.web.render(mode="text")` reads rendered/served text, not a
  JS-executed DOM; a JS-rendered page's real content may read as
  incomplete evidence.
- LLM agreement is not truth -- see SECURITY.md's "LLM consensus ≠
  correctness" section.
- studio-dev state resets; nothing here is a permanent record.

## Repo structure

```
contracts/ToolBind.py        Python Intelligent Contract
tests/direct/                 gltest direct-mode test suite
frontend/                     Next.js 15 App Router + TS + Tailwind + Framer Motion
scripts/deploy.mjs            manual deploy script (NOT executed by this build)
scripts/peek-tx.mjs           manual tx-status utility
SECURITY.md
README.md
```

---

## Deployment status

**Contract: deployed and live** on studio-dev at
`0x91e6Fff36D4082e575391b42149AB006cD18BA35` (see Network section above).
Frontend build is clean and wired to that address; Vercel deploy and
GitHub push are the remaining manual steps below.

The contract is on the **v0.3.0 GenVM API** (`import genlayer as gl`,
`gl.contract.Contract`, `gl.chain.Event`, `gl.vm.run_nondet`, bare
`TreeMap[...]` annotations with **no** explicit `TreeMap()` construction
in `__init__`), matching what studio-dev's current runner actually
executes -- **not** the older v0.2.16-style API
(`gl.Contract`/`gl.Event`/`run_nondet_unsafe`/explicit `self.x =
TreeMap()`) used by this account's Bradbury-targeting projects. Deploying
this exact contract file to Bradbury instead would need reverting those
specific API calls; the two are not interchangeable.

### Redeploying the contract (if you change the code)

```bash
cd toolbind
genlayer network use studio-dev   # already the active network
FEES=$(genlayer estimate-fees --json)
genlayer deploy --contract contracts/ToolBind.py --fees "$FEES"
```

`genlayer deploy`/`write` with no `--fees` fails with
`FeeValueMustBeNonZero` on studio-dev's v0.6 consensus -- always pipe a
fresh `genlayer estimate-fees --json` result into `--fees` first (fee
estimates are per-call, not static).

`scripts/deploy.mjs` (a genlayer-js-based alternative) is present but
**untested against studio-dev's actual required fee shape** -- the
CLI-based flow above is the one confirmed working end-to-end
(`register_tool` write + `get_tool` read, both reaching full validator
consensus).

### 2. Fill in the frontend env vars

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_TOOLBIND_CONTRACT=0x...   # the address printed in step 1
NEXT_PUBLIC_GENLAYER_RPC=https://studio-dev.genlayer.com/api
NEXT_PUBLIC_CHAIN_ID=61997
```

### 3. Git init / commit (you author this yourself)

```bash
cd toolbind
git init
git add .
git commit -m "Initial ToolBind build"
```

Then push to your own GitHub remote:

```bash
git remote add origin https://github.com/<you>/toolbind.git
git push -u origin main
```

### 4. Deploy the frontend to Vercel

```bash
cd frontend
vercel deploy          # preview
vercel deploy --prod   # production, once you've verified the preview
```

Set the same three `NEXT_PUBLIC_*` env vars in the Vercel project
settings (or via `vercel env add`) before deploying.

### 5. Come back and fill in the placeholders above

Once deployed, update this README's "Network" section with the real
contract address, explorer link, and frontend URL.
