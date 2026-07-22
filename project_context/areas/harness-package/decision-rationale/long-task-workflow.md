---
context_role: decision-rationale
read_policy: on-demand
---
# Long-Task Workflow Design Rationale

## Decision

Single-Goal Long-Task Workflow exists to prevent false completion inside one complete declared delivery authority. It uses one native Goal, one selected workspace, one continuously authored Contract, semantic Outcome boundaries, repair-only targeted verification and one current-snapshot Final Gate. It does not own agent, process, model or Git orchestration.

Source-quality authoring, Contract Draft authoring, Preflight repair, formal Compile, one model-choice checkpoint, rolling implementation, verification and Final Gate remain one `long-task-workflow` lifecycle. `source-plan-authoring` is now only a compatibility pointer.

## Controlling Objective

When Source is complete and fine-grained enough to cover every declared requirement and AC, and each item has reliable executable proof that the executing Agent cannot weaken by itself, the workflow must prevent every unsatisfied item from being accepted or reported complete.

Intermediate implementation may drift, fail or require rework. The workflow does not guarantee model success or a drift-free path. It constrains acceptance: compare Source Authority, Contract, relevant Context and the current artifact; block unsatisfied items; localize failures through Source Item, Outcome, Claim, Assertion, Check, Proof Surface, Binding and owner boundary; direct repair; and revalidate the complete final snapshot. Summary prose, progress, historical tests, Receipts and command exit alone never substitute for proof.

The efficiency target is the lowest practical total workflow cost that preserves this interception strength. Prefer equal protection with lower Authoring, Runtime, State, Recovery, maintenance and test cost, or equal cost with stronger independent drift prevention. Stop stacking mechanisms when marginal protection no longer exceeds their cost; when the evidence boundary is uncertain, fail safe rather than silently accept.

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

The workflow must never proactively spawn, assign or coordinate parallel subagents. Platform or Agent internal delegation may still occur, but it is opaque and non-authoritative: the Harness neither depends on it nor persists it, and all outputs must converge into the unified current workspace snapshot before acceptance.

## Why One Model-Choice Checkpoint Exists

The host and user own model selection, and Harness cannot switch the model of a running conversation or Goal. It therefore creates no model router, model worker, tier scheduler or acknowledgement state.

The first successful Compile is nevertheless a distinct cost boundary: Source, Contract, relevant Context, risk and acceptance evidence are now under Authority Lock. At that point the user can safely choose whether to keep the authoring model or switch to a lower-cost execution model, while the locked Contract, targeted repair and Final Gate continue to constrain completion.

Compile emits `execution_model_checkpoint.required: true` only for the first Authority Lock. The Agent stops before product implementation and asks for `continue_current_model` or a model switch followed by resuming the active Long-Task. A model strategy already stated explicitly for the task satisfies the checkpoint. Later revisions return `required: false`; no repeated cost-only pause occurs.

This checkpoint is an execution-cost optimization enabled by the workflow's drift protection, not acceptance evidence. Model choice never proves a Claim and does not weaken Final Gate requirements.

## Why Context Remains Mutable During Execution

`Context Delta` is not a one-time pre-Compile decision. The current Goal must re-evaluate `Context Delta` whenever implementation or repair discovers a durable fact and update the owning Context rather than freezing a known error until the end.

The verifier distinguishes two classes in referenced snapshot mode:

- **Controlling Context** includes core Context, every explicit `context_ref`, verification and deployment Context, and every other selected file whose semantics can change ownership, architecture, contract, risk, recovery or repeatable verification. A change requires Authority Revision and may require exact user approval because silently absorbing it could weaken completion authority.
- **Supporting Context** is limited to graph-derived, non-explicit `implementation-index` and `archive` files. These files improve navigation or preserve background material but do not define acceptance. Their content may auto-revise through `compile --revise` without user approval, and a supporting-only revision does not invalidate otherwise fresh targeted Progress.

