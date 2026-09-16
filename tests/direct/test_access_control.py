"""Access-control tests: a funded random wallet cannot update someone
else's tool via update_claims or reseal.
"""

import json

import pytest

CONTRACT_PATH = "contracts/ToolBind.py"

REPO = "https://github.com/acme/mcp-tool"
SHA = "abc1234"
SHA2 = "def5678"


@pytest.fixture
def contract(direct_deploy):
    return direct_deploy(CONTRACT_PATH)


def test_update_claims_rejects_non_owner(contract, direct_vm, direct_alice):
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")

    direct_vm.sender = direct_alice
    with pytest.raises(Exception):
        contract.update_claims(tool_id, "new claims", SHA2)


def test_update_claims_allows_owner(contract, direct_vm):
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    contract.update_claims(tool_id, "updated claims", SHA2)
    record = json.loads(contract.get_tool(tool_id))
    assert record["claims"] == "updated claims"
    assert record["sha"] == SHA2


def test_update_claims_rejects_unchanged_sha(contract, direct_vm):
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    with pytest.raises(Exception):
        contract.update_claims(tool_id, "updated claims", SHA)


def test_reseal_rejects_non_owner(contract, direct_vm, direct_alice):
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")

    direct_vm.sender = direct_alice
    with pytest.raises(Exception):
        contract.reseal(tool_id)


def test_update_claims_rejects_nonexistent_tool(contract):
    with pytest.raises(Exception):
        contract.update_claims("tool-999", "claims", SHA2)


def test_reseal_rejects_nonexistent_tool(contract):
    with pytest.raises(Exception):
        contract.reseal("tool-999")
