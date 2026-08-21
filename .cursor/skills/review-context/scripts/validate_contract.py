#!/usr/bin/env python3
"""Validate the repository task-contract shape without third-party packages."""

from __future__ import annotations

import re
import sys
from pathlib import Path


REQUIRED_FRONTMATTER_KEYS = {
    "task_id",
    "title",
    "status",
    "source",
    "branch",
    "pull_request",
    "requirements",
    "acceptance_criteria",
    "decisions",
    "review_state",
    "open_questions",
    "updated_at",
}
ALLOWED_STATUSES = {
    "pending-confirmation",
    "planned",
    "in-progress",
    "blocked",
    "verification",
    "pre-commit",
    "handoff",
    "closed",
}
TASK_ID_PATTERN = re.compile(r"^\d{8}-[a-z0-9]+(?:-[a-z0-9]+)*$")


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def extract_frontmatter(content: str) -> tuple[str | None, str, list[str]]:
    errors: list[str] = []
    if not content.startswith("---\n"):
        return None, content, ["frontmatter must start with '---'"]

    end = content.find("\n---\n", 4)
    if end == -1:
        return None, content, ["frontmatter must end with '---'"]

    frontmatter = content[4:end]
    body = content[end + 5 :]
    return frontmatter, body, errors


def top_level_keys(frontmatter: str) -> set[str]:
    return {
        match.group(1)
        for match in re.finditer(r"^([A-Za-z][A-Za-z0-9_-]*):(?:\s|$)", frontmatter, re.MULTILINE)
    }


def scalar_value(frontmatter: str, key: str) -> str | None:
    match = re.search(
        rf"^{re.escape(key)}:\s*(.+)$", frontmatter, re.MULTILINE
    )
    return match.group(1).strip().strip("'\"") if match else None


def validate_contract(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        content = path.read_text(encoding="utf-8")
    except OSError as error:
        return [f"cannot read contract: {error}"]

    frontmatter, body, parse_errors = extract_frontmatter(content)
    errors.extend(parse_errors)
    if frontmatter is None:
        return errors

    missing_keys = REQUIRED_FRONTMATTER_KEYS - top_level_keys(frontmatter)
    if missing_keys:
        fail(errors, f"missing frontmatter keys: {', '.join(sorted(missing_keys))}")

    task_id = scalar_value(frontmatter, "task_id")
    status = scalar_value(frontmatter, "status")
    title = scalar_value(frontmatter, "title")
    updated_at = scalar_value(frontmatter, "updated_at")

    is_template = path.name == "TEMPLATE.md"
    if not is_template:
        if task_id is None or not TASK_ID_PATTERN.fullmatch(task_id):
            fail(errors, "task_id must match YYYYMMDD-lowercase-semantic-slug")
        elif task_id != path.stem:
            fail(errors, f"task_id '{task_id}' must match filename '{path.stem}'")

    if status not in ALLOWED_STATUSES:
        fail(errors, f"status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}")
    if not is_template and (not title or title.lower().startswith("replace with")):
        fail(errors, "title must be a real task title")
    if not updated_at or not re.search(r"\d{4}-\d{2}-\d{2}T", updated_at):
        fail(errors, "updated_at must be an ISO-8601 timestamp")

    for key in ("phase", "risk", "overall_conclusion", "change_snapshot_hash", "unresolved_items"):
        if not re.search(rf"^\s+{re.escape(key)}:", frontmatter, re.MULTILINE):
            fail(errors, f"review_state must define '{key}'")

    required_headings = (
        "## Latest Snapshot",
        "### Requirements",
        "### Acceptance Criteria",
        "### Decisions",
        "## Scope",
        "#### In scope",
        "#### Out of scope",
        "### Review State",
        "### Open Questions",
        "## Event History",
    )
    for heading in required_headings:
        if heading not in body:
            fail(errors, f"missing body heading: {heading}")

    if "### " not in body.split("## Event History", 1)[-1]:
        fail(errors, "Event History must contain at least one timestamped event")

    return errors


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate_contract.py <contract-path>", file=sys.stderr)
        return 2

    path = Path(sys.argv[1])
    errors = validate_contract(path)
    if errors:
        print(f"INVALID {path}")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"VALID {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
