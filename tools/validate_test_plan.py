#!/usr/bin/env python3
from harness_utils import (
    changed_files,
    contains_any,
    load_lifecycle,
    load_plan,
    read_text,
    require,
    run_main,
    testing_boundary_errors_for_changed_files,
    validate_plan_contract,
)


def main() -> None:
    validate_plan_contract(load_plan(), allow_open=False)
    text = read_text(".docs/07_test/TEST_PLAN.md")
    require(contains_any(text, ["matrix", "矩阵"]), "Test plan must include a test matrix")
    require(contains_any(text, ["regression", "回归"]), "Test plan must include regression coverage")
    require(contains_any(text, ["coverage gap", "覆盖缺口", "gap"]), "Test plan must include coverage gaps")
    require(
        contains_any(text, ["entry/exit", "entrypoint", "入口", "出口", "runnable", "可运行"]),
        "Test plan must state existing runnable entry/exit coverage or blocker status",
    )
    require(contains_any(text, ["pass", "blocked", "通过", "阻塞"]), "Test plan must include PASS/BLOCKED decision")
    if load_lifecycle().get("current_phase") == "TESTING":
        for error in testing_boundary_errors_for_changed_files(changed_files()):
            require(False, error)
    print("Test plan OK")


if __name__ == "__main__":
    run_main(main)
