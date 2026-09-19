"""challenge() appends a challenge record and marks the prior seal
CHALLENGED; reseal() is rejected before expiry when sha is unchanged,
and allowed after expiry or with a new sha.
"""

import json
import re

import pytest

from conftest import llm_response, warp_with_message

CONTRACT_PATH = "contracts/ToolBind.py"

REPO = "https://github.com/acme/mcp-tool"
SHA = "abc1234"
SHA2 = "def5678"

SEALED_VERDICT = {
    "approved": True,
    "verdict": "SEALED",
    "confidence": "0.90",
    "risk": "low",
    "reason": "evidence supports claims",
}


def re_escape(url: str) -> str:
    return re.escape(url)


@pytest.fixture
def contract(direct_deploy):
    return direct_deploy(CONTRACT_PATH)


def _mock_bind_ok(direct_vm, sha=SHA):
    direct_vm.mock_web(
        re_escape(f"{REPO}/commit/{sha}"),
        {"body": f"Commit {sha[:7]} acme/mcp-tool - GitHub"},
    )
    direct_vm.mock_web(re_escape(f"{REPO}/raw/{sha}/README.md"), {"body": "# mcp-tool"})


def test_challenge_marks_seal_challenged(contract, direct_vm, direct_alice):
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    seal_id = contract.seal(tool_id)

    direct_vm.sender = direct_alice
    direct_vm.mock_web(re_escape("https://example.com/counter-evidence"), {"body": "counter-evidence page"})
    contract.challenge(seal_id, "https://example.com/counter-evidence")

    record = json.loads(contract.get_seal(seal_id))
    assert record["status"] == "CHALLENGED"
    assert record["challenger"].lower() == str(direct_alice).lower()
    assert record["challenge_evidence_url"] == "https://example.com/counter-evidence"


def test_challenge_rejects_missing_seal(contract):
    with pytest.raises(Exception):
        contract.challenge("seal-999", "https://example.com/evidence")


def test_challenge_rejects_empty_evidence_url(contract, direct_vm):
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    seal_id = contract.seal(tool_id)

    with pytest.raises(Exception):
        contract.challenge(seal_id, "")


def test_challenge_rejects_ssrf_evidence_url(contract, direct_vm):
    """A localhost/internal evidence_url must be rejected before any
    fetch is even attempted -- same SSRF guard register_tool applies to
    endpoint."""
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    seal_id = contract.seal(tool_id)

    with pytest.raises(Exception):
        contract.challenge(seal_id, "http://localhost:8080/internal")

    record = json.loads(contract.get_seal(seal_id))
    assert record["status"] == "ACTIVE"


def test_challenge_rejects_unreachable_evidence(contract, direct_vm):
    """An evidence_url that cannot actually be fetched (no web mock
    registered for it, simulating a dead/unreachable page) must not be
    able to flip the seal's trust status -- challenge() requires a real,
    verified fetch, not a bare unverified string."""
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    seal_id = contract.seal(tool_id)

    # Deliberately no mock_web for this URL -- simulates an unreachable
    # evidence page.
    with pytest.raises(Exception):
        contract.challenge(seal_id, "https://example.com/dead-link")

    record = json.loads(contract.get_seal(seal_id))
    assert record["status"] == "ACTIVE"
    assert record["challenger"] == ""


def test_challenge_rejects_repeat_challenge(contract, direct_vm, direct_alice):
    """A second challenge() call against an already-CHALLENGED seal must
    be rejected, not silently overwrite the first challenger's
    evidence."""
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    seal_id = contract.seal(tool_id)

    direct_vm.mock_web(re_escape("https://example.com/first-evidence"), {"body": "first evidence"})
    contract.challenge(seal_id, "https://example.com/first-evidence")

    direct_vm.sender = direct_alice
    direct_vm.mock_web(re_escape("https://example.com/second-evidence"), {"body": "second evidence"})
    with pytest.raises(Exception):
        contract.challenge(seal_id, "https://example.com/second-evidence")

    record = json.loads(contract.get_seal(seal_id))
    assert record["challenge_evidence_url"] == "https://example.com/first-evidence"


def test_reseal_rejected_before_expiry_same_sha(contract, direct_vm):
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    contract.seal(tool_id)

    with pytest.raises(Exception):
        contract.reseal(tool_id)


