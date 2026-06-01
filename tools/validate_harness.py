#!/usr/bin/env python3
from harness_utils import (
    harness_path,
    load_lifecycle,
    load_phase_contract_data,
    load_phase_contracts,
    load_yaml,
    phase_transition_contract_errors,
    repo_path,
    require,
    require_paths,
    run_main,
)


def main() -> None:
    root = harness_path()
    required_files = [
        "AGENTS.md",
        "Makefile",
        ".docs/INDEX.md",
        harness_path("state", "lifecycle.yaml"),
        harness_path("state", "plan.yaml"),
        harness_path("state", "plan.draft.yaml"),
        harness_path("state", "memory.md"),
        harness_path("pjsdlc_managed", "templates", "PLAN_TEMPLATE.yaml"),
        harness_path("pjsdlc_managed", "policies", "phase_contracts.yaml"),
        harness_path("pjsdlc_managed", "policies", "gates.yaml"),
        harness_path("pjsdlc_managed", "policies", "allowed_paths.yaml"),
        harness_path("pjsdlc_managed", "policies", "risk_matrix.yaml"),
        "tools/build_doc_overviews.py",
        "tools/validate_plan.py",
    ]
    required_dirs = [
        ".docs/00_raw",
        ".docs/01_product",
        ".docs/02_experience",
        ".docs/02_architecture",
        ".docs/03_tech_plan",
        ".docs/04_implementation",
        ".docs/05_decisions",
        ".docs/06_review",
        ".docs/07_test",
        ".docs/08_release",
        ".docs/09_runbooks",
        ".docs/rfc",
        harness_path("skills"),
        "tools",
    ]
    require_paths(required_files + required_dirs)

    lifecycle = load_lifecycle()
    phase_contract_data = load_phase_contract_data()
    phases = load_phase_contracts()
    load_yaml(harness_path("pjsdlc_managed", "policies", "gates.yaml"))
    load_yaml(harness_path("pjsdlc_managed", "policies", "allowed_paths.yaml"))
    load_yaml(harness_path("pjsdlc_managed", "policies", "risk_matrix.yaml"))

    current_phase = lifecycle.get("current_phase")
    require(current_phase in phases, f"Lifecycle current_phase is not declared: {current_phase}")
    for error in phase_transition_contract_errors(phase_contract_data, require_transitions=True):
        require(False, error)

    for phase_name, contract in phases.items():
        skill = contract.get("skill")
        require(skill, f"{phase_name} missing skill")
        skill_file = repo_path(f"{root}/skills/{skill}/SKILL.md")
        require(skill_file.exists(), f"Missing skill file for {phase_name}: {skill_file.relative_to(repo_path('.'))}")
        require("inputs" in contract, f"{phase_name} missing inputs")
        require("outputs" in contract, f"{phase_name} missing outputs")
        require("gates" in contract, f"{phase_name} missing gates")

    print("Harness scaffold OK")


if __name__ == "__main__":
    run_main(main)
