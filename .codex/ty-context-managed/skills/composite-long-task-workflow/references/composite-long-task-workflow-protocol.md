# Composite Long-Task Workflow Protocol

## Expected Runtime Effect / 预期实现效果

`composite-long-task-workflow` is Tiny Context's Superpowers-backed composite long-task workflow Skill. It is not the Tiny Context Workflow Contract itself and is not an ordinary target-mode prompt generator. Its job is to combine three upstream authority inputs, Tiny Context workflow rules, project Context, official Superpowers execution methods, canonical task state and acceptance evidence into a recoverable, auditable Codex Goal workflow whose completion can be computed.

The workflow prevents long-running implementation drift across many turns, agents, slices, validators and context compactions: product-intent drift, missing Context updates, scope shrinkage, plan/implementation mismatch, incomplete AC evidence, sampled proof pretending to be full population, passing tests pretending to be acceptance, and audit completion pretending to be product completion.

## Execution Order

The fusion order is fixed:

```text
Tiny Context Workflow Contract
-> confirm three-input source authority
-> compile task-state.json
-> enter Superpowers implementation slices
-> each slice updates canonical state and evidence
-> derive local audit / matrix / verdict / progress / evidence views
-> run gates
-> final-gate computes product_goal_complete
```

## Workflow Identity

This protocol is the detailed execution contract for `composite-long-task-workflow`: a Tiny Context-owned composite workflow adapter for Superpowers-backed long-task execution. It is not the Tiny Context Workflow Contract itself, not a durable project Context file, not a business fact source, not a normal target-mode prompt generator and not an official Superpowers fork.

## Authority Model

Authority is fixed before implementation starts: Product / Architecture Source owns intent, scope and boundaries; Technical Realization Plan owns PI implementation and plan conformance; Acceptance Checklist owns AC completion semantics and proof layers; `task-state.json` is the only execution state source; `events.ndjson` is append-only; `derived/**` is generated reading output only.

## Slice Protocol

Implementation advances through coherent slices. Each slice selects related PI / AC / proof-layer gaps, performs implementation and verification work, records canonical evidence, writes and applies `slice-delta.json`, derives views and runs slice-gate. Shared provider/browser/runtime/security proof environments use epoch-gate instead of repeating the full final gate after every slice.

## Evidence Protocol

Evidence is canonical state, not prose. Every proof record enters `task-state.evidence[]` with evidence id, slice id, type, command or artifact paths, command exit code when applicable, `proves`, `does_not_prove`, freshness, redaction, reviewability / reproduction data and, for machine-verifiable layers, an `assertion_result`. Strict final completion uses EvidenceRecordV2 records bound to the current attempt, source bundle, product source hash, technical plan hash, acceptance checklist hash, git head, worktree fingerprint, command spec/run id, command line/exit code, artifact path/SHA/mtime, target AC ids, target PI ids, target proof layers, assertion status/exit code, positive assertions, negative assertions, invalid completion signals, negative evidence scan and required test ids. Evidence must be fresh, reviewable and free of secrets, raw credentials, tokens, cookies and long raw payloads.

Canonical proof layers are `code`, `api_schema`, `worker_runtime`, `data_artifact`, `integration`, `ui_browser`, `security_redaction`, `all_provider_all_runner`, `cleanup_stale_scan` and `test`; legacy aliases map `runtime -> worker_runtime`, `browser -> ui_browser`, `api -> api_schema`, `data -> data_artifact` and `security -> security_redaction`. `code` cannot complete a machine-backed AC by itself. Machine-verifiable layers are not complete from descriptions, screenshots, final cards, validator passes, matrix rows, verdict rows, evidence-index rows, final-summary text, historical `events.ndjson` complete events, auditor prose, summary-only AC proof or unregistered temporary JSON. They require current-attempt EvidenceRecordV2 plus `assertion_result.schema_version=assertion-result-v2`, `assertion_result.status=passed`, assertion exit code `0`, command exit code `0`, target AC/PI/layer coverage, passed positive and negative assertions, no invalid completion signal and reviewable artifacts. UI/browser layers also require owner surface, route/path, user action, browser/playwright/UI assertion evidence and a passed `negative_evidence_scan` with matching target proof layers and checked invalid completion signals.