Full snapshot mode treats every Context file as controlling. Explicitly referencing an otherwise supporting role also makes it controlling. This prevents the executing Agent from relabeling a requirement-bearing file as support to bypass Authority Revision. Final Gate still recompiles and binds the complete current Context snapshot, so supporting updates remain visible without becoming an acceptance authority.

## Why Contract Draft Authoring Is Integrated

An early design considered having Web GPT independently emit a complete Contract Draft before repository work. That scenario was abandoned because a complete Draft can exceed Web GPT's reliable single-response length; requiring one response to contain the whole delivery Contract would make completeness depend on output capacity.

Once work enters Codex, the same Draft can be revised continuously in the real repository. Keeping Draft authoring inside `long-task-workflow` also has six architectural advantages:

1. real repository and Context reads are required to bind owners, paths, runners, verification inputs, proof surfaces and Bindings;
2. Preflight findings can directly repair the same Draft;
3. no extra Skill handoff can lose Source meaning, repository evidence or unresolved findings;
4. there is less pressure to create a second plan, Authoring Authority or Authoring Receipt;
5. Draft-to-Compile remains a lifecycle transition of one object rather than a conversion between products; and
6. the Skill can iterate across as many responses as necessary, then continue through Compile, the one-time model choice, rolling execution, verification and Final Gate.

The platform-neutral form of this rationale belongs in `PROJECT_SPEC.md`. The Web GPT-to-Codex history remains source-workspace rationale only and must not enter package-managed Skills or public consumer guidance.

## Why Source Authoring Merged Into Long-Task

The earlier separate `source-plan-authoring` boundary existed so an external conversational service could prepare a high-fidelity proposal before Codex. Once external proposal generation moved to the initial-proposal boundary—and selected design resources had to join that proposal—the extra handoff no longer provided independent protection. It added manual intervention, duplicate context transfer and a place to lose design provenance while saving little token cost.

The useful semantics remain: full mixed-input inventory, direct/derived/delegated/evidence-backed provenance, preference-sensitive research, stable keys, surface/control/state completeness, exact risk facts and falsifiable acceptance. They now live in `long-task-workflow/references/source-authoring.md` and run only when raw/revised Source needs refinement. A writable initial proposal becomes the real Source; conversation-only input materializes one project-native Source. Then markers and the same Contract Draft follow in the same Goal.

This removes a service boundary without creating a Source schema, Authoring Authority, gate, Receipt, cache or state. Legacy Source Plans remain valid ordinary Source and are never rewritten merely for compatibility. The old Skill is retained as a pointer so explicit historical invocations fail legibly rather than silently restoring the former workflow.

Preference clarification and delegation semantics are unchanged: ask only when an unknown priority would change research/recommendation; use current authoritative evidence for unstable claims; record defensible recommendations in real Source; and leave payment/contract/deployment/destructive/permission/sensitive-data/legal-security actions as external confirmations. Contract YAML cannot introduce unrecorded product meaning.

## Why Visual Design Authority Resolves Before Compile

A material production UI can satisfy functional checks while still inventing its information hierarchy, layout and component language from an unconfigured starter or style-only prose. Screenshot-checking that implementation against a baseline created from the same implementation is circular and cannot prove fidelity to user intent.

Long-Task therefore reuses existing Source and authoring boundaries rather than adding a visual lifecycle. Before Compile, visual references are classified as exact targets, partial constraints or inspiration; `DESIGN.md` names the authored token source/generation direction; and every material surface either has sufficient selected authority, is explicitly scoped as a prototype/non-fidelity result, or records delegated design Source after material preferences are known. A missing or user-reserved visual direction remains `decision_required`.

The selected target must exist as Source or a frozen verification input before fidelity implementation is accepted. Generated implementation screenshots and diffs remain artifacts and cannot promote themselves into target authority. Browser Claims continue to use `ui_browser`; native/mobile/desktop target proof remains a project-owned current-execution Check when representable and otherwise an explicit external confirmation. This closes the circular-self-baseline and undeclared-design paths with authoring guidance only: no visual Schema, new risk level, second Gate, approval state or required design directory is introduced.

