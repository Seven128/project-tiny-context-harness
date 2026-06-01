#!/usr/bin/env python3
import re
from harness_utils import (
    combined_text,
    contains_any,
    load_lifecycle,
    load_plan,
    markdown_deliverables,
    repo_path,
    run_main,
    require,
    validate_plan_contract,
    validate_task_shape,
)

CROSS_CUTTING_CATEGORIES = [
    {
        "name": "ai",
        "label": "AI copilot/provider",
        "trigger_terms": ["ai provider", "ai output", "aioutput", "llm", "copilot", "副驾驶"],
        "architecture_terms": ["ai provider", "ai output", "llm", "copilot", "副驾驶", "模型", "智能", "prompt"],
    },
    {
        "name": "external",
        "label": "external system boundary",
        "trigger_terms": ["external system", "external integration", "webhook", "外部系统", "第三方", "微信", "工商", "税务", "社保", "公积金", "金蝶", "对象存储"],
        "architecture_terms": ["external system", "external integration", "webhook", "adapter", "适配", "边界", "外部系统", "第三方", "微信", "工商", "税务", "社保", "公积金", "金蝶", "对象存储"],
    },
    {
        "name": "compliance",
        "label": "compliance/permission/audit",
        "trigger_terms": ["compliance", "authorization", "audit log", "audit trail", "合规", "授权", "客户确认", "回执归档", "权限模型", "权限控制", "权限架构", "审计架构", "审计日志"],
        "architecture_terms": ["compliance", "permission", "authorization", "audit", "合规", "权限", "审计", "授权", "客户确认", "回执归档"],
    },
]
UI_DRAFT_TASK_TERMS = [
    "frontend",
    "front-end",
    "browser",
    "page",
    "screen",
    "route",
    "component",
    "visual_ui",
    "design.md",
    ".work_products/02_experience/",
    "页面",
    "前端",
    "屏幕",
    "交互",
    "组件",
    "视觉",
]


def main() -> None:
    lifecycle = load_lifecycle()
    plan = load_plan()
    validate_plan_contract(plan, allow_open=lifecycle.get("current_phase") != "ARCHITECTING")

    architecture_docs = markdown_deliverables(".work_products/02_architecture")
    tech_plan_docs = markdown_deliverables(".work_products/03_tech_plan")
    product_docs = markdown_deliverables(".work_products/01_product")
    experience_docs = markdown_deliverables(".work_products/02_experience")
    require(architecture_docs, "No architecture deliverables found in .work_products/02_architecture/")
    require(tech_plan_docs, "No technical plan deliverables found in .work_products/03_tech_plan/")

    text = combined_text(architecture_docs + tech_plan_docs)
    require(contains_any(text, ["prd", "requirement", "需求"]), "Design must cite product requirements")
    require(contains_any(text, ["api", "interface", "接口", "contract", "契约"]), "Design must describe interfaces or contracts")
    require(contains_any(text, ["task", "任务", "breakdown"]), "Design must include task breakdown")
    draft_tasks = validate_draft_task_tech_plan_refs(tech_plan_docs, experience_docs)
    validate_cross_cutting_architecture(product_docs, tech_plan_docs, architecture_docs, draft_tasks)
    print(f"Design artifacts OK: {len(architecture_docs)} architecture, {len(tech_plan_docs)} tech plan")


def validate_draft_task_tech_plan_refs(tech_plan_docs: list, experience_docs: list) -> list[dict]:
    draft = load_plan("<harnessRoot>/state/plan.draft.yaml")
    require("current_phase" not in draft, "plan.draft.yaml must not define current_phase; lifecycle.yaml is the single source for current_phase")
    require("current_task_id" not in draft, "plan.draft.yaml must not define current_task_id because drafts are not active task state")
    tasks = draft.get("tasks", [])
    require(tasks, "plan.draft.yaml must contain at least one task before leaving ARCHITECTING")

    available_tech_plans = {repo_relative(path) for path in tech_plan_docs}
    available_experience_docs = {repo_relative(path) for path in experience_docs}
    development_tasks: list[dict] = []
    primary_refs: list[str] = []
    for index, task in enumerate(tasks):
        require(isinstance(task, dict), f"Task draft #{index + 1} must be a mapping")
        validate_task_shape(task, index)
        require(task.get("status") == "pending", f"Draft task {task.get('id')} should start as pending")
        if not is_development_draft(task):
            continue
        development_tasks.append(task)
        work_products = task.get("work_products")
        require(isinstance(work_products, dict), f"Draft task {task.get('id')} work_products must be a mapping")
        tech_refs = as_list(work_products.get("tech_plan"))
        require(tech_refs, f"Draft task {task.get('id')} must reference at least one tech plan slice in work_products.tech_plan")
        normalized_refs = [normalize_doc_ref(ref) for ref in tech_refs]
        for ref in normalized_refs:
            require(ref.startswith(".work_products/03_tech_plan/"), f"Draft task {task.get('id')} work_products.tech_plan must point into .work_products/03_tech_plan/: {ref}")
            require(ref in available_tech_plans, f"Draft task {task.get('id')} references missing or generated tech plan slice: {ref}")
        validate_uiux_design_refs_for_draft_task(task, available_experience_docs)
        validate_self_test_contract_tech_plan_binding(task, normalized_refs)
        primary_refs.append(normalized_refs[0])

    require(development_tasks, "plan.draft.yaml must contain at least one development task with implementation_work_product")
    if len(development_tasks) > 1:
        require(
            len(set(primary_refs)) == len(primary_refs),
            "Draft development tasks must reference distinct primary tech plan slices in work_products.tech_plan",
        )
    return tasks