The Trusted Evidence Kernel marks a machine-blocking AC `under_specified` when it lacks an assertion command, assertion artifacts, positive assertions, negative assertions, invalid completion signals, required UI/browser proof, concrete assertion result production or any non-generated final evidence path. Under-specified ACs block related PIs and force `product_goal_complete=false`. AC-010 / final-gate summary proof only summarizes fresh current EvidenceRecordV2 proof for the other ACs; it cannot bootstrap missing, failed, stale or under-specified ACs and is invalidated with `final_gate_cannot_bootstrap_from_summary_only` when it tries.

Strict V2 source fields are canonical. Product Source must carry Scope Fit, owner, primary capability and assertion policy fields. PI items must carry owner boundary, primary capability path, trigger/state/observable contracts, assertion support, required assertion commands and invalid implementation shortcuts. ACs must carry assertion command, artifacts, positive/negative assertions, machine-blocking flag, invalid completion signals and assertion-result requirement. Unknown, duplicate, table or missing canonical fields block compile; the workflow must not generate, infer, rewrite or repair the Technical Realization Plan or Acceptance Checklist.

## Derived Views

`derived/**` contains generated reading views only: local audit, plan-conformance matrix, final acceptance verdict, progress ledger, evidence index (`md` and `json`), context alignment and final summary. Matrix, verdict and evidence-index views may summarize `assertion_status`, blocking assertion failures and negative evidence findings, but they never replace assertion execution and never rewrite Product / Architecture Source, Technical Realization Plan, Acceptance Checklist or `task-state.json`.

## Gates

The runtime gate sequence is slice-gate for one slice, epoch-gate for shared proof environments and final-gate for product completion. Plan conformance is judged against the Technical Realization Plan, acceptance evidence is judged against the Acceptance Checklist, and final-gate is the only path that computes `product_goal_complete`.

## Required Bootstrap

Every executor first reads `execution-binding.md`, `workflow-protocol.md`, the three input files, `task-state.json` and current `derived/**` views. If state is missing or stale, initialize or compile through `ty-context composite-long-task init <workdir>` and `ty-context composite-long-task compile <workdir>` before choosing the next implementation slice.

## Tiny Context Contract Layer

The workflow uses Context Priority Ladder, Context Delta, Source-to-Context Coverage, Context-to-Implementation Binding, Contract Conformance and Context drift check as the durable-fact and implementation-binding layer. These rules constrain the composite workflow, but the composite workflow does not replace or register itself as the Tiny Context Workflow Contract.

## Superpowers Execution Binding

Superpowers remains the execution layer: prefer `superpowers:subagent-driven-development` when subagents are available, use `superpowers:executing-plans` otherwise, use `superpowers:test-driven-development` for behavior gaps and run `superpowers:verification-before-completion` before completion claims. Tiny Context may wrap Superpowers with authority, conformance and acceptance gates, but must not redefine, duplicate or fork official Superpowers mechanics.

## Final Gate Protocol

Final completion always runs through the Trusted Evidence Kernel. Superpowers verification, validators, auditor checks and generated views are useful execution checks, but they are not proof authority. The AC Evidence Assertion Gate and Negative Evidence Scan Gate are enforced inside the kernel, not by trusting generated matrix or verdict text. The final gate itself runs in fixed order: load the three inputs, recompute source hashes, load task state, load current attempt, load command-run records, load registered EvidenceRecords, discard stale evidence, run contradiction scan, recompute every AC, recompute every PI, recompute `acceptance_target_status`, recompute `product_goal_complete`, regenerate `derived/**` and append an event.