## Why Control Projection Expands Instead Of Adding UI/UX Workflow State

The remaining false-completion path is lossy authoring: interactive Source can state a control's task, visibility, availability, validation, default, navigation, recovery, permission and accessibility while the Contract preserves only coarse states. The executing agent then invents discarded semantics and a broad UI check may pass without proving them.

The smallest fail-closed invariant is that every applicable, independently decided Control field survives as one Source-backed Control Claim and protected product semantic. The existing `controls` array, Source-target index, semantic projection, Authority Revision and Assertions already provide the lifecycle and proof boundary, so additive optional Control fields close this path with less authoring/runtime/state/recovery cost than a `uiux_delivery` block or per-surface state machine. Empty fields create no Claims and legacy Contracts remain valid.

Combined design-and-implementation work likewise reuses ordinary Outcomes, Stages and protected revision. Design Outcomes may author candidates before a selected target exists, but candidate/planned artifacts authorize no fidelity Claim. Selection first becomes real Source plus owning registry/target input; after Authority Lock its adoption is a protected revision that returns to rolling implementation. This keeps one Contract, one Active Authority and one Final Gate while preventing a planned-target bypass.

## Why The Generation Engine Stays External And Commissioning Remains Thin

The page-level authority model can consume rich design resources without recreating mature generation workflows owned by Open Design/Product Design, Figma, image-generation, prototype and human design systems. A local prompt/template fork, required Resource Pack, validator or provider registry would duplicate upstream logic, drift from live capabilities and still provide no implementation or acceptance authority.

Live Open Design 0.15.1 research established two thin adapters. MCP exposes design systems as `od://design-systems/<id>/DESIGN.md` resources and accepts `create_project.designSystem`, but has no creation tool; therefore `design-system-authoring` feature-detects future MCP lifecycle support and otherwise uses the official same-daemon generation/revision/accept API. It is explicit-only because cold-start visual direction is a user-owned product choice. Candidate, selection and adoption stay separate; project `DESIGN.md`/token/Context remain canonical and provider identity is synchronization only.

`design-resource-authoring` closes the scoped commissioning gap. Style-bearing work requires configured authority and verified provider binding; non-fidelity structure/flow/state work does not. Candidate implications remain task-local until selection, then accepted decisions are reconciled into the initial proposal once. This one-time writeback removes a manual handoff without allowing continuous proposal drift or mutation of Source Plans, Context, `DESIGN.md`, code or Contract.

External resources still enter as ordinary Source. Existing Source markers, Controls, Requirements, verification inputs, Bindings, Artifacts, Assertions, Checks, protected revision and Final Gate remain the only Long-Task authority/proof path. Neither adapter adds lifecycle state, a provider registry, pack schema or acceptance claim.

## Why One Contract And One Final Gate Remain

Draft Outcomes make rolling work cheaper to reason about, but they do not create separate authorities. The first successful formal Compile locks the complete Contract, including all Outcomes. Targeted verification is repair evidence for selected Checks or Outcomes and never accepts the task.

Final Gate rechecks all Global and Outcome Checks on one current snapshot. This prevents local passes, stale passes or historically compatible results from being aggregated into completion. There is always one selected delivery, one Contract Authority and one Final Gate.

## Semantic-Drift Closure Index

The anti-semantic-drift design is indexed by the following stable mechanism keys. They are sections of the one Contract and the one Evidence Kernel, not additional plans, authorities, receipts or workflow state.

