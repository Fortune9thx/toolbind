"""Covers the fail-closed Stage A bind gate and the Python backstops on
Stage B's LLM output: bind-fail never produces SEALED, malformed JSON
never crashes the contract, low confidence forces INCONCLUSIVE, and an
internally inconsistent SEALED-but-not-approved answer is downgraded.
"""

import json
import re

import pytest

from conftest import llm_response

CONTRACT_PATH = "contracts/ToolBind.py"

REPO = "https://github.com/acme/mcp-tool"
SHA = "abc1234"


def re_escape(url: str) -> str:
    return re.escape(url)


@pytest.fixture
def contract(direct_deploy):
    return direct_deploy(CONTRACT_PATH)


@pytest.fixture
def tool_id(contract):
    return contract.register_tool(REPO, SHA, "reads files safely", "", "general")


def _commit_url():
    return f"{REPO}/commit/{SHA}"


def _readme_url():
    return f"{REPO}/raw/{SHA}/README.md"


def test_bind_fails_when_no_web_mock_registered(contract, direct_vm, tool_id):
    # No mock_web registered at all -> gl.nondet.web.render raises inside
    # _bind_stage_a, which degrades to repo_match=False/sha_visible=False
    # rather than propagating -- Stage B must never run, and the LLM mock
    # (also unregistered) would raise if it were reached, proving the
    # short-circuit.
    seal_id = contract.seal(tool_id)
    record = json.loads(contract.get_seal(seal_id))
    assert record["verdict"] != "SEALED"
    assert record["reason"] == "bind_failed"


def test_bind_fails_when_sha_not_visible_on_page(contract, direct_vm, tool_id):
    # A genuinely nonexistent sha fails BOTH fetches in reality --
    # github.com's raw-content route 404s for a ref that doesn't
    # resolve, exactly like the commit page not mentioning it. No
    # readme mock is registered here (unlike the happy-path tests) so
    # readme_ok also degrades to False, matching that reality --
    # otherwise this test would no longer prove what its name claims
    # once readme_ok became an alternate sufficient bind signal.
    direct_vm.mock_web(re_escape(_commit_url()), {"body": "acme/mcp-tool - a totally different commit"})
    direct_vm.mock_llm(".*", llm_response({
        "approved": True, "verdict": "SEALED", "confidence": "0.99",
        "risk": "low", "reason": "should never be reached",
    }))

    seal_id = contract.seal(tool_id)
    record = json.loads(contract.get_seal(seal_id))
    assert record["verdict"] != "SEALED"
    assert record["reason"] == "bind_failed"


def test_bind_fails_when_repo_not_matched(contract, direct_vm, tool_id):
    # Same reasoning as above: a real repo/sha mismatch fails the raw
    # fetch too, so no readme mock is registered.
    direct_vm.mock_web(re_escape(_commit_url()), {"body": f"commit {SHA[:7]} - some-other-repo"})
    direct_vm.mock_llm(".*", llm_response({
        "approved": True, "verdict": "SEALED", "confidence": "0.99",
        "risk": "low", "reason": "should never be reached",
    }))

    seal_id = contract.seal(tool_id)
    record = json.loads(contract.get_seal(seal_id))
    assert record["verdict"] != "SEALED"


def _mock_bind_ok(direct_vm):
    direct_vm.mock_web(re_escape(_commit_url()), {"body": f"Commit {SHA[:7]} acme/mcp-tool - GitHub"})
    direct_vm.mock_web(re_escape(_readme_url()), {"body": "# mcp-tool"})


def test_malformed_llm_json_yields_inconclusive_not_crash(contract, direct_vm, tool_id):
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", "not valid json at all, sorry")

    seal_id = contract.seal(tool_id)
    record = json.loads(contract.get_seal(seal_id))
    assert record["verdict"] == "INCONCLUSIVE"
    assert record["approved"] is False


def test_low_confidence_forces_inconclusive(contract, direct_vm, tool_id):
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response({
        "approved": True, "verdict": "SEALED", "confidence": "0.40",
        "risk": "med", "reason": "weak evidence",
    }))

    seal_id = contract.seal(tool_id)
    record = json.loads(contract.get_seal(seal_id))
    assert record["verdict"] == "INCONCLUSIVE"
    assert record["approved"] is False


def test_sealed_without_approved_is_downgraded(contract, direct_vm, tool_id):
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response({
        "approved": False, "verdict": "SEALED", "confidence": "0.95",
        "risk": "low", "reason": "inconsistent",
    }))

    seal_id = contract.seal(tool_id)
    record = json.loads(contract.get_seal(seal_id))
    assert record["verdict"] == "INCONCLUSIVE"


def test_bare_float_confidence_string_from_model_is_handled(contract, direct_vm, tool_id):
    # Model returns an unquoted-looking numeric string; contract must
    # still coerce/clamp it via float() rather than crash, and must
    # never let confidence formatting leak a raw Python float into
    # stored JSON (it is always re-emitted as a fixed "%.2f" string).
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", llm_response({
        "approved": True, "verdict": "SEALED", "confidence": "1.5",
        "risk": "low", "reason": "over-claimed confidence",
    }))

    seal_id = contract.seal(tool_id)
    record = json.loads(contract.get_seal(seal_id))
    assert record["confidence"] == "1.00"
    assert isinstance(record["confidence"], str)
