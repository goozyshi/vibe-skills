#!/usr/bin/env python3
"""Validate the review-context skill and its evaluation scenarios."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


REQUIRED_ROUTES = {"setup", "start", "sync", "check", "review", "handoff"}
REQUIRED_EVAL_IDS = {
    "implementation-entry",
    "high-risk-implementation",
    "low-risk-filter",
    "pre-commit-review",
    "cross-session-recovery",
    "requirement-change",
    "review-persistence",
    "p0-p1-block",
    "identity-conflict",
    "bootstrap-missing",
    "bootstrap-idempotent",
    "bootstrap-conflict",
    "language-following",
}


def validate(skill_root: Path) -> list[str]:
    errors: list[str] = []
    skill_path = skill_root / "SKILL.md"
    evals_path = skill_root / "evals" / "evals.json"

    if not skill_path.is_file():
        return [f"missing {skill_path}"]
    for required_path in (
        evals_path,
        skill_root / "scripts" / "validate_contract.py",
        skill_root / "scripts" / "check_bootstrap.py",
        skill_root / "scripts" / "validate_skill.py",
        skill_root.parent / "code-reviewer" / "SKILL.md",
    ):
        if not required_path.is_file():
            errors.append(f"missing {required_path}")

    content = skill_path.read_text(encoding="utf-8")
    if len(content.splitlines()) >= 500:
        errors.append("SKILL.md must remain under 500 lines")
    if not content.startswith("---\n") or "\n---\n" not in content[4:]:
        errors.append("SKILL.md must have YAML frontmatter")
    else:
        frontmatter = content[4 : content.find("\n---\n", 4)]
        name = re.search(r"^name:\s*(\S+)$", frontmatter, re.MULTILINE)
        description = re.search(r"^description:\s*(.+)$", frontmatter, re.MULTILINE)
        if not name or name.group(1) != "review-context":
            errors.append("frontmatter name must be review-context")
        if not description or len(description.group(1).strip()) < 30:
            errors.append("frontmatter description must be specific")

    missing_routes = {
        route for route in REQUIRED_ROUTES if f"`{route}`" not in content
    }
    if missing_routes:
        errors.append(f"missing routes: {', '.join(sorted(missing_routes))}")

    for required_text in (
        "## Entry gate",
        "Read this skill file",
        "Name the contract path",
        "task_id + phase + change_snapshot_hash",
        "P0 or P1 findings block handoff",
        "docs/agents/tasks/<task-id>.md",
        "../code-reviewer/SKILL.md",
        "setup --apply-bootstrap",
        "references/bootstrap.md",
    ):
        if required_text not in content:
            errors.append(f"missing required contract: {required_text}")

    if evals_path.is_file():
        try:
            evals = json.loads(evals_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            errors.append(f"evals.json is not valid JSON: {error}")
        else:
            if evals.get("skill_name") != "review-context":
                errors.append("evals.json skill_name must be review-context")
            actual_ids = {item.get("id") for item in evals.get("evals", [])}
            missing_ids = REQUIRED_EVAL_IDS - actual_ids
            if missing_ids:
                errors.append(f"missing eval scenarios: {', '.join(sorted(missing_ids))}")
            if len(actual_ids) != len(evals.get("evals", [])):
                errors.append("eval scenario IDs must be unique")
            for item in evals.get("evals", []):
                if not item.get("prompt") or not item.get("expected_output"):
                    errors.append(f"eval {item.get('id')} needs prompt and expected_output")

    return errors


def main() -> int:
    skill_root = Path(sys.argv[1]) if len(sys.argv) == 2 else Path(__file__).resolve().parents[1]
    errors = validate(skill_root)
    if errors:
        print(f"INVALID {skill_root}")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"VALID {skill_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
