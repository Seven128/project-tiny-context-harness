---
name: long-task-workflow
description: Author, preflight, execute, resume, verify, or close one complete Single-Goal Delivery Contract in the current native Goal and workspace. Use only when explicitly invoked or a valid common-dir active authority binding exists.
---

# Single-Goal Long-Task Workflow

## Boundaries

Use one current native Goal, one repository, one selected workspace, one complete Contract and one Final Gate. Never create a scheduler, model worker, agent runtime, App Server, branch, worktree, merge, push, PR, deployment, Campaign/SFC/Packet/Wave chain, matrix, verdict or second Contract plan. Never activate from task size alone.

The host and user own model selection. The workflow has exactly one user-choice checkpoint after the first Authority Lock and before implementation; Harness neither switches the model nor persists model-routing/checkpoint state. No checkpoint file, acknowledgement state, model route, model-tier scheduler or automatic model switch is created. Outside that boundary, do not pause a healthy Goal solely to change or downgrade the model. Do not create a separate approval checkpoint for a defensible recommended plan choice. A targeted pre-Authority clarification is still required when a missing user preference could materially change research or selection; genuine Source conflicts or choices the user explicitly reserves may likewise require a decision before Authority Lock. Capability-related drift is handled by targeted repair plus the Final Gate. Never proactively spawn, assign or coordinate parallel subagents. Platform-native internal delegation, if it occurs, is opaque and non-authoritative and must converge into the unified current workspace snapshot before verification can count.

`long-task-delivery-v2` is the only active Contract schema. `delivery-contract.yaml` is the root authoring file. New authoring uses inline Outcomes; existing `outcome_files` are physical compatibility only. `delivery-set` is retired and non-executing.

## Controlling Objective

Prevent false completion inside declared authority. Implementation may drift, fail or require rework, but every declared non-Result requirement and AC must remain traceable and every unsatisfied, unverifiable, insufficiently evidenced or stale item must block completion. Findings should localize repair through Source Item, Outcome, Claim, Assertion, Check, Proof Surface, Binding and owner boundary.

Only fresh evidence from the complete current final snapshot may create machine acceptance. Otherwise report the task as unfinished or qualified. `machine_accepted_external_pending` means machine-verifiable authority passed while named external confirmation remains; it is not full delivery completion. Never substitute prose, progress, historical tests, Receipts, one exit code or Agent judgment for the Final Gate.

Prefer the lowest practical Authoring, Runtime, State, Recovery and verification cost that preserves the same false-completion interception. Add no mechanism whose distinct protection does not materially exceed its total cost.

## Progressive Reference Loading

Read only the reference needed for the current phase; these files are guidance, not new artifacts or authority:

- Before creating or structurally revising Source markers, Outcomes, requirements, controls, obligations, architecture boundaries, paths, Bindings, Assertions or risk, read [`references/contract-authoring.md`](references/contract-authoring.md).
- Before creating or repairing Checks, runners, Observations, proof surfaces, Playwright/structured evidence, Counterfactuals, Population or environment probes, read [`references/evidence-design.md`](references/evidence-design.md).
- Before Preflight, Compile, protected revision, resume, targeted verify, Final Gate, Stop, close or abandon, read [`references/authority-lifecycle.md`](references/authority-lifecycle.md).

Do not copy reference detail into another plan or state file. The same `delivery-contract.yaml`, active authority and current workspace remain the only lifecycle surfaces.

## Contract Draft And Outcome Decomposition

Before the first successful formal Compile, continuously revise the same non-authoritative `delivery-contract.yaml` as the Contract Draft. It need not be completed in one response; keep reading Source, repository and relevant Context and feed Preflight findings back into that same Draft. Draft authoring, Preflight, Compile, rolling execution, targeted verification and Final Gate are one `long-task-workflow` lifecycle. Do not create a standalone Contract Draft Skill, Draft Receipt, Authoring State, draft schema/CLI/runtime state or second plan.

A Draft Outcome is an Outcome in that pre-Authority-Lock Draft, not a new schema field or runtime entity. Decompose only independently observable, decidable and target-verifiable results whose dependencies and owner boundary can be stated. Use those boundaries to keep a dependency-ready working set, target verification, localize failures, resume findings/next actions and stale local results precisely.

`depends_on` means acceptance readiness. The current Goal may form a temporary Rolling Frontier from ready Outcomes and findings, but must not persist a scheduler, Worker queue, mandatory implementation DAG, model route or process tree. Never split for response/YAML/file length, implementation layer, module/file count, Agent capacity, Worker assignment or desired parallelism.

> Outcome decomposes execution and diagnosis, not completion authority.

## Entry And Authoring Loop

