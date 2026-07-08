# Technical Realization Plan

## PI-001: Implement runtime recovery on Operations.

delivery_scope: system_capability_build
capability_target: reusable runtime recovery capability
representative_samples:
  - recovery happy path sample
full_population_boundary: not required for capability build
non_required_population:
  - historical record migration
owner_surfaces:
  - Operations
forbidden_surfaces:
  - Provider Admission
owner_boundary: Operations page and runtime kernel own recovery execution.
primary_capability_path: Operations UI triggers runtime kernel recovery and observes completion.
trigger_contract: user starts recovery from Operations owner surface
state_transition_contract: recovery request transitions from queued to complete
observable_result_contract: Operations page and runtime artifact show the completed run id
assertion_support: Playwright and runtime assertions target AC-001 worker_runtime ui_browser and test layers
required_assertion_commands:
  - node --test tests/runtime.spec.ts
invalid_implementation_shortcuts:
  - component screenshot only
implementation_paths:
  - src/pages/OperationsPage.tsx
  - src/runtime/kernel.ts
required_tests:
  - tests/runtime.spec.ts
related_acs:
  - AC-001