- `LT-STAGE`: Source-declared ordered delivery stages group vertical Outcomes. A stage names one gate Outcome; the Outcome DAG must make that gate depend on the rest of the stage and make later stages depend on earlier gate Outcomes. Every required target is proved at the gate from its root entrypoint, and a multi-Outcome stage additionally declares cross-surface consistency evidence. Stage readiness and status are derived from existing Progress, never persisted separately.
- `LT-TARGET`: the task declares one precise target profile, its non-empty `required_target_refs`, and the execution targets that matter to it. Each required ref resolves to a product target with a runtime family and root entrypoint. A Check binds to one target and declares root or internal entry. Every Stage Gate and critical journey proves every required target; a passing Web/process route therefore cannot satisfy an unproved Native target.
- `LT-EVIDENCE`: every Assertion declares an all-of set of evidence capabilities. `presence` proves only static presence; behavioral capabilities require exactly one typed current-execution evidence record per declared capability. Records are bound to the Assertion, Check, target and artifact hashes where applicable; cross-surface records use distinct `surface_ref` values and may cover multiple surfaces inside one runtime target.
- `LT-SCENARIO`: every Check declares one atomic Given/When scenario. Runtime evidence names the executed Given states and ordered actions; a materially different success path belongs in another Check or Outcome.
- `LT-PATH`: every Outcome declares whether success and degradation paths are required, and every Check declares its journey role. A degradation, recovery or unavailable result cannot prove the Outcome Result Claim or substitute for a required success Check.
- `LT-EXTERNAL`: external confirmations declare a kind, impacted Claim refs and whether they block the selected target. Functional prerequisites must block it; production-only gates do not block a lower target. Reclassification or impact removal is protected Authority change.
- `LT-ADEQUACY`: the existing read-only Preflight/Compile kernel checks stage closure, target/runner compatibility, scenario/evidence completeness, success/degradation separation, external impacts and risk-proportional conformance coverage before Authority Lock. There is no new lifecycle Gate or reusable adequacy receipt.
- `LT-CONFORMANCE`: an independent read-only Global conformance Check is required only when weak observability combines with multiple stages or multiple required product runtime families. It uses a distinct Raw Execution, starts from a declared root product target and participates in the existing Final Gate; a simple single-stage/single-family delivery keeps the cheaper existing sensitivity path. This is veto evidence, not a second acceptance authority.
- `LT-REVISION`: removal or weakening of target, stage, path, scenario, evidence capability, external impact or conformance coverage is protected. A mechanically monotonic proof addition may auto-adopt, but every adopted revision returns to rolling implementation and invalidates affected evidence.
- `LT-TERMINAL`: terminal projections keep the existing workflow status vocabulary and additionally name the accepted target profile, target state and derived stage results. This removes ambiguous `machine_accepted` meaning without adding a second completion state machine.
- `LT-ROI`: admit a mechanism whenever its expected independent drift-prevention benefit is greater than its total Authoring, Runtime, State, Recovery, maintenance and test cost. The threshold is positive net value, not unusually high ROI; prefer one cohesive implementation when staged partial mechanisms would leave seams or cost more overall.

The evidence envelope stores bounded hashes, identifiers, changed-field names and artifact references rather than unrestricted raw payloads. Capability-specific observers remain project-owned and frozen as verifier authority; the Harness validates their declared structure, current execution, target binding and cross-record invariants but does not claim hostile-verifier attestation.

## Why Live Target-Runtime Feedback Reuses Existing Checks

A same-snapshot Gate is only as truthful as its declared Checks. When a result can pass on a proxy surface while failing in its target runtime, rereading a tracked status report during Final Gate reruns the reader, not the target. The accepting Check must therefore exercise the declared target during its current Raw Execution and derive the asserted Observation from that session. Historical reports, screenshots, binaries and logs remain review artifacts; build, install, process start or absence of fatal logs prove only those exact claims unless a product-owned sentinel or interaction is also observed.

