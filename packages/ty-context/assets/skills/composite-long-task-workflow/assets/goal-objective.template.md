/goal Execute the composite long-task workflow in {{workdir}}.

First read and obey:
- workflow-protocol.md
- execution-binding.md
- product-architecture-source.md
- technical-realization-plan.md
- acceptance-checklist.md
- task-state.json and generated derived/** views

Persistent contract:
Product / Architecture Source owns intent, scope and boundaries. Technical Realization Plan owns PI implementation and plan conformance. Acceptance Checklist owns AC completion semantics and proof layers. task-state.json is the only execution state source; events.ndjson is append-only; derived/** is generated and must not be hand-edited as authority.

Use workflow-protocol.md to combine Tiny Context gates with official Superpowers execution. It is not business Context and must not be registered in project_context/context.toml. Do not redefine, duplicate or fork Superpowers mechanics. Prefer superpowers:subagent-driven-development when subagents are available, otherwise use superpowers:executing-plans. Use TDD for behavior gaps and superpowers:verification-before-completion before completion claims.

Work in slices. Each slice must update state through slice-delta.json, canonical evidence records, derive, and slice-gate. Run epoch-gate for shared provider/browser/runtime/security proof environments. Preserve Context Delta, plan conformance, acceptance proof layers, redaction, reviewability and sample/full-population boundaries.

Forbidden shortcuts:
Do not mark UI/runtime/API/data/integration/test ACs complete from screenshots, final cards, validator passes, matrix/verdict rows or prose. Required machine-verifiable layers need assertion_result.status=passed, zero command/assertion exit codes, target AC/layer coverage, passed positive and negative assertions, reviewable artifacts and no failed/stale negative_evidence_scan.
Tests alone do not prove plan conformance. Superpowers review does not override Tiny Context gates. Sample evidence does not prove full population unless AC allows. Manual edits under derived/** are not authority. Local audit cannot mark final completion. Do not claim full implementation while Context Delta is required but Context is not updated, or while Source-to-Context Coverage / Context-to-Implementation Binding has unresolved required gaps.

Completion:
Do not hand-set product_goal_complete. Only complete after derive, verification-before-completion, validate-superpowers-state, validate-plan-acceptance, auditor/stale-overclaim checks when applicable, AC Evidence Assertion Gate, Negative Evidence Scan Gate, and final-gate compute product_goal_complete=true. If audit_task_complete is true but acceptance_target_status is not complete, report "Audit workflow completed; acceptance target not complete." and continue or stop with blockers; do not say Goal achieved.

Blocked:
Maximize safe autonomous progress using repo tools, local app/browser sessions, CLI auth and authorized elevation. Stop only for locally unsatisfiable blockers such as MFA, missing permission, external approval or unavailable credentials, and return the minimal user action list plus next agent step.
