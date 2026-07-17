---
context_role: decision-rationale
read_policy: on-demand
---
# Long-Task Workflow Design Rationale

## Decision

Single-Goal Long-Task Workflow exists to prevent false completion inside one complete declared delivery authority. It uses one native Goal, one selected workspace, one continuously authored Contract, semantic Outcome boundaries, repair-only targeted verification and one current-snapshot Final Gate. It does not own agent, process, model or Git orchestration.

Contract Draft authoring, Preflight repair, formal Compile, rolling implementation, targeted verification and Final Gate remain one `long-task-workflow` lifecycle. `source-plan-authoring` is an optional upstream Source-quality helper, not a Contract authoring or completion authority.

## Controlling Objective

When Source is complete and fine-grained enough to cover every declared requirement and AC, and each item has reliable executable proof that the executing Agent cannot weaken by itself, the workflow must prevent every unsatisfied item from being accepted or reported complete.

Intermediate implementation may drift, fail or require rework. The workflow does not guarantee model success or a drift-free path. It constrains acceptance: compare Source Authority, Contract, relevant Context and the current artifact; block unsatisfied items; localize failures through Source Item, Outcome, Claim, Assertion, Check, Proof Surface, Binding and owner boundary; direct repair; and revalidate the complete final snapshot. Summary prose, progress, historical tests, Receipts and command exit alone never substitute for proof.

## Why Contract Draft Exists

Before the first successful formal Compile, `delivery-contract.yaml` is a non-authoritative Contract Draft. The Draft lets the author progressively preserve Source meaning, decompose it into atomic Claims and named Assertions, bind repository evidence, and resolve Preflight findings without prematurely creating Authority Lock.

The Draft is the same object that will later become formal Contract Authority. It may be edited across many repository reads and model responses. It needs no Draft Receipt, Authoring State, second plan, draft schema, draft CLI or draft runtime record.

## Why Outcomes Decompose Requirement Coupling

A Draft Outcome groups an independently observable and decidable result whose Claims and acceptance can be target-verified and whose dependencies and ownership boundary can be stated. This separates requirement coupling without splitting completion authority.

Outcome boundaries let one Goal keep a smaller dependency-ready working set, shorten targeted verification, localize failures, restore ready work and findings on resume, and mark precisely which local result became stale. An Outcome is not a response-length fragment, file group, frontend/backend layer, Agent-capacity unit or parallel-work allocation.

> Outcome decomposes execution and diagnosis, not completion authority.

## Execution Efficiency Without A Scheduler

`depends_on` expresses acceptance readiness. The current Goal uses it with current findings to form a temporary Rolling Frontier and chooses implementation order as code reality becomes known. The Frontier is not persisted and does not prescribe a mandatory implementation schedule.

No Draft Outcome creates a Worker, scheduler item, queue, process tree, model route or durable execution DAG. Outcome decomposition does not guarantee parallelism or fewer model calls. It improves intermediate implementation, verification, diagnosis and recovery while leaving final acceptance to the complete Contract.

## Why Contract Draft Authoring Is Integrated

An early design considered having Web GPT independently emit a complete Contract Draft before repository work. That scenario was abandoned because a complete Draft can exceed Web GPT's reliable single-response length; requiring one response to contain the whole delivery Contract would make completeness depend on output capacity.

Once work enters Codex, the same Draft can be revised continuously in the real repository. Keeping Draft authoring inside `long-task-workflow` also has six architectural advantages:

1. real repository and Context reads are required to bind owners, paths, runners, verification inputs, proof surfaces and Bindings;
2. Preflight findings can directly repair the same Draft;
3. no extra Skill handoff can lose Source meaning, repository evidence or unresolved findings;
4. there is less pressure to create a second plan, Authoring Authority or Authoring Receipt;
5. Draft-to-Compile remains a lifecycle transition of one object rather than a conversion between products; and
6. the Skill can iterate across as many responses as necessary, then continue through Compile, rolling execution, verification and Final Gate.

The platform-neutral form of this rationale belongs in `PROJECT_SPEC.md`. The Web GPT-to-Codex history remains source-workspace rationale only and must not enter package-managed Skills or public consumer guidance.

## Source Plan Versus Contract Draft

A Source Plan is optional Markdown Source. It preserves direct requirements and qualifiers, traces necessary derivations, exposes `decision_required`, and supplies stable semantic keys and anchors. It is not a Contract Draft, Delivery Contract, Context update, repository binding, workflow Authority, implementation plan or proof.

Ordinary user requests, prose plans, research plans and external proposals are equally valid Source. Recommended Source Plan structure is an Authoring Fast Path, not an input protocol. Material Source Items still receive text-preserving non-rendering markers before activation.

Contract authoring may add meaning-preserving structural decomposition and repository/Context bindings supported by real evidence. New business rules, defaults, thresholds, permissions, recovery behavior, platform or data scope, persistence/retention, irreversible behavior and other product-scope choices remain `decision_required`; the executing Agent cannot present its own inference as a necessary derivation.

## Why One Contract And One Final Gate Remain

Draft Outcomes make rolling work cheaper to reason about, but they do not create separate authorities. The first successful formal Compile locks the complete Contract, including all Outcomes. Targeted verification is repair evidence for selected Checks or Outcomes and never accepts the task.

Final Gate rechecks all Global and Outcome Checks on one current snapshot. This prevents local passes, stale passes or historically compatible results from being aggregated into completion. There is always one selected delivery, one Contract Authority and one Final Gate.

## Mechanism Admission And Cost Boundary

A mechanism is admitted or retained only when it closes a concrete and otherwise insufficiently covered false-completion or delivery-drift path, establishes a testable invariant, fails closed and provides more independent drift-prevention value than its Authoring, Runtime, State, Recovery and maintenance cost.