def test_reseal_allowed_with_new_sha(contract, direct_vm):
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    first_seal = contract.seal(tool_id)

    contract.update_claims(tool_id, "claims", SHA2)
    _mock_bind_ok(direct_vm, sha=SHA2)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))

    second_seal = contract.reseal(tool_id)
    assert second_seal != first_seal

    first_record = json.loads(contract.get_seal(first_seal))
    second_record = json.loads(contract.get_seal(second_seal))
    assert first_record["status"] == "SUPERSEDED"
    assert second_record["status"] == "ACTIVE"
    assert second_record["sha"] == SHA2


def test_reseal_allowed_after_expiry(contract, direct_vm):
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    first_seal = contract.seal(tool_id)

    # Warp well past SEAL_LIFETIME_SECONDS (30 days).
    warp_with_message(direct_vm, "2999-01-01T00:00:00+00:00")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))

    second_seal = contract.reseal(tool_id)
    assert second_seal != first_seal
    second_record = json.loads(contract.get_seal(second_seal))
    assert second_record["status"] == "ACTIVE"


def test_seal_rejects_duplicate_at_unchanged_sha(contract, direct_vm):
    """The freshness rule must be enforced by seal() itself, not only by
    reseal()'s wrapper -- calling the public seal() entry point directly
    a second time, against the same still-fresh sha, must be rejected
    exactly like a direct reseal() call would be. This is what prevents
    anyone from spamming duplicate seals against an unchanged commit by
    simply not going through reseal()."""
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    contract.seal(tool_id)

    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    with pytest.raises(Exception):
        contract.seal(tool_id)


def test_seal_allowed_again_with_new_sha_direct_call(contract, direct_vm):
    """The freshness gate's other escape hatch (a changed sha) also
    applies to a direct seal() call, not only reseal()."""
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    first_seal = contract.seal(tool_id)

    contract.update_claims(tool_id, "claims", SHA2)
    _mock_bind_ok(direct_vm, sha=SHA2)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    second_seal = contract.seal(tool_id)

    assert second_seal != first_seal
    first_record = json.loads(contract.get_seal(first_seal))
    assert first_record["status"] == "SUPERSEDED"


def test_get_seal_reports_expired_status_without_reseal(contract, direct_vm):
    """Expiry must be visible on every consumer-facing read, not only
    after someone calls reseal() -- get_seal() must lazily recompute
    EXPIRED from elapsed time rather than returning the stale "ACTIVE"
    value that was written once at seal() time."""
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    seal_id = contract.seal(tool_id)

    record_before = json.loads(contract.get_seal(seal_id))
    assert record_before["status"] == "ACTIVE"

    warp_with_message(direct_vm, "2999-01-01T00:00:00+00:00")

    record_after = json.loads(contract.get_seal(seal_id))
    assert record_after["status"] == "EXPIRED"


def test_get_latest_seal_reports_expired_status(contract, direct_vm):
    """Same as above, via get_latest_seal() -- the path the frontend's
    own SEALED/ACTIVE trust check actually reads from."""
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    contract.seal(tool_id)

    warp_with_message(direct_vm, "2999-01-01T00:00:00+00:00")

    latest = json.loads(contract.get_latest_seal(tool_id))
    assert latest["status"] == "EXPIRED"
    # A downstream consumer's trust check (verdict == SEALED and
    # status == ACTIVE) must now correctly read as untrusted.
    assert not (latest["verdict"] == "SEALED" and latest["status"] == "ACTIVE")


def test_challenged_seal_status_not_overridden_by_expiry(contract, direct_vm):
    """A CHALLENGED seal stays CHALLENGED even once it would also be
    time-expired -- CHALLENGED is already a distrust signal in its own
    right and must not be silently relabeled EXPIRED, which would erase
    the fact that it was specifically disputed."""
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response(SEALED_VERDICT))
    seal_id = contract.seal(tool_id)

    direct_vm.mock_web(re_escape("https://example.com/counter-evidence"), {"body": "counter-evidence"})
    contract.challenge(seal_id, "https://example.com/counter-evidence")

    warp_with_message(direct_vm, "2999-01-01T00:00:00+00:00")

    record = json.loads(contract.get_seal(seal_id))
    assert record["status"] == "CHALLENGED"