The final gate recomputes from current source hashes, current attempt, required command specs/runs, registered EvidenceRecordV2 records, contradiction scan, Harness Drift Lock and protected baseline state. It ignores stale passed artifacts, historical complete events, stale derived complete views, validator passes and AC summary-only proof as proof. Newer failed commands, Playwright `.last-run.json`, `test-results/**/error-context.md`, JUnit/JSON reporter failures, negative evidence artifacts, owner DOM forbidden states, task-state false/partial values and derived/state mismatch block completion for the affected AC/layer. If historical completion conflicts with current recompute, report `Historical stale completion event detected and ignored.` and `Current recomputed product_goal_complete=false.`

Harness Drift Lock: `product_task` is blocked when the current attempt changed Playwright specs, tests, assertion generators, AC010 helpers, evidence writers, final-gate, validator, derive, task-state reducer, this workflow Skill/protocol or related Makefile/package test targets. The output must include `harness_drift_detected`, `acceptance_target_status=blocked`, `product_goal_complete=false` and `本轮修改了验收工具链或测试本身，不能用被修改后的验收证明同一轮产品完成。请拆成独立 harness_task。` A `harness_task` must include adversarial fixtures with expected final-gate outcomes for stale evidence, historical complete, derived contradiction, AC010 summary-only, target mismatch, API-only-for-UI, negative evidence after pass, source hash mismatch, dirty worktree mismatch, missing assertion_result, test weakening and one happy path; it never proves product completion. `protected-harness-baseline.json` blocks product-task changes to protected harness surfaces and requires a baseline reason plus fixtures for harness-task changes.

## Completion State Machine

`audit_task_complete` means the workflow or audit pass finished. `acceptance_target_status` is the acceptance verdict. `product_goal_complete` is computed only by final-gate and is the only implementation/execution Goal completion condition. A read-only audit goal may finish at audit completion only while saying `Audit workflow completed; acceptance target not complete.` for non-accepted targets.

## Forbidden Shortcuts

Tests alone do not prove plan conformance. Superpowers review does not prove AC acceptance. Sample evidence does not prove full population unless the AC allows it. Browser screenshots, final cards, validator passes, matrix/verdict rows and prose evidence are auxiliary only for machine-verifiable ACs unless a passed assertion report is bound to the target AC/layer. Derived files, local audit, validator output and auditor reports cannot rewrite Product / Plan / Checklist. Local audit cannot mark product completion. Agents must not handwrite `product_goal_complete`.

## Hallucination Guard

The protocol must prevent false fusion: do not interpret the composite workflow as the Tiny Context Workflow Contract itself; do not register `workflow-protocol.md` in `project_context/context.toml`; do not treat it as a business fact source; do not use local audit, tests, Superpowers review, sampled evidence, screenshots, final cards, matrix/verdict rows, validator passes or final-gate failure as product completion; do not claim full alignment with unresolved Source-to-Context Coverage or Context-to-Implementation Binding gaps; and do not call a Codex implementation Goal complete before final-gate passes.

## Blocker Protocol

Maximize autonomous progress with repository tools, local app/browser sessions, CLI auth, credential helpers and authorized elevation. Stop only for locally unsatisfiable blockers such as MFA, missing permission, unavailable credentials, external approval or legal/system limits, and return the minimal user action list plus the next agent step.

## 1. Materials Entering Agent Context

The executor must see and fuse these materials together:

```text
1. Tiny Context Workflow Contract
   - Context Priority Ladder
   - Context Delta
   - Source-to-Context Coverage
   - Context-to-Implementation Binding
   - Contract Conformance
   - Context drift check

2. Project durable Context
   - project_context/global.md
   - project_context/architecture.md
   - project_context/context.toml
   - matching project_context/areas/**/*
   - DESIGN.md when applicable

3. Three long-task authority inputs
   - Product / Architecture Source
   - Technical Realization Plan
   - Acceptance Checklist

4. Composite workflow protocol artifacts
   - workflow-protocol.md
   - execution-binding.md
   - goal-objective.txt

5. Official Superpowers execution layer
   - superpowers:subagent-driven-development
   - superpowers:executing-plans
   - superpowers:test-driven-development
   - superpowers:verification-before-completion

6. State and audit kernel
   - task-state.json
   - events.ndjson
   - derived/**
   - task-state.evidence[]
   - slice / epoch / final gates
```

