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
