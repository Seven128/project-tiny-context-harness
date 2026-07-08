# Acceptance Checklist

## AC-001: Import evidence boundary proof covers the owner surface.

acceptance_scope: system_capability_build
ac_validates:
  - import evidence boundary proof
ac_does_not_validate:
  - full population operation
sample_boundary: import evidence boundary sample
full_population_required: false
related_plan_items:
  - PI-001
required_proof_layers:
  - code
  - worker_runtime
  - ui_browser
  - test
assertion_command: node --test tests/runtime.spec.ts
assertion_artifacts:
  - tmp/ty-context/plan-acceptance/demo/runtime.json
  - tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json
positive_assertions:
  - required_behavior_observed
negative_assertions:
  - no-forbidden-final-state
machine_blocking: true
invalid_completion_signals:
  - 页面无明显变化
assertion_result_required: true
ac_type: machine_verifiable
proof_chain:
  - AC-001.worker_runtime
  - AC-001.ui_browser
  - AC-001.test
verification_method:
  - browser assertion
  - runtime assertion
fail_conditions:
  - 页面无明显变化
invalid_evidence:
  - screenshot-only
substitution_policy:
  - no sibling substitution
missing_layer_downgrade: partial
auditor_expectation: verify owner surface and runtime assertions
out_of_scope_na_approval_source: none
required_test_ids:
  - tests/runtime.spec.ts
explicit_no_test_scope: false
hard_blockers:
  - missing assertion_result
validates_explanation: validates import evidence boundary proof
does_not_validate_explanation: does not validate full population operation
final_evidence_expected:
  - assertion report
test_cases:
  - happy path