The same Check belongs to the earliest Outcome that owns the first runnable target boundary instead of a terminal omnibus Outcome. Its declared execution target, root/internal entry mode, `input_paths`, Binding carriers, verification inputs and environment requirements bind the runtime-affecting surface. The current Goal targeted-verifies it after the first runnable slice and again before dependent work grows when accumulated relevant changes make Progress stale. Related edits are coalesced, identical Raw Executions may still deduplicate, and a full target rebuild is not required per Outcome or per edit.

This closes two distinct paths: late discovery that multiplies rework, and false acceptance from a current snapshot containing stale self-reported runtime status. The bounded runtime-family and entrypoint schema prevents a browser or internal route from silently standing in for a native/root journey. Capability-specific probes remain project-owned and are required only for the Claims that need them. Targeted results remain repair-only; the one Final Gate reruns every declared live Check on the final snapshot.

## Mechanism Admission And Cost Boundary

A mechanism is admitted or retained when it closes a concrete and otherwise insufficiently covered false-completion or delivery-drift path, establishes a testable invariant, fails closed and has expected independent drift-prevention value greater than its total Authoring, Runtime, State, Recovery, maintenance and test cost. The required ROI is positive, not exceptional. Prefer a cohesive one-time change when partial mechanisms would preserve semantic seams or create more aggregate migration and maintenance cost.

Review must identify the path, invariant, proof, overlap with existing mechanisms, the risk reopened by deletion, total cost, net benefit, fail-closed behavior and whether the proposal creates a second Authority, second plan or scheduling plane. This review is a design and code-review principle, not a matrix file, Receipt or runtime Registry.

The rule is risk-proportional. L0 local, reversible and directly testable work pays no Contract cost. L1 uses one complete Contract, rolling repair and a current-snapshot Final Gate. L2 raises proof only on affected high-risk Outcomes. Risk may rise automatically or explicitly and cannot be downgraded by the executing Agent.

Affected-test selection follows the same rule. It shortens the developer feedback loop by mapping known hot spots to focused tests, widening unmapped Long-Task runtime changes to the complete Long-Task suite, and widening shared package, dependency or unknown changes to the full suite. It is fail safe and never replaces complete CI/release gates or the workflow Final Gate.

Authority Revision and terminal guidance use the same cost rule. An adopted revision replaces declared authority, invalidates affected evidence and returns execution to the revised Rolling Frontier; it is not another completion state. Revision JSON names that no-completion effect and exact material reductions, while accepted terminal JSON and the Stop Hook name the declared-machine-authority scope. Before platform-native Goal completion, an Agent performs a veto-only Goal-to-Source conformance review. These are low-cost boundary affordances: they add no persistent revision state, native-Goal state, second Gate or positive Agent-judgment proof.

When a rolling blocker motivates revision, implementation difficulty alone cannot move a machine-verifiable requirement behind an External Confirmation or erase it. A real scope change is marked Source meaning and protected exact approval. After adoption, affected weak-observability or high-risk Outcomes pay an adversarial evidence review: the Check must reach the furthest independently failing boundary named by the Claim, provide the declared capability records, and use a causal Counterfactual or failure/input-variation record when carrier presence alone can diverge. Risk-proportional review is enforced by the existing activation kernel and Final Gate rather than a universal runtime suite.

## Current Mechanisms And False-Completion Paths

