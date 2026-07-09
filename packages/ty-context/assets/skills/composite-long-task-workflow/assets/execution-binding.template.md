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
  completion_output_status_source: final_gate_completion_output_resolver
  allowed_final_answers:
    - accept
    - reject
    - blocked
  final_answer_accept_requires_product_goal_complete_true: true
  final_answer_accept_requires_completion_output_status_accept: true
  final_gate_not_run_outputs_blocked: true
  final_gate_false_outputs_reject_or_blocked: true
  validator_pass_never_authorizes_accept: true
  matrix_verdict_final_card_never_authorizes_accept: true
  audit_task_complete_never_authorizes_accept: true
  generated_output_mismatch_blocks_accept: true
  final_gate_uses_current_candidate_before_scanner: true
  old_transient_bookkeeping_is_audit_only: true
  blocker_triage_category_required_on_failure: true
  blocker_triage_next_action_required_on_failure: true
  self_recoverable_generated_output_mismatch_retries_once: true
  cannot_hand_set_product_goal_complete: true
  cannot_hand_set_completion_output_status: true
  includes_ac_evidence_assertion_gate: true
  includes_negative_evidence_scan_gate: true
  current_attempt_only: true
  trusted_evidence_kernel: true
  harness_drift_lock: true
  protected_harness_baseline: true
  under_specified_machine_ac_blocks_completion: true
  ac010_cannot_bootstrap_summary_only: true
  derived_events_validators_never_proof: true
