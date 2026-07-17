---
context_role: decision-rationale
read_policy: on-demand
---
# Long-Task Workflow Design Rationale

## Decision

Long-Task Workflow preserves one user-selected delivery as one Contract authority, decomposes independently decidable results into Outcomes for rolling work and diagnosis, and accepts only through one current-snapshot Final Gate. It retains only mechanisms with distinct false-completion or delivery-drift value and does not own an execution scheduler.

## Controlling Objective

Given complete, fine-grained declared requirements and acceptance criteria with reliable executable proof that the executing Agent cannot weaken, the workflow must prevent every unsatisfied declared item from being accepted or reported complete. It may not prevent implementation detours or guarantee model success; it must detect observable drift, fail closed, localize the affected Source Item/Outcome/Claim/Assertion/Check/Proof Surface/Binding/boundary, direct repair and recompute the complete Contract on the final current snapshot.

Only current-snapshot proof or an explicit unfinished/qualified state is trustworthy. Summaries, progress, historical passes, Receipts, one exit code and Agent confidence are not completion evidence. The workflow cannot discover requirements that were never declared.

## Why Contract Draft Exists

Before the first successful formal Compile, `delivery-contract.yaml` is the continuously editable, non-authoritative Contract Draft. Repository and Context discovery plus Preflight diagnostics need multiple repair passes before authority is safe to lock. The Draft is the same Contract object earlier in its lifecycle; it needs no Draft schema, CLI, Receipt, Authoring State, second plan or independent authority.

## Why Outcomes Decompose Requirement Coupling

A Draft Outcome is merely an Outcome before Authority Lock, not a runtime type. Outcomes divide a complete delivery by independently observable, decidable and target-verifiable results with explicit acceptance-readiness dependencies. This lets the current Goal narrow its active detail, run targeted verification, localize findings, recover ready work and mark local evidence stale without re-deriving the whole delivery.

Outcome decomposition therefore improves rolling implementation, targeted verification, failure localization and recovery. It does not split completion authority: all Outcomes remain under the same Contract, final snapshot and Final Gate. Model/output capacity, document size, implementation layer, file/module count, Agent capacity, Worker assignment and parallelism are never Outcome boundaries.

## Execution Efficiency Without A Scheduler

The current Goal may choose dependency-ready Outcomes as a temporary Rolling Frontier and organize implementation or verification accordingly. `depends_on` expresses acceptance readiness only. Neither the dependency graph nor the Frontier becomes a persisted execution plan, Worker queue, scheduler, model router, process tree or parallelism guarantee. Harness improves intermediate repair efficiency without taking ownership of execution orchestration.

## Why Contract Draft Authoring Is Integrated

An early design considered asking Web GPT to produce the complete Contract Draft independently. That use case was dropped because a complete Contract can exceed Web GPT's single-response output length, so one response cannot reliably contain the whole delivery authority. In Codex, the Draft can instead be revised continuously inside the real repository.

The same `long-task-workflow` Skill owns Draft authoring, Preflight repair, formal Compile, rolling implementation, verification and Final Gate because Draft authoring needs real repository and Context evidence for owners, paths, runners, verification inputs, Proof Surfaces and Bindings. Preflight findings feed back into the same Draft. A separate Contract Draft Skill would add a lossy handoff, risk dropping repository evidence or unresolved findings, and invite a second plan, Authoring Authority or Authoring Receipt. No one-shot model response is required.

This Web GPT/Codex history is source-workspace rationale only. Package-managed Skills and public documentation use the platform-independent architectural explanation and stay free of platform-specific history.

## Source Plan Versus Contract Draft

Source may be a user request, ordinary prose plan, external proposal or optional Source Plan. `source-plan-authoring` produces higher-fidelity ordinary Source with preserved qualifiers, traceable derivations, stable keys/anchors and explicit decisions. It does not bind a repository or create Contract/runtime authority. Its recommended shape is an authoring fast path, not an activation protocol.