The fusion order is not free-form. The executor first applies the Tiny Context Workflow Contract, then confirms the three-input source authority, then compiles state, then uses Superpowers implementation slices, then updates canonical state/evidence, derives reading views, runs gates and lets final-gate compute completion.

## 2. Phase One: Workflow Contract First

After receiving a Goal, the executor must not start with code. It first applies Tiny Context workflow rules:

```text
1. Read project_context/global.md, architecture.md, context.toml and relevant area/role Context.
2. Decide Product Context Delta and Technical Context Delta.
3. If either is required, update the smallest owning Context before implementation.
4. Build Source-to-Context Coverage for the three inputs:
   - whether each source item is covered by existing Context;
   - whether Context must be added or updated;
   - whether it is task-local only;
   - whether it is explicitly out of scope;
   - whether a user decision is needed.
5. For high-risk implementation, build Context-to-Implementation Binding:
   - which surfaces each Context fact must reach;
   - expected implementation paths;
   - forbidden shortcuts;
   - verification paths.
```

This phase answers whether the task changes durable facts, whether Context supports implementation, which product/architecture/API/schema/state/surface/verification facts must be written first, and which concrete paths and verification entries the implementation must bind to.

If Source-to-Context Coverage still has `new_context_required`, `under_scoped` or `needs_user_decision`, do not claim the plan was fully implemented. If Context-to-Implementation Binding still has `missing`, `partial`, `blocked` or `contradicted_by_current_state`, do not claim Context-to-code alignment.

## 3. Phase Two: Three Inputs Lock Task Authority

The authority relationship is fixed:

```text
Product / Architecture Source
= intent, scope, boundaries, owner surface, delivery scope, full population / sample semantics.

Technical Realization Plan
= PI items, implementation paths, API/schema, state machine, worker/runtime, UI/IA, required tests, plan conformance.

Acceptance Checklist
= AC items, completion semantics, required proof layers, invalid evidence, fail conditions, acceptance verdict.
```

`task-state.json` is compiled from these inputs. `derived/**`, local audit, matrix, verdict, validator output and auditor reports cannot rewrite them. Project Context also preserves this authority model: source owns intent/scope/boundaries, plan owns executable blueprint and plan conformance, checklist owns AC completion semantics and proof layers.

## 4. Phase Three: Compile The State Kernel

When initializing or resuming a task, the executor confirms this workdir shape:

```text
tmp/ty-context/plan-acceptance/<plan-slug>/
  product-architecture-source.md
  technical-realization-plan.md
  acceptance-checklist.md
  workflow-protocol.md
  execution-binding.md
  task-state.json
  events.ndjson
  derived/**
```

If `task-state.json` is absent or uncompiled, use the public command path:

```bash
ty-context composite-long-task init <workdir>
ty-context composite-long-task compile <workdir>
```

Legacy/internal compatibility may exist as an equivalent implementation namespace only:

```bash
ty-context superpowers init <workdir>
ty-context superpowers compile <workdir>
```

The compiled state forms:

```text
Plan graph:
  PI -> AC
  AC -> required proof layers
  delivery scope
  sample / full population boundary
  owner surfaces
  forbidden shortcuts

State kernel:
  task-state.json = only execution state source
  events.ndjson = append-only event log
  derived/** = generated reading views only
```

The goal of this phase is to turn natural-language plans into a state-machine-traceable task graph.

## 5. Phase Four: Superpowers Enters Implementation

Superpowers organizes implementation execution:

```text
- Prefer superpowers:subagent-driven-development when subagents are available.
- Use superpowers:executing-plans when subagents are unavailable or insufficient.
- Use superpowers:test-driven-development for behavior changes.
- Use superpowers:verification-before-completion before any completion claim.
```

Tiny Context does not copy, fork or override official Superpowers execution mechanics. It wraps them with:

```text
source authority gate
plan conformance gate
acceptance evidence gate
state consistency gate
final completion gate
```