- **Material Source inventory** prevents a Source item from being omitted, rewritten or disappearing without a mapping.
- **Atomic non-Result Claim Coverage** prevents several specific requirements from collapsing into one broad Outcome Result.
- **Source AC to named Assertion semantic identity** prevents acceptance meaning from being weakened in the Contract; the same canonical resolver covers Outcome refs and `GLOBAL.<check>.<assertion>`, while Global ACs require an independently Source-backed Global Claim and cannot cross scope.
- **Shared Preflight/Compile activation-safety kernel** prevents skipping Preflight from bypassing activation rules.
- **First-Compile Authority Lock and Authority Revision** prevent Source, Contract, Controlling Context or verifier edits from washing away requirements during execution.
- **One-time execution-model checkpoint** lets the user exploit locked Authority and Final Gate protection to choose a lower-cost execution model without creating model routing or repeated pauses. It is a cost mechanism, not proof.
- **Controlling/Supporting Context classification** permits low-risk navigation/background updates during execution without discarding valid Progress while keeping explicit, verification, deployment and full-snapshot Context fail closed.
- **Executing Agent cannot approve its own weakening revision** prevents the implementer from lowering its own acceptance bar.
- **Three-way revision classification** keeps formally monotonic evidence strengthening automatic, permits existing active Check identities with unchanged runner/verifier authority to diagnose an inactive candidate whose only protected reasons are scope expansion, and keeps semantic changes, proof weakening, runner or verifier-content changes and risk changes behind the exact revision identity.
- **Exact material revision summary and rolling return** make Source/Product Claim reductions, changed semantic fields, proof reductions and external-confirmation keys visible for the approved identity, then make adoption return to implementation instead of being mistaken for delivery completion.
- **Stateless same-Contract candidate diagnosis** lets related scope discoveries accumulate in `delivery-contract.yaml` and be exercised before one approval request without creating a pending Draft authority, revision lifecycle, Progress, Receipt or acceptance result. The previous Authority remains the only active one throughout diagnosis.
- **Targeted verify is repair evidence only** prevents a local pass from being reported as whole-delivery completion; Counterfactual failure is part of the owning Check Result/Progress rather than a transient top-level Finding, so status/resume cannot recover a false `progress_passing` state.
- **Live target-runtime Check ownership** prevents a proxy pass or tracked self-report from proving a Claim that can fail independently in the target; the earliest owning Outcome executes the target in the current Check run and binds runtime-affecting inputs through existing fields.
- **Coalesced rolling runtime verification** reduces late-rework cost by using that same non-accepting Check at the first runnable boundary and after accumulated relevant input changes, without a per-Outcome rebuild rule, scheduler or new state.
- **Same-snapshot Final Gate** prevents historical pass aggregation and stale evidence reuse.
- **Stop/close rerun the Live Final Gate** prevents post-Gate Source, Context, Contract, verifier or code drift from being accepted.
- **Machine/native terminal scope isolation** makes Final Gate, Stop and close identify declared machine Authority, leaves native Goal mutation with the host and uses a veto-only Goal-to-Source conformance review before platform completion.
- **Scope escape and risk escalation** prevent work outside the declared boundary from passing under the old scope or proof level.
- **Counterfactual, Population and sensitivity proof** prevent always-true tests, sample-only claims and evidence disconnected from implementation carriers.
- **Global Counterfactual to Outcome Binding** prevents a Global Claim from being backed by an unrelated global oracle without inventing a second Global Binding model; the cost is one explicit cross-scope reference and carrier freshness dependency.
- **Exact Risk marker metadata** prevents a strong Source risk from being redirected to a weaker Fact or another Outcome; ambiguity costs a real `decision_required` pause instead of an inferred downgrade.
- **Planned Binding existence** permits truthful authoring before a new file exists, while Final Gate existence and freshness close the no-op mutation path; compile-time absence is allowed only for the declared planned lifecycle.
- **Two-layer Playwright trust** treats frozen standard test content as verifier authority and pays mutation cost only for `weak_observability`; its dedicated policy accepts Playwright's real exit-one test-failure protocol only when the entire unexpected-instance set is exactly the designated AC set, preserving fail-closed Baseline behavior without mutating every UI test.
- **Non-completing Source kind** prevents explicit “does not count as done” meaning from being weakened into an ordinary Requirement or non-goal and makes its negative sensitivity independently traceable.
- **Affected developer test routing** reduces repeated full-suite cost without lowering release proof because unknown or broad changes widen and focused results remain non-authoritative.
- **Managed source, generated copy and package asset parity** prevent source-workspace rules and consumer-installed rules from diverging.
- **Pre-Compile Design Authority readiness** prevents a material UI implementation from treating an unconfigured starter, style prose, inspiration or its own generated screenshot as an exact production target; existing Source decisions, verification inputs and external confirmations carry the result without a visual state machine.