`long-task-workflow` authors the Contract Draft from either ordinary Source or a Source Plan. Marker insertion is non-rendering and meaning-preserving. Structural decomposition and evidence-backed repository binding may proceed without a product decision; a new business rule, default/threshold, permission, recovery behavior, supported platform/data scope, persistence/retention rule, irreversible behavior or other product choice remains `decision_required`.

## Why One Contract And One Final Gate Remain

Outcome decomposes execution and diagnosis, not completion authority. Independent targeted repair evidence is valuable precisely because it stays local and non-authoritative. One Contract prevents semantic fragments from becoming competing authorities; one final current snapshot prevents historical passes from being spliced together; one Final Gate proves the entire declared delivery rather than promoting a locally passing Outcome to completion.

## Mechanism Admission And Cost Boundary

Every mechanism must name the false-completion/drift path it closes, the invariant it establishes, the evidence that proves it, any overlapping protection, the path reopened by deletion, its authoring/runtime/state/recovery/maintenance cost, whether its independent benefit exceeds that cost, whether it fails closed and whether it creates a second Authority, plan or scheduling plane. Only distinct, non-substitutable drift prevention justifies retention. This rule is design/review guidance, not a matrix, Receipt, Registry or runtime authority.

Risk remains proportional: L0 local/reversible/directly testable work pays no Contract cost; L1 uses the complete Contract and current-snapshot Final Gate; L2 increases proof only for affected high-risk Outcomes. Risk may be raised automatically or explicitly and never lowered by the executing Agent.

## Current Mechanisms And False-Completion Paths

- **Material Source inventory** prevents Source items from being omitted, rewritten or disappearing without a mapping.
- **Atomic non-Result Claim Coverage** prevents multiple concrete requirements from collapsing into one broad Outcome Result.
- **Source AC to named Assertion continuity** prevents acceptance meaning from being weakened in the Contract.
- **Shared Preflight/Compile activation-safety kernel** prevents skipping Preflight from bypassing an activation rule.
- **First-Compile Authority Lock and Authority Revision** prevent Source, Contract, Context or verifier edits from washing away requirements during execution.
- **No executing-Agent approval of a weakening revision** prevents the implementer from lowering its own acceptance standard.
- **Targeted verify as repair evidence only** prevents a local pass from being reported as complete delivery.
- **Same-snapshot Final Gate** prevents historical proof splicing and stale-evidence acceptance.
- **Stop/close rerunning the Live Final Gate** prevents code, Context, Source or verifier drift after a prior Gate.
- **Scope escape and risk escalation** prevent implementation outside the declared boundary from being accepted under obsolete proof.
- **Counterfactual, Population and sensitivity proof** prevent always-true checks, sample-only proof and evidence that cannot establish the implementation carrier.
- **Managed source/generated copy/package asset parity** prevents source-workspace rules from diverging from consumer-installed behavior.

These mappings explain existing value; they do not create a runtime mechanism matrix or another authority file.

## Trusted Results And External Pending

Machine authority has two honest result classes: complete current-snapshot evidence for every declared requirement/AC, or an explicit unfinished/qualified state caused by unmet, unverifiable, insufficient, stale or external-pending content. `machine_accepted_external_pending` says only that machine-verifiable scope passed. It is not complete external delivery, must report what remains pending and is not a vague third state.

## Stable Anti-Goals

- No `draft_outcomes` or `plan_items` schema, Draft runtime type/state/Receipt/Authority or PI execution chain.
- No standalone Contract Draft Authoring Skill or intermediate authoring product.
- No Worker, scheduler, queue, model routing, process tree or persisted Rolling Frontier.
- No capacity-, layer-, file- or parallelism-based Outcome split.
- No targeted-verify acceptance or historical-result aggregation.
- No mandatory Source Plan protocol and no platform history in package-managed Skills.
- No restored SFC, Packet, Wave, Campaign or Delivery Set orchestration.

## Known Limits

The workflow can protect only declared and falsifiable authority. It cannot prove that the user stated every real requirement, guarantee that a model will finish implementation, replace external CI/deployment/human confirmation, provide hostile-host security or eliminate intermediate trial and repair. Complete current-snapshot verification deliberately costs more runtime than historical proof reuse.
