# Technical Realization Plan

## PI-001: Implement import evidence boundary proof on Evidence Intake.

delivery_scope: system_capability_build
capability_target: import evidence boundary proof
representative_samples:
  - import evidence boundary sample
full_population_boundary: not required for capability build
non_required_population:
  - refresh catalog operation
owner_surfaces:
  - Evidence Intake
forbidden_surfaces:
  - Provider Admission
owner_boundary: Evidence Intake page and import worker own boundary execution.
primary_capability_path: Evidence Intake UI triggers import evidence and observes quarantine-safe completion.
trigger_contract: user starts import evidence from Evidence Intake owner surface
state_transition_contract: import evidence request transitions from queued to imported
observable_result_contract: Evidence Intake page and import artifact show the imported record id
assertion_support: Playwright and runtime assertions target AC-001 worker_runtime ui_browser and test layers
required_assertion_commands:
  - node --test tests/runtime.spec.ts
invalid_implementation_shortcuts:
  - component screenshot only
implementation_paths:
  - src/pages/EvidenceIntakePage.tsx
  - src/import/evidence.ts
required_tests:
  - tests/runtime.spec.ts
related_acs:
  - AC-001