Review must identify the path, invariant, proof, overlap with existing mechanisms, the risk reopened by deletion, total cost, net benefit, fail-closed behavior and whether the proposal creates a second Authority, second plan or scheduling plane. This review is a design and code-review principle, not a matrix file, Receipt or runtime Registry.

The rule is risk-proportional. L0 local, reversible and directly testable work pays no Contract cost. L1 uses one complete Contract, rolling repair and a current-snapshot Final Gate. L2 raises proof only on affected high-risk Outcomes. Risk may rise automatically or explicitly and cannot be downgraded by the executing Agent.

## Current Mechanisms And False-Completion Paths

- **Material Source inventory** prevents a Source item from being omitted, rewritten or disappearing without a mapping.
- **Atomic non-Result Claim Coverage** prevents several specific requirements from collapsing into one broad Outcome Result.
- **Source AC to named Assertion semantic identity** prevents acceptance meaning from being weakened in the Contract; the same canonical resolver covers Outcome refs and `GLOBAL.<check>.<assertion>`, while Global ACs require an independently Source-backed Global Claim and cannot cross scope.
- **Shared Preflight/Compile activation-safety kernel** prevents skipping Preflight from bypassing activation rules.
- **First-Compile Authority Lock and Authority Revision** prevent Source, Contract, Context or verifier edits from washing away requirements during execution.
- **Executing Agent cannot approve its own weakening revision** prevents the implementer from lowering its own acceptance bar.
- **Targeted verify is repair evidence only** prevents a local pass from being reported as whole-delivery completion; Counterfactual failure is part of the owning Check Result/Progress rather than a transient top-level Finding, so status/resume cannot recover a false `progress_passing` state.
- **Same-snapshot Final Gate** prevents historical pass aggregation and stale evidence reuse.
- **Stop/close rerun the Live Final Gate** prevents post-Gate Source, Context, Contract, verifier or code drift from being accepted.
- **Scope escape and risk escalation** prevent work outside the declared boundary from passing under the old scope or proof level.
- **Counterfactual, Population and sensitivity proof** prevent always-true tests, sample-only claims and evidence disconnected from implementation carriers.
- **Global Counterfactual to Outcome Binding** prevents a Global Claim from being backed by an unrelated global oracle without inventing a second Global Binding model; the cost is one explicit cross-scope reference and carrier freshness dependency.
- **Exact Risk marker metadata** prevents a strong Source risk from being redirected to a weaker Fact or another Outcome; ambiguity costs a real `decision_required` pause instead of an inferred downgrade.
- **Planned Binding existence** permits truthful authoring before a new file exists, while Final Gate existence and freshness close the no-op mutation path; compile-time absence is allowed only for the declared planned lifecycle.
- **Two-layer Playwright trust** treats frozen standard test content as verifier authority and pays mutation cost only for `weak_observability`; its dedicated policy accepts Playwright's real exit-one test-failure protocol only when the entire unexpected-instance set is exactly the designated AC set, preserving fail-closed Baseline behavior without mutating every UI test.
- **Non-completing Source kind** prevents explicit “does not count as done” meaning from being weakened into an ordinary Requirement or non-goal and makes its negative sensitivity independently traceable.
- **Managed source, generated copy and package asset parity** prevent source-workspace rules and consumer-installed rules from diverging.

These mappings explain existing value; they are not a runtime mechanism matrix or a second Authority.

## Trusted Results And External Pending

Machine authority has only two trustworthy outcomes: fresh evidence on the current final snapshot proves all declared requirements and ACs, or at least one item is unsatisfied, unverifiable, insufficiently evidenced, stale or externally pending and the delivery remains explicitly unfinished or qualified.

`machine_accepted_external_pending` means the machine-verifiable scope passed while external confirmation remains. It is not complete external delivery, must be reported with the pending confirmation, and is not a vague third completion state.

That qualification must remain continuous after Final Gate. Collapsing it into `last_gate_passed`, `{}`, or generic `closed` reopens a false-completion path for callers that only see status, a resumed session, the Stop Hook or close output. The accepted workflow status therefore propagates through each surface; stale Receipts lose their accepted projection, while external confirmations remain visible as current Contract declarations. Stop/close can end the machine Authority lifecycle without tracking external work, but their output cannot convert machine acceptance into complete external delivery.

Progress, status, Receipts and compiled cache are audit/recovery projections. Source, Context, Contract, verifier, runner or workspace drift stales affected evidence. `resume` restores semantic state, not a physical Turn, and historical evidence cannot be spliced into current acceptance.

## Stable Anti-Goals

- No `draft_outcomes` or `plan_items` schema fields.
- No `DraftOutcome` runtime type, Draft Outcome state, Worker, scheduler or queue.
- No Contract Draft CLI, Receipt, Authoring State or Authoring Authority.
- No standalone `contract-authoring`, `draft-authoring` or draft-preparation Skill.
- No second plan, second Contract authority, top-level Contract split or targeted-verify acceptance.
- No capacity-, layer-, file-, module-, Agent- or parallelism-based Outcome splitting.
- No mandatory Source Plan format and no consumer platform-history guidance.
- No restoration of SFC, Packet, Wave, Campaign, Delivery Set or model/process/Git orchestration.

## Known Limits

- The workflow cannot prove that the user declared every real requirement.
- It cannot guarantee that a model completes implementation or avoids intermediate drift.
- It accepts only declared, falsifiable machine authority; CI, deployment and human product acceptance remain external.
- Local mode trusts the installed verifier and Git metadata and is not a hostile-host security boundary.
- Complete current-snapshot verification costs time; risk-proportional routing keeps that cost off ordinary L0 work.
