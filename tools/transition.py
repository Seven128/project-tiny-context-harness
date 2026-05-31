#!/usr/bin/env python3
from harness_utils import (
    dump_yaml,
    find_phase_transition,
    load_lifecycle,
    load_phase_contract_data,
    make_arg_parser,
    phase_transition_targets,
    require,
    run_main,
)


def main() -> None:
    parser = make_arg_parser("Transition AI SDLC Harness lifecycle phase")
    parser.add_argument("--to", required=True, help="Target lifecycle phase")
    parser.add_argument("--reason", default="", help="Short compatibility note; not persisted in active state")
    parser.add_argument("--force", action="store_true", help="Allow transition outside configured next phases")
    args = parser.parse_args()

    lifecycle = load_lifecycle()
    contract_data = load_phase_contract_data()
    phases = contract_data["phases"]
    target = args.to
    current = lifecycle.get("current_phase")
    require(target in phases, f"Unknown target phase: {target}")
    require(current in phases, f"Current phase is not declared in phase_contracts.yaml: {current}")

    suspended = lifecycle.get("suspended_phase")
    legal = set(phase_transition_targets(contract_data, str(current), str(suspended or "")))
    transition = find_phase_transition(contract_data, str(current), target, str(suspended or ""))

    require(args.force or target in legal, f"Illegal transition {current} -> {target}. Legal: {sorted(legal)}")

    effects = transition.get("effects") if transition else {}
    if not isinstance(effects, dict):
        effects = {}
    if effects.get("set_suspended_phase"):
        lifecycle["suspended_phase"] = current
    if effects.get("clear_suspended_phase"):
        lifecycle["suspended_phase"] = ""

    phase = phases[target]
    lifecycle["current_phase"] = target
    lifecycle["active_role"] = phase.get("role", "")
    lifecycle["active_skill"] = phase.get("skill", "")

    lifecycle["allowed_next_phases"] = phase_transition_targets(
        contract_data,
        target,
        str(lifecycle.get("suspended_phase") or ""),
    )

    dump_yaml(lifecycle, ".codex/state/lifecycle.yaml")
    print(f"Transitioned {current} -> {target}")
    if args.reason:
        print(f"Note: {args.reason}")


if __name__ == "__main__":
    run_main(main)
