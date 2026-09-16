"""E2E direct-mode tests: register -> seal happy path, with Stage A (web
fetch) and Stage B (LLM judgment) both mocked via gltest's direct-mode
cheatcodes (vm.mock_web / vm.mock_llm), mirroring the pattern used in
this account's AgentIntentSettlement/VisionaryWebAuditor tests.
"""

import json
import re

import pytest

CONTRACT_PATH = "contracts/ToolBind.py"

REPO = "https://github.com/acme/mcp-tool"
SHA = "abc1234"


def re_escape(url: str) -> str:
    return re.escape(url)


def _mock_bind_ok(direct_vm, repo=REPO, sha=SHA, endpoint=""):
    commit_url = f"{repo.rstrip('/')}/commit/{sha}"
    readme_url = f"{repo.rstrip('/')}/raw/{sha}/README.md"
    direct_vm.mock_web(
        re_escape(commit_url),
        {"body": f"Commit {sha[:7]} acme/mcp-tool - GitHub"},
    )
    direct_vm.mock_web(
        re_escape(readme_url),
        {"body": "# mcp-tool\nA safe MCP tool with scoped permissions."},
    )
    if endpoint:
        direct_vm.mock_web(re_escape(endpoint), {"body": "ok"})


SEALED_VERDICT = {
    "approved": True,
    "verdict": "SEALED",
    "confidence": "0.90",
    "risk": "low",
    "reason": "Evidence supports the claims under the general policy.",
}


@pytest.fixture
def contract(direct_deploy):
    return direct_deploy(CONTRACT_PATH)


def test_register_tool_happy_path(contract, direct_vm):
    tool_id = contract.register_tool(REPO, SHA, "reads files safely", "", "general")
    assert tool_id == "tool-0"
    record = json.loads(contract.get_tool(tool_id))
    assert record["repo"] == REPO
    assert record["sha"] == SHA
    assert record["policy"] == "general"
    assert record["owner"].lower() == str(direct_vm.sender).lower()


def test_register_tool_rejects_non_github_repo(contract):
    with pytest.raises(Exception):
        contract.register_tool("https://gitlab.com/acme/tool", SHA, "claims", "", "general")


def test_register_tool_rejects_bad_sha(contract):
    with pytest.raises(Exception):
        contract.register_tool(REPO, "not-a-sha!!", "claims", "", "general")


def test_register_tool_rejects_bad_policy(contract):
    with pytest.raises(Exception):
        contract.register_tool(REPO, SHA, "claims", "", "not-a-policy")


def test_seal_happy_path_sealed(contract, direct_vm):
    tool_id = contract.register_tool(REPO, SHA, "reads files safely", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", json.dumps(SEALED_VERDICT))

    seal_id = contract.seal(tool_id)
    assert seal_id == "seal-0"

    seal_record = json.loads(contract.get_seal(seal_id))
    assert seal_record["tool_id"] == tool_id
    assert seal_record["verdict"] == "SEALED"
    assert seal_record["approved"] is True
    assert seal_record["status"] == "ACTIVE"
    assert seal_record["confidence"] == "0.90"

    latest = json.loads(contract.get_latest_seal(tool_id))
    assert latest["seal_id"] == seal_id

    ids = json.loads(contract.list_seals(tool_id))
    assert ids == [seal_id]


def test_seal_with_endpoint(contract, direct_vm):
    endpoint = "https://api.acme.dev/mcp/health"
    tool_id = contract.register_tool(REPO, SHA, "healthy endpoint", endpoint, "general")
    _mock_bind_ok(direct_vm, endpoint=endpoint)
    direct_vm.mock_llm(".*", json.dumps(SEALED_VERDICT))

    seal_id = contract.seal(tool_id)
    seal_record = json.loads(contract.get_seal(seal_id))
    assert seal_record["verdict"] == "SEALED"


def test_second_seal_supersedes_first(contract, direct_vm):
    tool_id = contract.register_tool(REPO, SHA, "claims", "", "general")
    _mock_bind_ok(direct_vm)
    direct_vm.mock_llm(".*", json.dumps(SEALED_VERDICT))

    first_id = contract.seal(tool_id)
    second_id = contract.seal(tool_id)

    first = json.loads(contract.get_seal(first_id))
    second = json.loads(contract.get_seal(second_id))
    assert first["status"] == "SUPERSEDED"
    assert second["status"] == "ACTIVE"

    ids = json.loads(contract.list_seals(tool_id))
    assert ids == [first_id, second_id]


def test_seal_nonexistent_tool_reverts(contract):
    with pytest.raises(Exception):
        contract.seal("tool-999")
