#!/usr/bin/env python3
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

TEST_REPORT_PATH = ".docs/07_test/TEST_REPORT.md"
LEGACY_TEST_PLAN_PATH = ".docs/07_test/TEST_PLAN.md"


def read_test_report() -> tuple[str, str]:
    if repo_path(TEST_REPORT_PATH).exists():
        return read_text(TEST_REPORT_PATH), TEST_REPORT_PATH
    require(
        repo_path(LEGACY_TEST_PLAN_PATH).exists(),
        f"Missing test report: expected {TEST_REPORT_PATH} or legacy {LEGACY_TEST_PLAN_PATH}",
    )
    return read_text(LEGACY_TEST_PLAN_PATH), LEGACY_TEST_PLAN_PATH


def main() -> None:
    validate_plan_contract(load_plan(), allow_open=False)
    text, source = read_test_report()
    require(contains_any(text, ["matrix", "矩阵"]), "Test report must include a test matrix")
    require(contains_any(text, ["regression", "回归"]), "Test report must include regression evidence")
    require(contains_any(text, ["coverage gap", "覆盖缺口", "gap"]), "Test report must include coverage gaps")
    require(
        contains_any(text, ["entry/exit", "entrypoint", "入口", "出口", "runnable", "可运行"]),
        "Test report must state existing runnable entry/exit coverage or blocker status",
    )
    require(contains_any(text, ["pass", "blocked", "通过", "阻塞"]), "Test report must include PASS/BLOCKED decision")
    if load_lifecycle().get("current_phase") == "TESTING":
        for error in testing_boundary_errors_for_changed_files(changed_files()):
            require(False, error)
    print(f"Test report OK: {source}")


if __name__ == "__main__":
    run_main(main)