These mappings explain existing value; they are not a runtime mechanism matrix or a second Authority.

## Trusted Results And External Pending

Machine authority has only two trustworthy outcomes: fresh evidence on the current final snapshot proves all declared requirements and ACs, or at least one item is unsatisfied, unverifiable, insufficiently evidenced, stale or externally pending and the delivery remains explicitly unfinished or qualified.

`machine_accepted_external_pending` means the machine-verifiable scope passed while external confirmation remains. It is not complete external delivery, must be reported with the pending confirmation, and is not a vague third completion state.

That qualification must remain continuous after Final Gate. Collapsing it into `last_gate_passed`, `{}`, or generic `closed` reopens a false-completion path for callers that only see status, a resumed session, the Stop Hook or close output. The accepted workflow status therefore propagates through each surface; stale Receipts lose their accepted projection, while external confirmations remain visible as current Contract declarations. Stop/close can end the machine Authority lifecycle without tracking external work, but their output cannot convert machine acceptance into complete external delivery.

Progress, status, Receipts and compiled cache are audit/recovery projections. Candidate diagnostic results are transient repair output and are never Progress or completion evidence. Source, Controlling Context, Contract, verifier, runner or workspace drift stales affected evidence. Supporting-only Context revisions may preserve scoped Progress, but every adopted protected revision invalidates derived evidence; `resume` restores current semantic state rather than a physical Turn, and historical or candidate evidence cannot be spliced into current acceptance.

## Stable Anti-Goals

- No `draft_outcomes` or `plan_items` schema fields.
- No `DraftOutcome` runtime type, Draft Outcome state, Worker, scheduler or queue.
- No Contract Draft CLI, Receipt, Authoring State or Authoring Authority.
- No persistent pending-revision Draft, standing-approval policy, candidate cache, candidate Progress or revision scheduler; repeated candidate edits live only in the existing `delivery-contract.yaml` until ordinary Compile creates one exact pending decision.
- No standalone `contract-authoring`, `draft-authoring` or draft-preparation Skill.
- No second plan, second Contract authority, top-level Contract split or targeted-verify acceptance.
- No capacity-, layer-, file-, module-, Agent- or parallelism-based Outcome splitting.
- No proactive parallel subagent dispatch, Worker graph or subagent recovery state.
- No automatic model switch, model-tier scheduler, model routing state, repeated model checkpoints or persisted checkpoint acknowledgement.
- No open-ended `platform_impact` flags, manually maintained per-platform progress, or mandatory full runtime rebuild per Outcome/edit. The only target qualification is the Contract's bounded required-target/runtime-family/root binding plus `implementation_complete`, `target_profile_usable` or `production_release_ready` at terminal projection.
- No persistent `authority_revision_in_progress`, native-Goal completion state, Goal restoration runtime or second semantic completion Gate.
- No mandatory Source Plan format and no consumer platform-history guidance.
- No restoration of SFC, Packet, Wave, Campaign, Delivery Set or model/process/Git orchestration.

## Known Limits

- The workflow cannot prove that the user declared every real requirement.
- It cannot guarantee that a model completes implementation or avoids intermediate drift.
- It cannot switch the model selected by the host or observe opaque platform-internal delegation.
- It accepts only declared, falsifiable machine authority; CI, deployment and human product acceptance remain external.
- It trusts the installed project verifier and cannot semantically inspect whether an oracle truly exercised its claimed target; current-execution target proof is therefore a Contract-authoring and verifier-quality invariant, not hostile-verifier attestation.
- Local mode trusts the installed verifier and Git metadata and is not a hostile-host security boundary.
- Complete current-snapshot verification costs time; risk-proportional routing and affected developer tests keep unnecessary cost off ordinary work without weakening release acceptance.
