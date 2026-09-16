# SECURITY.md — ToolBind

## Trust model

ToolBind never trusts a caller's own assertion about what a piece of web
evidence says. `seal(tool_id)` fetches its own evidence -- the GitHub
commit page and README at the claimed SHA, and (if declared) the tool's
live endpoint -- inside the contract's non-deterministic block, run
independently by the leader and by every validator. The only things any
role ever trusts as input are: the tool's already-registered, already-
agreed state (repo, sha, claims, endpoint, policy) and the evidence it
fetched itself, fresh, this call.

No funds are ever held or moved by this contract. There is no
`@gl.public.write.payable` method and no `emit_transfer` call anywhere in
`contracts/ToolBind.py`. ToolBind only ever writes trust records.

## Bind-fail-closed design

Stage A computes `repo_match` and `sha_visible` in plain deterministic
Python, from the fetched evidence, before Stage B (the LLM judgment) is
ever invoked. If either is false, Stage B never runs -- the model is
never given the chance to talk a caller into a SEALED verdict for
evidence that doesn't actually bind to the claimed repo/commit. This is
enforced in code, not by prompt instruction: the `_bind_and_judge`
function returns immediately on a failed bind, before `gl.nondet.exec_prompt`
is ever called.

## Prompt-injection mitigations

Every piece of caller-supplied or fetched free text embedded in the
Stage B prompt (claims, fetched commit page text, fetched README text,
fetched endpoint response) is:

1. **Sanitized** -- angle brackets and triple-backtick sequences are
   stripped before embedding (`_sanitize`), closing the cheapest
   fence-forgery attempts.
2. **Wrapped in a fresh, per-call fence token** (`_fence_token`, a
   `secrets.token_hex`-derived marker generated after the content is
   already fixed) so no text a caller could type in advance can ever
   contain the exact token used to bound it.
3. **Screened by a non-blocking heuristic** (`_looks_manipulative`) for
   common injection phrasing ("ignore the evidence", "always approve",
   "mark this sealed", etc.). A match never blocks anything by itself --
   it only appends an explicit screening notice to the prompt asking the
   model to apply extra scrutiny. A false positive must never block a
   genuine registration.

This is defense-in-depth, not a guarantee: the real backstop against a
model that is nonetheless manipulated is the Python-level checks below,
which apply regardless of what the model claims.

## Python backstops on Stage B (cannot be talked around)

1. Bind failed -> verdict can never be SEALED (enforced before Stage B
   runs at all).
2. `confidence` parses to < 0.70 -> forced INCONCLUSIVE, `approved`
   forced False.
3. `verdict == "SEALED"` but `approved == False` -> downgraded to
   INCONCLUSIVE.
4. Malformed/non-JSON model output -> INCONCLUSIVE, never raises.

## "LLM consensus ≠ correctness" caveat

A SEALED verdict means: independent validators, given the same bound
evidence and the same policy, agreed a threshold-confidence LLM judgment
found that evidence consistent with the tool's claims. It is **not** a
guarantee that the tool is safe, bug-free, or that its claims are true in
any deeper sense than "the fetched public evidence, read by consensus,
supports them." Treat a SEALED verdict as a floor, not a certification.

## Access control

- `register_tool` / `seal` / `challenge` -- public, but guarded: `seal`
  and `challenge` both revert on a nonexistent id.
- `update_claims` / `reseal` -- owner-only, compared via
  `gl.message.sender_address.as_hex` against the stored owner hex,
  case-insensitively.

## Append-only history

`seals` and `tool_seal_ids` are never edited or deleted, only appended
to. A CHALLENGED or SUPERSEDED seal remains permanently readable via
`get_seal` -- ToolBind's history is a record, not a mutable status flag.

## studio-dev impermanence caveat

studio-dev is a devnet whose state resets periodically. Every tool_id,
seal_id, and stored record in this deployment can be wiped without
notice. Do not treat a studio-dev seal as a permanent record; treat this
deployment as a demonstration environment only, per README.md.

## Known limits

- GitHub rate limits on Stage A's fetches can cause `readme_ok`/bind
  checks to degrade under heavy call volume; a rate-limited fetch fails
  closed (treated as non-binding), not open.
- `gl.nondet.web.render(mode="text")` reads rendered/served text, not a
  JS-executed DOM -- a JS-rendered page whose content depends on
  client-side execution may read as empty or incomplete evidence.
- Stage B's judgment is only as good as the LLM's reading of the bound
  evidence; see the "LLM consensus ≠ correctness" caveat above.
