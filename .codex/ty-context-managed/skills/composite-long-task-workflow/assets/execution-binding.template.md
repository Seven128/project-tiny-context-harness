# Composite Long-Task Execution Binding

workdir: {{workdir}}
protocol: workflow-protocol.md
protocol_sha256: {{protocol_sha256}}
goal_objective: goal-objective.txt

authorities:
  product_architecture_source: product-architecture-source.md
  technical_realization_plan: technical-realization-plan.md
  acceptance_checklist: acceptance-checklist.md

canonical_state:
  task_state: task-state.json
  events: events.ndjson
  derived_dir: derived/

required_commands:
  init: ty-context composite-long-task init <workdir>
  compile: ty-context composite-long-task compile <workdir>
  start_attempt: ty-context composite-long-task start-attempt <workdir>
  run_assertion: ty-context composite-long-task run-assertion <workdir> --ac <AC-ID> --proof-layer <layer> -- <command>
  record_evidence: ty-context composite-long-task record-evidence <workdir> --from <artifact> --command-run-id <id>
  derive: ty-context composite-long-task derive <workdir>
  apply_slice_delta: ty-context composite-long-task apply-slice-delta <workdir> <slice-delta.json>
  slice_gate: ty-context composite-long-task slice-gate <workdir> --slice <id>
  epoch_gate: ty-context composite-long-task epoch-gate <workdir> --epoch <id>
  state_validator: ty-context validate-superpowers-state <workdir>
  acceptance_validator: ty-context validate-plan-acceptance <workdir>
  final_gate: ty-context composite-long-task final-gate <workdir>

completion_gate:
  product_goal_complete_source: final_gate
  cannot_hand_set_product_goal_complete: true
  includes_ac_evidence_assertion_gate: true
  includes_negative_evidence_scan_gate: true
  current_attempt_only: true
  trusted_evidence_kernel: true
  harness_drift_lock: true
  protected_harness_baseline: true
  under_specified_machine_ac_blocks_completion: true
  ac010_cannot_bootstrap_summary_only: true
  derived_events_validators_never_proof: true
