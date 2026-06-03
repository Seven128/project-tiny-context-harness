#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path.cwd()

CHECKS = {
    "project_context/global.md": [
        ("project goal", ["project goal", "项目目标", "目标"]),
        ("boundaries", ["non-goals", "boundaries", "非目标", "边界"]),
        ("design rationale", ["design rationale", "设计思路", "设计原因"]),
        ("verification entry points", ["verification entry", "验证入口", "测试入口"]),
        ("current state", ["current state", "当前状态"]),
        ("next safe action", ["next safe action", "下一步安全动作"]),
        ("module index", ["module index", "模块索引"]),
    ]
}

MODULE_CHECKS = [
    ("responsibility", ["responsibility", "模块职责", "职责"]),
    ("code entry points", ["code entry", "代码入口"]),
    ("test entry points", ["test entry", "测试入口"]),
    ("key constraints", ["key constraints", "关键约束", "约束"]),
]


def has_any(text, terms):
    lower = text.lower()
    return any(term.lower() in lower for term in terms)


def main():
    errors = []
    global_path = ROOT / "project_context/global.md"
    if not global_path.exists():
        errors.append("missing project_context/global.md")
    else:
        text = global_path.read_text(encoding="utf-8")
        for label, terms in CHECKS["project_context/global.md"]:
            if not has_any(text, terms):
                errors.append(f"project_context/global.md must include {label}")

    modules = sorted((ROOT / "project_context/modules").glob("*.md"))
    if not modules:
        errors.append("No module context files found in project_context/modules/")
    for module in modules:
        text = module.read_text(encoding="utf-8")
        rel = module.relative_to(ROOT).as_posix()
        for label, terms in MODULE_CHECKS:
            if not has_any(text, terms):
                errors.append(f"{rel} must include {label}")

    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1
    print(f"Context OK: {1 + len(modules)} context file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
