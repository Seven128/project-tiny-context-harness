#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path.cwd()

GLOBAL_CHECKS = [
    ("project goal", ["project goal", "项目目标", "目标"]),
    ("boundaries", ["non-goals", "boundaries", "非目标", "边界"]),
    ("design rationale", ["design rationale", "设计思路", "设计原因"]),
    ("architecture context", ["architecture context", "架构上下文", "architecture.md"]),
    ("verification entry points", ["verification entry", "验证入口", "测试入口"]),
    ("current state", ["current state", "当前状态"]),
    ("next safe action", ["next safe action", "下一步安全动作"]),
    ("context index", ["context index", "module index", "上下文索引", "模块索引"]),
]

ARCHITECTURE_CHECKS = [
    ("system boundary", ["system boundary", "系统边界", "边界"]),
    ("component map", ["component map", "组件", "模块关系"]),
    ("data or control flow", ["data / control flow", "data flow", "control flow", "数据流", "控制流"]),
    ("design rationale", ["design rationale", "设计思路", "设计原因"]),
    ("verification implications", ["verification implications", "验证影响", "验证入口"]),
]

VALID_ROLES = {
    "global",
    "architecture",
    "area",
    "domain",
    "subdomain",
    "foundation",
    "archive",
    "contract",
    "verification",
    "deployment",
    "implementation-index",
    "decision-rationale",
}

ROLE_ALIASES = {
    "implementation_index": "implementation-index",
    "decision_rationale": "decision-rationale",
}

READ_POLICIES = {"default", "always", "optional", "on-demand", "never-default"}
CONFIG_CANDIDATES = [
    ".agent/config.yaml",
    ".codex/config.yaml",
    ".harness/config.yaml",
    ".claude/config.yaml",
    ".cursor/config.yaml",
    ".cline/config.yaml",
    ".roo/config.yaml",
    ".gemini/config.yaml",
]


def has_any(text, terms):
    lower = text.lower()
    return any(term.lower() in lower for term in terms)


def normalize_role(value):
    role = ROLE_ALIASES.get(value.strip().lower(), value.strip().lower())
    return role if role in VALID_ROLES else None


def parse_front_matter(text):
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    result = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return result
        match = re.match(r"^([A-Za-z0-9_-]+):\s*(.+?)\s*$", line.strip())
        if match:
            result[match.group(1)] = match.group(2).strip().strip("\"'")
    return result


def strip_comment(line):
    quote = None
    for index, char in enumerate(line):
        if char in {"'", "\""} and (index == 0 or line[index - 1] != "\\"):
            quote = None if quote == char else quote or char
        if char == "#" and quote is None:
            return line[:index]
    return line


def parse_toml_value(raw):
    value = raw.strip()
    if value == "true":
        return True
    if value == "false":
        return False
    if (value.startswith("\"") and value.endswith("\"")) or (value.startswith("'") and value.endswith("'")):
        return value[1:-1]
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        items = []
        for part in inner.split(","):
            item = part.strip()
            if not ((item.startswith("\"") and item.endswith("\"")) or (item.startswith("'") and item.endswith("'"))):
                return None
            items.append(item[1:-1])
        return items
    return None


def parse_manifest(path, errors):
    manifest = {"areas": [], "context": []}
    current = None
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = strip_comment(raw).strip()
        if not line:
            continue
        match = re.match(r"^\[\[(areas|context)\]\]$", line)
        if match:
            current = {"line": line_number}
            manifest[match.group(1)].append(current)
            continue
        if current is None:
            errors.append(f"project_context/context.toml line {line_number} must appear inside [[areas]] or [[context]]")
            continue
        assignment = re.match(r"^([A-Za-z0-9_-]+)\s*=\s*(.+)$", line)
        if not assignment:
            errors.append(f"project_context/context.toml line {line_number} is not a supported assignment")
            continue
        value = parse_toml_value(assignment.group(2))
        if value is None:
            errors.append(f"project_context/context.toml line {line_number} has an unsupported value")
            continue
        current[assignment.group(1)] = value
    return manifest


def normalize_context_path(value):
    return value.replace("\\", "/").removeprefix("./")


def add_manifest_role(entry, role, roles, errors):
    raw_path = entry.get("context") or entry.get("path")
    if not isinstance(raw_path, str):
        errors.append(f"project_context/context.toml line {entry['line']} must include a context/path string")
        return
    rel = normalize_context_path(raw_path)
    if not rel.startswith("project_context/") or not rel.endswith(".md"):
        errors.append(f"project_context/context.toml line {entry['line']} must reference a markdown file under project_context/")
        return
    existing = roles.get(rel)
    if existing and existing != role:
        errors.append(f"project_context/context.toml assigns conflicting roles to {rel}: {existing} and {role}")
        return
    roles[rel] = role
    if not (ROOT / rel).exists():
        errors.append(f"project_context/context.toml references missing context file: {rel}")


