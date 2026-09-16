"""
Windows compatibility shim for gltest's direct-mode message injection.

gltest.direct.loader._inject_message_to_fd0 (genlayer-test==0.29.2) does:
    os.dup2(fd, 0)   # duplicate the temp file's fd onto stdin
    os.close(fd)     # close the original fd
    os.unlink(path)  # delete the temp file

On POSIX this works because unlinking an open file just removes the
directory entry while the still-open fd (now living at fd 0) keeps the
data alive. On Windows, os.unlink refuses to remove a file that any
handle still has open -- fd 0 still points at it via dup2 -- so this
raises PermissionError (WinError 32) on every direct-mode contract
deploy.

This is an upstream bug in the test library, not in the contract under
test (same shim already used in this account's ServiceComplianceGate,
OnChainMilestoneVerifier, and AgentIntentSettlement projects). We patch
os.unlink to swallow exactly that failure so test collection can
proceed; the OS actually deletes the temp file once fd 0 is
closed/reused at process exit.

ToolBind's seal() uses gl.nondet.web.render(mode="text") (handled by
gltest's stock vm.mock_web) and gl.nondet.exec_prompt with no
response_format="json" (i.e. text mode) -- the contract does its own
guarded JSON extraction (_parse_json_object) rather than requesting
response_format="json", so a malformed or prose-wrapped model reply
degrades to a safe default instead of crashing consensus.

This needs one real WASI-mock patch: gltest's direct-mode
_handle_llm_request (gltest/direct/wasi_mock.py) unconditionally tries
json.loads() on every vm.mock_llm() response string and, if it parses,
substitutes the parsed dict for the string before handing it back to
the SDK -- regardless of what response_format the contract actually
requested. A test that mocks a *text*-mode exec_prompt call with
`json.dumps({...})` (a plain, valid JSON string) hits exactly that
auto-parse and the SDK's own _decode_nondet_text then rejects the dict
with "text result is not a string" -- a real gltest-side mismatch
between its mock_llm auto-parsing and the SDK's response_format
contract, not a bug in this contract (confirmed live: a real seal()
call against the deployed contract on studio-dev correctly parses a
genuine text LLM response end-to-end). Use `llm_response()` below for
every mock_llm() call in this suite -- it wraps the JSON payload in
enough surrounding prose that json.loads() on the whole string fails
(keeping gltest's mock a plain string, as text mode requires), while
still being extractable by the contract's own first-'{'-to-last-'}'
parser.
"""

import os
import json

_original_unlink = os.unlink


def _tolerant_unlink(path, *args, **kwargs):
    try:
        _original_unlink(path, *args, **kwargs)
    except PermissionError:
        pass


os.unlink = _tolerant_unlink


def llm_response(payload: dict) -> str:
    """Builds a mock_llm() response string for ToolBind's text-mode
    exec_prompt call. See the module docstring for why a bare
    json.dumps(payload) breaks under gltest's direct-mode mock, and why
    this prose-wrapped form is what a real model reply looks like
    anyway (the contract's _parse_json_object is written to handle
    exactly this shape)."""
    return f"Here is my judgment:\n{json.dumps(payload)}\nEnd of response."


def warp_with_message(vm, iso_timestamp: str) -> None:
    """vm.warp() alone patches datetime.datetime.now() but does NOT
    update the live genlayer.message module's raw["datetime"] -- see
    this account's OnChainMilestoneVerifier conftest.py for the full
    finding. ToolBind's _now_iso() uses datetime.now() exclusively (not
    gl.message.raw["datetime"]), so vm.warp() alone is sufficient here;
    this helper is kept only for parity/future-proofing in case a test
    needs to inspect gl.message.raw directly."""
    import sys

    vm.warp(iso_timestamp)
    module = sys.modules.get("genlayer.message")
    if module is not None and hasattr(module, "raw"):
        try:
            module.raw["datetime"] = iso_timestamp
        except Exception:
            pass