def validate_uiux_design_refs_for_draft_task(task: dict, available_experience_docs: set[str]) -> None:
    work_products = task.get("work_products")
    if not isinstance(work_products, dict):
        return
    task_id = task.get("id")
    uiux_refs = [normalize_doc_ref(ref) for ref in as_list(work_products.get("uiux"))]
    design_refs = [normalize_doc_ref(ref) for ref in as_list(work_products.get("design_system"))]
    ui_task = is_ui_draft_task(task)

    if ui_task:
        require(uiux_refs, f"UI/frontend draft task {task_id} must reference a UI/UX slice in work_products.uiux")
        require(design_refs, f"UI/frontend draft task {task_id} must reference DESIGN.md in work_products.design_system")

    for ref in uiux_refs:
        require(ref.startswith(".work_products/02_experience/"), f"Draft task {task_id} work_products.uiux must point into .work_products/02_experience/: {ref}")
        require(ref in available_experience_docs, f"Draft task {task_id} references missing or generated UI/UX slice: {ref}")

    for ref in design_refs:
        require(ref == "DESIGN.md", f"Draft task {task_id} work_products.design_system must point to DESIGN.md: {ref}")
        require(repo_path("DESIGN.md").exists(), f"Draft task {task_id} references missing design system: DESIGN.md")


def is_ui_draft_task(task: dict) -> bool:
    work_products = task.get("work_products")
    docs_text = ""
    if isinstance(work_products, dict):
        docs_text = "\n".join(ref for value in work_products.values() for ref in as_list(value))
    runtime_text = "\n".join(str(task.get(key) or "") for key in ["target_runtime_environment", "self_test_contract"])
    text = "\n".join(str(task.get(key) or "") for key in ["id", "title", "summary", "phase"]) + "\n" + docs_text + "\n" + runtime_text
    return contains_any(text, UI_DRAFT_TASK_TERMS)


def validate_cross_cutting_architecture(product_docs: list, tech_plan_docs: list, architecture_docs: list, draft_tasks: list[dict]) -> None:
    source_text = "\n".join(
        [
            combined_text(product_docs),
            combined_text(tech_plan_docs),
            "\n".join(task_text(task) for task in draft_tasks),
        ]
    )
    triggered = [category for category in CROSS_CUTTING_CATEGORIES if contains_any(source_text, category["trigger_terms"])]
    assigned_docs: set[str] = set()
    for category in triggered:
        matches = [
            doc
            for doc in architecture_docs
            if repo_relative(doc) not in assigned_docs and contains_any(doc.read_text(encoding="utf-8"), category["architecture_terms"])
        ]
        require(matches, f"Design requires a dedicated {category['label']} architecture slice")
        assigned_docs.add(repo_relative(matches[0]))


def validate_self_test_contract_tech_plan_binding(task: dict, normalized_tech_refs: list[str]) -> None:
    contract = task.get("self_test_contract")
    if not isinstance(contract, dict) or contract.get("status") != "required":
        return
    source = normalize_doc_ref(str(contract.get("source") or ""))
    task_id = task.get("id")
    require(source in normalized_tech_refs, f"Draft task {task_id} self_test_contract.source must be listed in work_products.tech_plan: {source}")
    source_path = repo_path(source)
    if not source_path.exists():
        return
    text = source_path.read_text(encoding="utf-8")
    section = markdown_section(text, ["development self-test contract", "开发自测合同"])
    require(section, f"Draft task {task_id} self_test_contract.source must contain a Development Self-Test Contract section: {source}")
    require(
        contains_any(section, ["module key test path", "模块关键测试路径"]),
        f"Draft task {task_id} tech plan Development Self-Test Contract must include Module key test path: {source}",
    )
    if contract.get("graph_required") is True:
        require(
            contains_any(section, ["module key test graph", "module_key_test_graph", "模块关键测试图"]),
            f"Draft task {task_id} tech plan Development Self-Test Contract must include Module Key Test Graph when graph_required is true: {source}",
        )
    for scenario in contract.get("scenarios") or []:
        if not isinstance(scenario, dict):
            continue
        scenario_id = str(scenario.get("id") or "").strip()
        if scenario_id:
            require(scenario_id in section, f"Draft task {task_id} tech plan Development Self-Test Contract must include scenario {scenario_id}: {source}")


def markdown_section(text: str, header_terms: list[str]) -> str:
    lines = text.splitlines()
    start = -1
    level = 0
    for index, line in enumerate(lines):
        match = re.match(r"^(#{1,6})\s+(.+)$", line)
        if not match:
            continue
        title = match.group(2).lower()
        if any(term.lower() in title for term in header_terms):
            start = index
            level = len(match.group(1))
            break
    if start == -1:
        return ""
    end = len(lines)
    for index in range(start + 1, len(lines)):
        match = re.match(r"^(#{1,6})\s+", lines[index])
        if match and len(match.group(1)) <= level:
            end = index
            break
    return "\n".join(lines[start:end])


def is_development_draft(task: dict) -> bool:
    task_id = str(task.get("id") or "")
    return bool(task.get("implementation_work_product")) or task.get("phase") == "SPRINTING" or task_id.startswith("DEV-")


def as_list(value) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def normalize_doc_ref(value: str) -> str:
    ref = value.replace("\\", "/")
    return ref[2:] if ref.startswith("./") else ref


def repo_relative(path) -> str:
    return path.resolve().relative_to(repo_path(".").resolve()).as_posix()


def task_text(task: dict) -> str:
    parts = []
    for key in ["id", "title", "summary", "phase"]:
        if task.get(key):
            parts.append(str(task[key]))
    work_products = task.get("work_products")
    if isinstance(work_products, dict):
        for value in work_products.values():
            parts.extend(as_list(value))
    return "\n".join(parts)


if __name__ == "__main__":
    run_main(main)