Superpowers manages how to move implementation forward efficiently. Tiny Context checks whether implementation drifted from the source, plan and ACs.

## 6. Phase Five: What An Implementation Slice Is

An implementation slice is not an arbitrary file chunk, page chunk or API chunk. It is the smallest coherent execution unit that closes related gaps.

A slice should:

```text
1. Bind 2-4 strongly related missing layers.
2. Usually share one or more of:
   - same AC;
   - same PI;
   - same runtime scenario;
   - same owner surface;
   - same proof environment;
   - same verification path group.
3. Advance both implementation and evidence.
4. End by updating task-state and reducing explicit plan/AC/proof gaps.
```

A slice usually:

```text
- modifies implementation code;
- modifies API/schema/state/worker/runtime/UI/IA when required;
- runs required tests or smoke checks;
- captures evidence;
- writes slice-delta.json;
- applies the slice delta;
- derives views;
- runs slice-gate.
```

A slice cannot only say "some work was done." Its `progress_value` must explain which gap it closed and why that reduces later rework.

## 7. Phase Six: Slice Delta Updates State

After every slice, progress must enter `task-state.json` through structured state update. Do not handwrite derived results and do not report progress only in chat.

`slice-delta.json` must express at least:

```text
slice_id
slice_goal
touched_plan_items
touched_acs
code_changes
evidence_records
closed_layers
remaining_layers
blockers
cleanup_assertions
progress_value
```

Each evidence record enters `task-state.evidence[]` and includes:

```text
evidence_id
slice_id
type
command
artifact_paths
proves
does_not_prove
freshness
redaction
reviewability / reproduction_steps
assertion_result for machine-verifiable layers
negative_evidence_scan with target_proof_layers where invalid completion signals must be ruled out
```

`proves` and `does_not_prove` are both required because evidence must say what it proves and what it does not prove. This prevents samples, passing tests, screenshots, mocks or local audit text from being reused as full acceptance.

## 8. Phase Seven: Local Audit And Derived Views

After state changes, run:

```bash
ty-context composite-long-task derive <workdir>
```

Legacy/internal compatibility may exist as:

```bash
ty-context superpowers derive <workdir>
```

The generated views are:

```text
derived/local-audit.md
derived/plan-conformance-matrix.md
derived/final-acceptance-verdict.md
derived/progress-ledger.md
derived/evidence-index.json
derived/evidence-index.md
derived/context-alignment.md
derived/final-summary.md
```

Their roles:

```text
local-audit.md
= recovery view for future sessions or subagents.

plan-conformance-matrix.md
= whether PIs were implemented, whether evidence maps correctly, and whether implementation drifted from the Technical Plan.

final-acceptance-verdict.md
= whether ACs satisfy required proof layers, what is missing, and what cannot be accepted.

progress-ledger.md
= separate progress for AC acceptance, engineering implementation, runtime/proof, system capability, sample, real object, full population and workflow overhead.

evidence-index.md
= index from evidence_id to proved object, artifact, command and does_not_prove boundary.

context-alignment.md
= alignment state for Context Delta, Source-to-Context Coverage and Context-to-Implementation Binding.

final-summary.md
= whether completion is currently possible, why not, and what comes next.
```

All `derived/**` files are generated views, not authority. They must not be hand-edited as completion evidence. Local audit is not Context, not quality proof and not a global task manager; it is only a recovery and audit view.

## 9. Phase Eight: Slice Gate And Epoch Gate

After each slice, run:

```bash
ty-context composite-long-task slice-gate <workdir> --slice <slice-id>
```

Slice gate checks:

```text
- whether the slice closed a real PI/AC/proof-layer gap;
- whether fresh reviewable evidence exists;
- whether required machine-verifiable proof layers have passed assertion results;
- whether negative evidence findings invalidate the layer or AC;
- whether evidence entered task-state.evidence[];
- whether closed_layers are actually proved;
- whether remaining_layers were not falsely closed;
- whether blockers are recorded truthfully;
- whether derived views match task-state.
```

