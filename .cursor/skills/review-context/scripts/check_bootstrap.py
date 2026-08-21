#!/usr/bin/env python3
"""Check whether repository-level review-context integration is complete."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


START_MARKER = "<!-- review-context:bootstrap:start -->"
END_MARKER = "<!-- review-context:bootstrap:end -->"
AGENTS_REQUIREMENTS = (
    "实现前先契约",
    "Read `.cursor/skills/review-context/SKILL.md`",
    "实现后自动审查",
    "acceptance_criteria",
    "pre-commit",
    "P0/P1",
)


def inspect_agents(path: Path) -> dict[str, object]:
    if not path.is_file():
        return {"state": "needs-bootstrap", "reason": "AGENTS.md is missing"}

    content = path.read_text(encoding="utf-8")
    start_count = content.count(START_MARKER)
    end_count = content.count(END_MARKER)
    if start_count != end_count or start_count > 1:
        return {
            "state": "conflict",
            "reason": "bootstrap markers are incomplete or duplicated",
        }

    has_requirements = all(item in content for item in AGENTS_REQUIREMENTS)
    if start_count == 1 and not has_requirements:
        return {
            "state": "conflict",
            "reason": "managed block exists but is incomplete",
        }
    if has_requirements:
        return {"state": "ready", "reason": "review gates are present"}

    if "review-context" in content:
        return {
            "state": "conflict",
            "reason": "partial review-context integration exists",
        }
    return {
        "state": "needs-bootstrap",
        "reason": "review-continuity gates are absent",
    }


def inspect_claude(path: Path) -> dict[str, object]:
    if not path.is_file():
        return {"state": "needs-bootstrap", "reason": "CLAUDE.md is missing"}

    content = path.read_text(encoding="utf-8")
    if re.search(r"(?m)^\s*@AGENTS\.md\s*$", content):
        return {"state": "ready", "reason": "AGENTS.md import is present"}
    return {
        "state": "needs-bootstrap",
        "reason": "standalone @AGENTS.md import is absent",
    }


def check_bootstrap(repo_root: Path) -> dict[str, object]:
    agents = inspect_agents(repo_root / "AGENTS.md")
    claude = inspect_claude(repo_root / "CLAUDE.md")
    states = {agents["state"], claude["state"]}
    status = "conflict" if "conflict" in states else (
        "ready"
        if states == {"ready"}
        else "needs-bootstrap"
    )
    return {
        "status": status,
        "AGENTS.md": agents,
        "CLAUDE.md": claude,
    }


def main() -> int:
    repo_root = (
        Path(sys.argv[1]).resolve()
        if len(sys.argv) > 1 and sys.argv[1] != "--json"
        else Path(__file__).resolve().parents[4]
    )
    output_json = "--json" in sys.argv[1:]
    result = check_bootstrap(repo_root)
    if output_json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"status: {result['status']}")
        for filename in ("AGENTS.md", "CLAUDE.md"):
            detail = result[filename]
            print(f"{filename}: {detail['state']} — {detail['reason']}")
    return 0 if result["status"] == "ready" else 1


if __name__ == "__main__":
    raise SystemExit(main())