1. Read the user request or external proposal plus minimum controlling Context and decide `Context Delta: none|required`.
2. If a valid active binding exists, run `ty-context long-task resume <workdir>` and read the lifecycle reference.
3. Otherwise author one complete Delivery Contract for the whole selected delivery. Do not create a second Contract plan, matrix or top-level Contract split.
4. Preserve at least one real `source_path`. Wrap every material Source item in its original Markdown with non-rendering `ty-source-item:start/end` markers without rewriting the text; marked Source Item keys and `source_claim` keys are exactly equal.
5. An ordinary prose plan or optional Source Plan remains valid Source after marker-only enumeration and does not need to match the recommended Source Plan structure. Preserve stable semantic keys and Markdown anchors where practical.
6. Continue reading repository, Source and Context and revise the same Draft. A request to synthesize, refine, complete, implement or use judgment delegates plan-level authoring, but it does not invent the user's tradeoff priorities. Before comparative research or a material product, technical, architecture or provider selection, identify the criteria that could change the research scope, candidate set or recommendation. Infer them only from the user's words, Source, Context or controlling constraints. If quality versus cost, speed, reliability, privacy, lock-in, operational burden or another material priority is unknown or ambiguous, stop before that research or selection and ask one concise targeted clarification. Do not impose a questionnaire, re-ask known preferences or interrupt minor reversible choices whose recommendation would not change.
7. Once the material preference envelope is clear, decide what research is needed. Use current authoritative or primary evidence for external capability, pricing, quota, license, compatibility, region, security posture or support claims. When one recommendation is then defensible, record it in real Source with the authoring instruction, preference/evidence basis and exact added meaning instead of pausing for approval. Append the delegated item without rewriting the user's original text when ordinary prose is the Source. Return only when authoritative requirements conflict, the user explicitly reserves the choice, a material preference remains unknown, critical semantics have no defensible recommendation or no falsifiable acceptance standard can be formed.
8. Contract expansion remains limited to meaning-preserving structural decomposition, evidence-backed repository binding and choices first recorded as delegated real Source. Never place a new product rule, default, threshold, recovery behavior, permission or platform/data scope only in Contract YAML. Default plan delegation authorizes meaning, not action: payment, contracting, production deployment or publication, destructive production mutation, real permission grants, sensitive-data transmission and required legal/security/human approval remain named external confirmations. Any conflicting, user-reserved, missing-preference or unsupported semantic remains `decision_required`.
9. Run read-only `ty-context long-task preflight <workdir>`, repair every error and `decision_required` finding in the same Draft, then formally Compile only when ready.
10. When the first Compile returns `execution_model_checkpoint.required: true`, stop before implementation and ask the user to choose `continue_current_model` or switch models and then resume the active Long-Task. A task-specific choice already stated explicitly satisfies the checkpoint. Later revisions return `required: false` and do not repeat it.

Architecture quality uses the existing authority model, not a new gate: when Source or controlling Context declares an architecture invariant, encode it as a Source-backed technical obligation/global constraint/forbidden shortcut plus owner/path/Binding boundaries and a project-owned executable Check. Functional acceptance cannot substitute when the architecture claim can fail independently. An unverifiable design preference remains task-local, durable Context or `decision_required`; it must not be promoted into false proof.

## Rolling Execution

After Authority Lock and the one-time execution-model checkpoint are satisfied, implement dependency-ready Outcomes in the current workspace. Small implementation plans and repair hypotheses are internal execution state and cannot silently change Product, Technical or Acceptance authority.

Re-evaluate `Context Delta` whenever implementation or repair discovers a durable fact. Controlling Context changes use protected revision; graph-derived, non-explicit `implementation-index` and `archive` are Supporting Context in referenced mode and may auto-revise when only navigation/background changed. Full snapshot mode treats every selected Context file as controlling.

Use targeted `verify --outcome/--check` only to drive repair. Progress is repair evidence only and never acceptance authority. Keep precise findings attached to the owning Source item, Claim, Assertion, Check, Binding and owner path. Do not add another model-switch pause or coordinate parallel subagents.

## Live Final Authority

Complete Context, implementation and project tests, create a clean candidate commit, then run `ty-context long-task final-gate <workdir>`.

Final Gate recompiles Source authority, validates active task/revision/compiled/worktree identity, creates one Git-tree snapshot, reruns every required Global and Outcome Check and rechecks active identity before acceptance. Final Gate, Stop and close never trust historical Progress, Receipt or compiled cache.

Machine acceptance covers only declared machine authority. Preserve every pending external confirmation through `final-gate`, `status`, `resume`, `stop-check`, the package-owned Stop Hook and `close`; `closed` means only machine Authority cleanup. Do not invent external-confirmation tracking state.

## Handoff

Report implementation, effective risk, Claim Coverage, Live Gate result, every pending external confirmation, Context status and blockers. State the threat-model limits: undeclared requirements cannot be discovered, installed verifier/Git metadata are trusted, model selection belongs to the host/user, and internal platform delegation is not observed.