When multiple slices reuse one provider/browser/runtime/security proof environment, run:

```bash
ty-context composite-long-task epoch-gate <workdir> --epoch <epoch-id>
```

Epoch gate validates the shared proof environment in batch, avoids running full final gate after every slice, and prevents shared runtime/browser/provider evidence from being reused after contamination or staleness.

## 10. Phase Nine: Plan Conformance Gate

Plan conformance is judged by the Technical Realization Plan, not by the executor's summary.

Each PI answers:

```text
- Was the PI actually implemented?
- Do implementation paths match implementation_paths?
- Are owner_surfaces correct?
- Were forbidden_surfaces avoided?
- Did API/schema/state/runtime/data/UI/IA land according to the Plan?
- Were required_tests executed or blocked with reason?
- Can related_acs be traced through evidence?
```

`derived/plan-conformance-matrix.md` is only a view. The authoritative state is `task-state.json` plus evidence records.

Forbidden substitutions:

```text
- "code changed" does not prove plan conformance;
- "tests passed" does not prove PI completion;
- "Superpowers review passed" does not prove Plan Conformance Gate;
- convenient current-code paths do not override the Technical Realization Plan.
```

## 11. Phase Ten: Acceptance Evidence Gate

AC completion is decided by the Acceptance Checklist. Every AC must satisfy its declared `required_proof_layers`.

Proof layers may include:

```text
code
api_schema
worker_runtime
data_artifact
ui_browser
security_redaction
all_provider_all_runner
cleanup_stale_scan
test
```

AC completion requires:

```text
1. Every required proof layer has fresh reviewable evidence.
2. evidence.proves explicitly covers that layer.
3. evidence.does_not_prove does not expose a scope substitution problem.
4. Machine-verifiable required layers have assertion_result.status=passed and exit code 0.
5. Positive and negative assertions passed for the target AC/layer.
6. Negative evidence scan has no forbidden owner-surface state.
7. No missing required layers.
8. No material drift.
9. No stale artifact.
10. No raw secret/token/cookie/payload leak.
11. No sibling surface / sample object / mock substitution for owner surface or full population.
12. When full_population_required=true, sample evidence cannot replace full-population evidence.
```

This gate enables an external reviewer to follow the evidence chain. Auditor subagents may find gaps but are not proof sources.

Invalid evidence for UI/browser AC completion includes screenshot-only proof, component screenshots, storybook pages, viewmodels, mocks, unit-only proof, API-only proof, diagnostic pages, final cards, matrix/verdict rows, validator passes and prose summaries. Forbidden final owner-surface states such as `未验证`, `不可用`, `暂不可用` or `页面无明显变化` invalidate the relevant AC/layer.

## 12. Phase Eleven: Delivery Scope And Full Population Stay Separate

The workflow always distinguishes:

```text
system_capability_build
representative_sample_validation
full_population_operation
mixed_scope_requires_boundary
out_of_scope_backlog
```

Typical forbidden claims:

```text
- framework complete does not mean all real objects complete;
- several objects succeeded does not mean automation capability complete;
- sample provider succeeded does not mean all-provider complete;
- UI screenshot exists does not mean owner surface primary path is closed;
- final card, matrix, verdict or validator pass does not mean a machine-verifiable AC has assertion-backed evidence;
- tests passed does not mean AC accepted;
- local audit passed does not mean product_goal_complete.
```

If Product / Plan / Checklist disagree on delivery scope, state records:

```text
scope_conflict_requires_decision
```

Completion is blocked until the source conflict is resolved. Validators inspect explicit fields; they do not infer business scope from prose.

## 13. Phase Twelve: Fixed Final Gate Order

Before final completion, the kernel order is fixed:

```text
1. load product-architecture-source.md, technical-realization-plan.md, acceptance-checklist.md
2. recompute source hashes
3. load task-state.json
4. load current_attempt
5. load command-run records
6. load registered EvidenceRecordV2 records
7. discard stale evidence
8. contradiction scan
9. recompute every AC
10. recompute every PI
11. recompute acceptance_target_status
12. recompute product_goal_complete
13. regenerate derived/**
14. append event
```

