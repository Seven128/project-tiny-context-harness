#!/usr/bin/env python3
import re
from typing import Optional

from harness_utils import (
    changed_files,
    contains_any,
    load_lifecycle,
    load_plan,
    repo_path,
    read_text,
    require,
    run_main,
    testing_boundary_errors_for_changed_files,
    validate_plan_contract,
)

TEST_REPORT_PATH = ".work_products/07_test/TEST_REPORT.md"
TEST_CASES_PATH = ".work_products/07_test/TEST_CASES.md"
PLACEHOLDER_TERMS = ["pending", "tbd", "todo", "待填", "待补", "placeholder"]
CASE_ID_RE = re.compile(r"\bTC-\d{3,}\b")
MISSING_READINESS_TERMS = [
    "missing entry",
    "missing exit",
    "missing runnable",
    "missing development evidence",
    "no runnable",
    "no entry",
    "no exit",
    "入口缺失",
    "出口缺失",
    "缺少入口",
    "缺少出口",
    "缺少 development evidence",
    "尚未交付",
    "未交付",
    "不存在",
    "not deployed",
    "not initialized",
    "local only",
    "localhost only",
    "fake adapter",
    "fake send",
    "未部署",
    "未初始化",
    "只在本地",
    "仅本地",
    "本地跑通",
]


def as_list(value) -> list:
    return value if isinstance(value, list) else []


def read_test_report() -> tuple[str, str]:
    require(
        repo_path(TEST_REPORT_PATH).exists(),
        f"Missing test report: expected executed evidence at {TEST_REPORT_PATH}",
    )
    return read_text(TEST_REPORT_PATH), TEST_REPORT_PATH


def test_case_refs(text: str) -> list[str]:
    return sorted(set(CASE_ID_RE.findall(text)))


def plan_references_test_cases(plan: dict) -> bool:
    for task in as_list(plan.get("tasks")):
        if not isinstance(task, dict):
            continue
        if str(task.get("phase") or "") != "TESTING":
            continue
        refs = [str(item) for item in as_list(task.get("result_work_products"))]
        if TEST_CASES_PATH in refs:
            return True
    return False


def split_markdown_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def is_separator_row(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith("|") and set(stripped.replace("|", "").strip()) <= {"-", ":", " "}


def find_table_header(lines: list[str], row_index: int) -> Optional[list[str]]:
    for index in range(row_index - 1, 0, -1):
        if not is_separator_row(lines[index]):
            continue
        header = lines[index - 1]
        if header.strip().startswith("|"):
            return split_markdown_row(header)
    return None


def header_index(headers: list[str], *terms: str) -> Optional[int]:
    lowered = [header.lower() for header in headers]
    for index, header in enumerate(lowered):
        if any(term in header for term in terms):
            return index
    return None


def required_cell(cells: list[str], index: Optional[int]) -> str:
    if index is None or index >= len(cells):
        return ""
    return cells[index].strip()


def validate_test_cases(text: str, report_text: str) -> list[str]:
    errors: list[str] = []
    if contains_any(text, PLACEHOLDER_TERMS):
        errors.append("TEST_CASES.md must not contain pending/TBD/TODO/placeholder content")

    lines = text.splitlines()
    rows: list[tuple[int, list[str], list[str]]] = []
    for index, line in enumerate(lines):
        if not line.strip().startswith("|") or not CASE_ID_RE.search(line):
            continue
        header = find_table_header(lines, index)
        if header is None:
            errors.append("TEST_CASES.md cases must be listed in a Markdown table with headers")
            continue
        rows.append((index + 1, header, split_markdown_row(line)))

    ids = [CASE_ID_RE.search("|".join(cells)).group(0) for _, _, cells in rows if CASE_ID_RE.search("|".join(cells))]
    if not ids:
        errors.append("TEST_CASES.md must include at least one TC-* case")
    duplicates = sorted({case_id for case_id in ids if ids.count(case_id) > 1})
    if duplicates:
        errors.append(f"TEST_CASES.md Case ID must be unique: {', '.join(duplicates)}")

    for line_number, headers, cells in rows:
        requirement = header_index(headers, "requirement", "risk", "需求", "风险")
        runnable_entry = header_index(headers, "runnable entry", "runnable", "entry", "入口")
        steps = header_index(headers, "steps", "步骤")
        expected_exit = header_index(headers, "expected exit", "expected result", "expected", "预期", "出口")
        missing = []
        if not required_cell(cells, requirement):
            missing.append("Requirement / Risk Ref")
        if not required_cell(cells, runnable_entry):
            missing.append("Runnable Entry")
        if not required_cell(cells, steps):
            missing.append("Steps")
        if not required_cell(cells, expected_exit):
            missing.append("Expected Exit")
        if missing:
            errors.append(f"TEST_CASES.md row {line_number} missing required case fields: {', '.join(missing)}")

    refs = test_case_refs(report_text)
    missing_refs = sorted(set(refs) - set(ids))
    if missing_refs:
        errors.append(f"TEST_REPORT.md references case IDs not found in TEST_CASES.md: {', '.join(missing_refs)}")
    return errors


def validate_test_cases_if_needed(plan: dict, report_text: str) -> None:
    cases_path = repo_path(TEST_CASES_PATH)
    should_validate = bool(test_case_refs(report_text)) or plan_references_test_cases(plan) or cases_path.exists()
    if not should_validate:
        return
    require(cases_path.exists(), f"Missing test cases: expected {TEST_CASES_PATH} because TEST_REPORT.md or current TESTING task references test cases")
    for error in validate_test_cases(read_text(TEST_CASES_PATH), report_text):
        require(False, error)


def main() -> None:
    plan = load_plan()
    validate_plan_contract(plan, allow_open=False)
    text, source = read_test_report()
    require(
        not contains_any(text, PLACEHOLDER_TERMS),
        "Test report must contain executed evidence, not pending/TBD/TODO/placeholder content",
    )
    require(contains_any(text, ["matrix", "矩阵"]), "Test report must include a test matrix")
    require(contains_any(text, ["regression", "回归"]), "Test report must include regression evidence")
    require(contains_any(text, ["coverage gap", "覆盖缺口", "gap"]), "Test report must include coverage gaps")
    require(
        contains_any(text, ["entry/exit", "entrypoint", "入口", "出口", "runnable", "可运行"]),
        "Test report must state existing runnable entry/exit coverage or blocker status",
    )
    require(contains_any(text, ["pass", "blocked", "通过", "阻塞"]), "Test report must include PASS/BLOCKED decision")
    if contains_any(text, ["decision\n\npass", "decision: pass", "decision: `pass`", "final decision: pass"]):
        require(
            not contains_any(text, MISSING_READINESS_TERMS),
            "Test report cannot PASS while runnable entry/exit or Development Evidence is missing; use BLOCKED with recovery conditions",
        )
    validate_test_cases_if_needed(plan, text)
    if load_lifecycle().get("current_phase") == "TESTING":
        for error in testing_boundary_errors_for_changed_files(changed_files()):
            require(False, error)
    print(f"Test report OK: {source}")


if __name__ == "__main__":
    run_main(main)