def validate_manifest(errors):
    manifest_path = ROOT / "project_context/context.toml"
    roles = {}
    if not manifest_path.exists():
        if schema_requires_manifest():
            errors.append("missing project_context/context.toml; run ty-context upgrade to create the Schema v4 Context graph manifest")
        return roles
    manifest = parse_manifest(manifest_path, errors)
    if not manifest["areas"]:
        errors.append("project_context/context.toml must declare at least one [[areas]] entry")
    has_default_area = False
    for area in manifest["areas"]:
        for key in ["id", "root", "context"]:
            if not isinstance(area.get(key), str):
                errors.append(f"project_context/context.toml line {area['line']} must include string field {key}")
        default_area = area.get("default")
        if default_area is not None and not isinstance(default_area, bool):
            errors.append(f"project_context/context.toml line {area['line']} default must be a boolean")
        has_default_area = has_default_area or default_area is True
        deps = area.get("forbidden_runtime_dependencies")
        if deps is not None and not is_string_array(deps):
            errors.append(f"project_context/context.toml line {area['line']} forbidden_runtime_dependencies must be an array of strings")
        add_manifest_role(area, "area", roles, errors)
    if manifest["areas"] and not has_default_area:
        errors.append("project_context/context.toml must mark one [[areas]] entry with default = true")
    for context in manifest["context"]:
        role = normalize_role(context.get("role", "")) if isinstance(context.get("role"), str) else None
        if role is None:
            errors.append(f"project_context/context.toml line {context['line']} has unsupported context role")
            continue
        read_policy = context.get("read_policy")
        if read_policy is not None and read_policy not in READ_POLICIES:
            errors.append(f"project_context/context.toml line {context['line']} has unsupported read_policy: {read_policy}")
        for key in ["triggers", "default_children"]:
            value = context.get(key)
            if value is not None and not is_string_array(value):
                errors.append(f"project_context/context.toml line {context['line']} {key} must be an array of strings")
        add_manifest_role(context, role, roles, errors)
    return roles


def is_string_array(value):
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


def schema_requires_manifest():
    schema_version = "4"
    for candidate in CONFIG_CANDIDATES:
        path = ROOT / candidate
        if not path.exists():
            continue
        match = re.search(r'schema_version:\s*["\']?([^"\'\s]+)', path.read_text(encoding="utf-8"))
        if match:
            schema_version = match.group(1)
            break
    try:
        return int(schema_version.split(".", 1)[0]) >= 4
    except ValueError:
        return True


def validate_checks(rel, text, checks, errors):
    for label, terms in checks:
        if not has_any(text, terms):
            errors.append(f"{rel} must include {label}")


def main():
    errors = []
    global_path = ROOT / "project_context/global.md"
    if not global_path.exists():
        errors.append("missing project_context/global.md")
    else:
        validate_checks("project_context/global.md", global_path.read_text(encoding="utf-8"), GLOBAL_CHECKS, errors)

    architecture_path = ROOT / "project_context/architecture.md"
    if not architecture_path.exists():
        errors.append("missing project_context/architecture.md")
    else:
        validate_checks("project_context/architecture.md", architecture_path.read_text(encoding="utf-8"), ARCHITECTURE_CHECKS, errors)

    manifest_roles = validate_manifest(errors)
    context_root = ROOT / "project_context"
    context_files = sorted(context_root.rglob("*.md")) if context_root.exists() else []
    checked = 0
    for path in context_files:
        rel = path.relative_to(ROOT).as_posix()
        if rel in {"project_context/global.md", "project_context/architecture.md"}:
            continue
        text = path.read_text(encoding="utf-8")
        front_matter = parse_front_matter(text)
        declared_role = front_matter.get("context_role")
        front_matter_role = normalize_role(declared_role) if declared_role else None
        if declared_role and front_matter_role is None:
            errors.append(f"{rel} has unsupported context_role: {declared_role}")
        read_policy = front_matter.get("read_policy")
        if read_policy and read_policy not in READ_POLICIES:
            errors.append(f"{rel} has unsupported read_policy: {read_policy}")
        role = manifest_roles.get(rel) or front_matter_role
        if role is not None and role not in {"global", "architecture"}:
            checked += 1

    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1
    print(f"Context OK: {2 + checked} context file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
