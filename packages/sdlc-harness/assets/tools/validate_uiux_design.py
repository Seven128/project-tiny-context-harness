#!/usr/bin/env python3
import json
import subprocess

from harness_utils import (
    contains_any,
    load_lifecycle,
    load_plan,
    markdown_deliverables,
    repo_path,
    run_main,
    require,
    validate_plan_contract,
)


DESIGN_MD = "DESIGN.md"


def main() -> None:
    lifecycle = load_lifecycle()
    plan = load_plan()
    validate_plan_contract(plan, allow_open=lifecycle.get("current_phase") != "UI_UX_DESIGNING")

    docs = markdown_deliverables(".docs/02_experience")
    require(docs, "No UI/UX deliverables found in .docs/02_experience/")
    visual_ui = False
    for doc in docs:
        text = doc.read_text(encoding="utf-8")
        relative = doc.relative_to(repo_path(".")).as_posix()
        not_applicable = contains_any(text, ["applicability: not_applicable", "applicability: `not_applicable`"])
        visual_ui = visual_ui or contains_any(text, ["applicability: visual_ui", "applicability: `visual_ui`"])
        if not_applicable:
            continue
        require(contains_any(text, ["prd", "requirement", "需求"]), f"{relative} must cite PRD and requirement IDs")
        require(contains_any(text, ["user journey", "user journeys", "用户旅程"]), f"{relative} must include user journeys")
        require(contains_any(text, ["handoff matrix", "交接矩阵"]), f"{relative} must include a handoff matrix")
        require(
            contains_any(text, ["loading", "empty", "error", "success", "permission", "加载", "空状态", "错误", "成功", "权限"]),
            f"{relative} screen contracts must cover applicable loading/empty/error/success/permission states",
        )
        require(contains_any(text, ["responsive", "breakpoint", "响应式", "断点"]), f"{relative} must include responsive acceptance")
        require(
            contains_any(text, ["accessibility", "a11y", "focus", "keyboard", "touch", "无障碍", "焦点", "键盘", "触控"]),
            f"{relative} must include accessibility/focus/keyboard/touch expectations",
        )

    if visual_ui:
        design_path = repo_path(DESIGN_MD)
        require(design_path.exists(), "visual UI experience requires root DESIGN.md")
        validate_design_md()

    print(f"UI/UX artifacts OK: {len(docs)} experience deliverable(s)")


def validate_design_md() -> None:
    command = designmd_command()
    try:
        proc = subprocess.run(
            command + ["lint", DESIGN_MD],
            cwd=repo_path("."),
            text=True,
            capture_output=True,
            check=False,
        )
    except FileNotFoundError:
        require(False, "DESIGN.md linter not found; install @google/design.md or run npm install")
        return

    output = (proc.stdout or "").strip()
    diagnostics = None
    if output:
        try:
            diagnostics = json.loads(output)
        except json.JSONDecodeError:
            diagnostics = None

    errors = []
    if isinstance(diagnostics, dict):
        summary = diagnostics.get("summary") if isinstance(diagnostics.get("summary"), dict) else {}
        if int(summary.get("errors") or 0) > 0:
            errors.append("DESIGN.md linter reported errors")
        for finding in diagnostics.get("findings") or []:
            if isinstance(finding, dict) and str(finding.get("severity") or "").lower() == "error":
                errors.append(str(finding.get("message") or "DESIGN.md linter error"))
    elif proc.returncode != 0:
        errors.append((proc.stderr or proc.stdout or "DESIGN.md linter failed").strip())

    if errors:
        require(False, "; ".join(errors))


def designmd_command() -> list[str]:
    local_bin = repo_path("node_modules/.bin/designmd")
    if local_bin.exists():
        return [str(local_bin)]
    return ["npx", "--no-install", "designmd"]


if __name__ == "__main__":
    run_main(main)