Legacy/internal compatibility may exist as:

```text
ty-context superpowers final-gate <workdir>
```

Only final-gate computes:

```text
product_goal_complete=true
```

Implementation / execution Goals complete only after that computed state.

## 14. Completion Semantics

The workflow distinguishes:

```text
audit_task_complete
= whether the audit/reporting task finished.

acceptance_target_status
= AC acceptance target state.

product_goal_complete
= whether implementation/execution is truly complete.
```

Rules:

```text
1. Do not handwrite product_goal_complete.
2. product_goal_complete is computed only by final-gate.
3. audit_task_complete=true is not product completion.
4. If acceptance_target_status is not complete, do not say Goal achieved.
5. A read-only audit task may end, but must say:
   Audit workflow completed; acceptance target not complete.
6. Implementation / execution Goal mode can call update_goal complete only when product_goal_complete=true.
```

This must stay visible in Skill and Goal objective because Codex Goal mode can otherwise confuse "audit workflow ended" with "product target accepted."

## 15. Blocker Strategy

The executor maximizes autonomous progress:

```text
- reuse local app login sessions;
- reuse browser sessions;
- reuse CLI auth;
- reuse OS credential helpers;
- try authorized sudo / gsudo / administrator elevation first;
- solve locally discoverable command/page/script/config/test/log issues before pausing.
```

Only these are user blockers:

```text
- MFA;
- account not logged in and cannot self-service login;
- insufficient permissions;
- external approval;
- payment or paid-source authorization;
- platform policy or legal restriction;
- credentials or decisions that only the user can supply.
```

When reporting a blocker, include the minimal user action:

```text
- exact page/system/command to open;
- exact field or value location;
- sensitive values not to send;
- what the agent will do next;
- why completion is currently impossible.
```

## 16. Final Expected Effect

The result is a recoverable long-running loop:

```text
Tiny Context Workflow Contract
  -> Context Delta
  -> Context update or confirmation
  -> Source-to-Context Coverage
  -> Context-to-Implementation Binding

Three inputs
  -> lock product intent, technical plan and acceptance semantics
  -> compile PI/AC/proof graph

Superpowers
  -> implementation slices
  -> multi-agent / TDD / executing-plans implementation

Each slice
  -> code/API/runtime/UI changes
  -> evidence capture
  -> slice-delta update
  -> apply-slice-delta
  -> derive audit / matrix / verdict / progress / evidence views
  -> slice-gate / epoch-gate

Final
  -> Plan Conformance Gate
  -> Acceptance Evidence Gate
  -> External Reviewer / stale-overclaim scan
  -> final-gate
  -> product_goal_complete=true before Codex Goal completion
```

One-sentence definition:

```text
The expected runtime effect of the composite long-task workflow is to make a Codex agent fuse Tiny Context fact/process constraints, three upstream task authorities, Superpowers long-task execution and a task-state evidence state machine in one context; execution goes Context first, then Plan, then Superpowers slices, and completion is judged by state-backed gates for plan conformance, AC evidence and product_goal_complete so long tasks do not drift in implementation, acceptance or completion claims.
```

## 17. Forbidden Wrong Fusion / 不允许的错误融合

The workflow must explicitly prevent these interpretations:

```text
Do not interpret the composite long-task workflow as the Tiny Context Workflow Contract itself.
Do not register workflow-protocol.md in project_context/context.toml.
Do not treat workflow-protocol.md as a business fact source.
Do not let derived/** rewrite Product / Plan / Checklist.
Do not treat local audit as quality proof.
Do not treat Superpowers review as plan conformance or AC acceptance.
Do not treat sample evidence as full-population proof.
Do not claim full implementation when Context Delta is required but Context is not updated.
Do not claim full alignment while Source-to-Context Coverage / Context-to-Implementation Binding has unresolved gaps.
Do not handwrite product_goal_complete.
Do not call update_goal complete before final-gate passes.
```
