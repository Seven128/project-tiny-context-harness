---
context_role: contract
read_policy: default
---
# Harness Workflow Contract

## Role

This contract defines the default prompt-level workflow and the explicit handoff to ordinary or Long-Task Workflow Skills. Read it before changing Context Priority, `Context Delta`, task routing, ordinary long-task artifacts, Long-Task Workflow authority or Contract Conformance.

Workflow Contract is a first-class Tiny Context capability alongside Minimal Context. It is deliberately lightweight: it controls authority and order of thought, not a mandatory plan file or workflow state machine.

## Default Workflow

When no explicit long-task Skill or active Contract V3 binding applies, the fixed behavior is:

1. Read `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml` and the minimum role Context selected by graph triggers.
2. For product-surface or information-placement work, perform the lightweight surface-positioning check before narrowing to code.
3. For Context authoring or migration, perform role placement before choosing an area or role Context.
4. Decide the single durable-fact outcome `Context Delta: none|required`.
5. If required, update the owning Context before implementation.
6. Use the agent/platform's internal planning to keep goal, boundaries, controlling Context, likely implementation surfaces and verification clear.
7. Implement and run project-owned focused or broad verification in proportion to risk.
8. Perform Contract Conformance and Context drift check.
9. Hand off implementation, verification, Context status and blockers without creating a result document.

The default workflow has no required `plan.md`, Task Contract file, Source-to-Context table, Context-to-Implementation table, matrix, verdict, evidence ledger or implementation-summary document. An agent may create an arbitrary scratch file when useful, but it has no fixed name/schema, no authority and no completion effect.

## Context Priority And Reading

- Default reads are `global.md`, `architecture.md` and `context.toml`; area, contract, verification, decision-rationale and implementation-index Context are selected from graph triggers and dependencies.
- Do not read the entire Context tree by default.
- `project_context/**` controls durable intent; code controls current implementation state; project tests/CI/smoke/browser/human acceptance control quality evidence.
- Existing `plan.md` files are retained as ordinary user files. The default workflow does not delete, migrate or treat them as authority.
- Foundation, contract, decision-rationale, architecture, verification and deployment Context interpret current-code convenience before implementation choices are made.

## Context Delta

`Context Delta: none|required` is the only durable-fact decision.

`required` applies when work changes any durable product capability, surface/page responsibility, ownership, architecture boundary, API/schema/event/data meaning, state/recovery semantics, dependency direction, security boundary or repeatable verification/deployment path. Update enough owning Context to guide implementation, then implement.

`none` applies when existing Context is sufficient and work is a local bug fix, style change, local refactor, test repair or other engineering change that preserves durable semantics.

Do not add Product, Architecture, Rationale or Verification delta fields. Internal reasoning may distinguish those concerns, but the result converges to the one Context Delta.

For high-risk work the agent internally identifies the controlling `Architecture Context Hit`, whether durable rationale is existing/required/none, and `Modularity Check: none|required|exception`. These are reasoning aids, not required artifacts or validators.

## External Source Inputs

For a product, architecture, technical or acceptance source, the agent must evaluate every material constraint before implementation:

- already covered by existing Context;
- requires an owning Context update;
- task-local only;
- explicitly outside the requested scope; or
- requires a genuine user decision.

This Source-to-Context judgment is required, but no Markdown table or fixed file is required. Current code shape cannot downgrade a durable source constraint to task-local. Unresolved mutually exclusive product/scope/architecture meaning must be reported; locally resolvable implementation, ordering, Git, test and recovery choices remain agent work.

Final Conformance asks whether controlling Context actually reached the correct modules, surfaces, APIs, state machines and verification paths, whether only a convenient local component was changed instead of the owning responsibility, and whether any forbidden shortcut was used. This replaces the former Context-to-Implementation Markdown table.

## Routing And Activation

Routing order is:

1. An active Contract V3 binding in the current worktree resumes that strict Slice.
2. Explicit `/prepare-composite-long-task` creates or resumes a multi-SFC Campaign.
3. Explicit `/composite-long-task-workflow` executes an already complete three-input SFC.
4. Explicit `/normal-long-task` prepares ordinary long-task acceptance artifacts and does not execute.
5. Otherwise use the default Workflow Contract, even for a long task.

Do not auto-detect task duration, file count or complexity; do not auto-trigger Composite, create Campaigns or add a routing state machine. Explicit invocation overrides default planning semantics.

## Ordinary Long-Task Boundary

`/normal-long-task` only externalizes an acceptance target for a user-provided plan-like source:

- preserve the original source;
- produce one complete acceptance checklist, reusing an explicit source checklist when complete;
- optionally produce a compact target-mode prompt;
- create a Local Audit only when the user explicitly asks for recovery/progress persistence or target-mode recovery requires it.

A Local Audit records current progress, commands run, failure reasons and remaining blockers only. It is not Context, product proof, a second plan, a final verdict or a completion authority.

The Skill does not create a Plan Conformance Matrix, Final Acceptance Verdict, separate test-requirements file or second execution plan by default. Test requirements belong in the checklist. Ordinary long-task completion remains an evidence judgment using current agent evidence, project tests, CI and user acceptance; use Composite when strict machine completion authority is required.

## Long-Task Workflow Inheritance And Replacement

When Composite is active, it inherits:

- Context Priority and graph-directed reading;
- the one `Context Delta`;
- context-first durable updates;
- final Context drift check.

It replaces:

- agent task planning with Source Coverage, Scope Fit, SFC Packet and bounded execution attempts;
- an internal execution view of the three Contract V3 inputs;
- informal implementation mapping with Contract V3 Implementation Bindings and Change Envelope;
- execution status with Campaign, worker observation, worktree and Receipt identities;
- informal acceptance with AC, Proof, Spec and Counterfactual;
- prose completion with Slice, Wave and Campaign gates.

Composite must not create or consume a second `plan.md`, Task Contract, Context-to-Implementation Markdown table, Plan Conformance Matrix, Final Verdict, ordinary Local Audit or hand-written complete state.

## Campaign Context Alignment

Before Scope Fit, the campaign aligns durable product/domain ownership, surface responsibility, architecture/API/schema/state/recovery semantics, cross-module dependencies and global verification constraints.

Campaign Source Coverage V2 carries Context resolution directly; V1 remains V4-audit-only:

- `existing` and `updated` require one or more registered `context_refs`;
- `updated` requires the referenced Context bytes to be current;
- `task_local` requires a specific reason;
- out-of-scope and decision-required remain Source dispositions;
- Packet Requirement `context_refs` or `task_local_reason` must match Source Coverage.

The campaign freezes a Context baseline containing graph topology and selected file hashes. The relevant set is `context.toml`, `global.md`, `architecture.md`, Source Coverage refs, Packet Requirement refs and graph-transitive dependencies.

Before the first execution worker starts, unchanged baseline means the Slice reads only its referenced Context and three inputs. Changed Context is reread and classified. A change affecting Scope, owner, architecture or acceptance invalidates the Packet and returns the SFC to Authoring; an unrelated change may continue. After the first successful compile, Context, three inputs, Oracle, verifier and workdir are frozen. A later required Context update invalidates the contract and requires Context update, Packet reauthoring and recompilation.

Contract V3 defaults to `context_snapshot_mode: referenced`; `full` is explicit for security-sensitive or global migration work. The compiled identity freezes Context Graph topology plus selected file hashes so unrelated Context changes do not invalidate every SFC.

## Scope Fit And Scheduling

Scope Fit preserves the existing maximal-coherent rule:

1. inventory every delivery-bearing control/capability Source Unit;
2. group by independent acceptance outcome;
3. merge shared owner/state/data chains;
4. split only at a legal semantic, authority, rollout, decision or evidenced capacity boundary;
5. verify every SFC can produce complete three inputs;
6. reject over-splitting.

File/layer boundaries, agent count, expected duration and parallelism are not split reasons. SFC IDs are stable and never renumbered. Capacity splitting requires observed generation/output failure. Starting the first execution worker freezes the graph; scheduling cannot revise SFC scope.

The conflict analyzer and scheduler run after Scope Fit. Parallel placement requires positive independence evidence; unknown conflict is serial.

## Slice Change Envelope

Every executable SFC has a machine-enforced Change Envelope:

- `file` and `path_glob` bindings generate allowed write paths;
- `symbol`, `schema`, `route` and `runtime_capability` bindings also declare their carrier file paths;
- lockfiles, generated files and other supporting paths are explicit;
- campaign/Context authority paths remain forbidden to SFC execution and repair workers;
- the receipt compares every `base..head` changed path and rejects undeclared changes;
- repair uses the union of affected Slice envelopes and never receives unlimited write scope.

A passing test suite cannot authorize an out-of-envelope change.

## Campaign Transactions And Recovery

One foreground scheduler may mutate a Campaign. Its `campaign-lock-v1` records PID, process-start identity, operation id and start time. A live matching owner rejects another run; a missing or identity-mismatched process makes the lock stale. There is no distributed lease, heartbeat, persistent host or controller takeover.

Campaign mutations retain optimistic generations, atomic write-and-rename and append-only events. Worktree create/remove, worker spawn/exit, Integration update, target delivery and accepted transaction persist bounded intent/result state around their external effects. Restart reconciliation uses fixed worktree paths, Git heads, final results and Receipts. A recorded running child whose process no longer exists becomes interrupted; an already accepted Slice advances mechanically, otherwise a fresh bounded attempt resumes the durable stage in the same worktree. Recovery never resumes a physical session.

## Git Ownership

Campaign owns its managed worktrees and one Integration branch, not the user's primary worktree.

- Dirty primary-worktree input is captured through a temporary index and `commit-tree` checkpoint ref under `refs/ty-context/checkpoints/<campaign>/<timestamp>`; it never stages, commits, clears or moves the user's index/worktree and still performs secret scanning.
- Integration uses the sole `tyctx/campaign/<id>/integration` branch. Current-wave SFC and repair worktrees are detached, use fixed managed paths and create no branches. The hard active budget is one Integration plus at most four SFC plus one repair worktree; SFC attempts reuse their path and the Campaign has one reusable repair path.
- Target resynchronization/replay or rebase, full Target Snapshot revalidation, fast-forward/push or protected-branch PR handling never requires checking out or rebasing the primary worktree. Finalization resolves the fetched upstream when configured, otherwise the local Target ref; exact commit/tree identity converges before any checkout/PR decision, remote delivery is non-force fast-forward with post-fetch identity verification, and PR reuse is limited to a matching open base/head.
- `preserve_primary_worktree` defaults to `true`; `auto_push` and protected-branch mode are explicit campaign policy.

Explicit `/prepare-composite-long-task` continues to authorize full execution and target integration within these boundaries.

## Foreground Codex Exec Convergence And Routing

Campaign V6 uses execution engine `codex-exec-v1`. A Pure Planner computes ready frontier, conflicts, Wave and next mechanical stage without Git/process/write effects. One foreground scheduler starts direct bounded ephemeral `codex exec` children for Packet authoring, SFC execution and Integration repair, awaits every sibling and owns all state, Git, Gate and acceptance decisions. It never daemonizes, starts AppServer or leaves a child running after exit.

Workers use safe argv arrays, stdin prompts, explicit cwd/profile/sandbox, bounded JSONL/stdout/stderr, timeouts and targeted child-tree termination. Authoring is read-only with the controller profile; execution/repair is workspace-write with the routed profile. Packet plus three Contract V3 inputs and Change Envelope is the authority handoff. PID, exit code and output text are observations only and cannot produce acceptance.

The YAML policy routes exact `gpt-5.6-sol` `xhigh`, `max` and `ultra` to `gpt-5.6-sol / medium`. High-and-below, non-Sol, unknown, missing/invalid policy and unavailable target pass through. A target that Codex CLI explicitly reports unavailable permits exactly one recorded controller-profile passthrough retry; other failures do not guess. Campaign freezes engine id/CLI version, policy id/hash, profiles, command-template version, parallelism and sandbox policy.

Authoring allows one initial plus two fresh repair attempts. SFC execution allows one initial plus three fresh repair attempts per run generation in the same detached worktree. Integration repair is serial in one reusable detached worktree. SIGINT/SIGTERM/`interrupt` stops dispatch and terminates only known child process trees before the foreground scheduler returns. Recovery starts from durable stage, never a physical Thread/Goal/Turn.

## Verification And Completion

Slice execution is: compile; free implementation; project-focused tests; optional targeted `verify`; commit and clean; Slice Final Gate. `verify` is a repair tool, never a required ceremony or acceptance producer. Findings may drive targeted verify and repair, but every final attempt reruns the full Slice scope.

The three gates remain distinct:

- Slice Final Gate closes stale, partial and local Slice drift.
- Wave Integration Gate closes regressions introduced by merging Slices.
- Campaign Final Gate closes historical-result reuse by proving the whole campaign on one final snapshot.

Wave impact combines actual merge diff, Implementation Binding targets, verification input paths, contract keys, Context refs and global constraints. Proven unaffected Specs may be skipped; uncertainty falls back to full; cross-SFC global constraints always run.

Campaign Final Gate creates one shared Integration snapshot, compiles all Slice contracts against it, runs identical Specs once only when snapshot, normalized Spec, Oracle, executable, input paths, command definition and environment contract identities all match, projects results back to owning Slices and evaluates global constraints. This is same-snapshot execution deduplication, never reuse of historical evidence.

Campaign `accepted` is derived only from current Slice/Wave/final gates, validated Receipt authority, a clean Integration Branch and an authoritative Target that either has the exact Campaign Final commit/tree, is authorized by a complete current Target Snapshot Gate, or is safely fast-forwarded to the Integration commit authorized by Campaign Final. Only the Target Snapshot basis binds its passing revalidation result; exact commit/tree and remote/local fast-forward Receipts must not bind diagnostic revalidation. Immediately before the accepted transaction, Target authority is resolved again and both commit and tree must still match the Receipt. A stale Receipt records `target_changed_before_acceptance`, remains `finalizing` and re-enters Target Finalization once; a second change in the same run returns `wait_external` with `target_unstable_during_acceptance`. The accepted state, accepted Final Result, Target Finalization Receipt and event commit in one Campaign transaction. Cleanup is later and idempotent; its failure cannot revoke acceptance. An accepted Campaign validates frozen authority and returns finished before Scope Fit, worker/worktree creation, PR handling or another Gate. Prose, old results, matrices, verdicts, worker exit code or worker output cannot promote acceptance.

Campaign V6 is the only executable Campaign schema. Accepted V5 remains readable for audit; unfinished V5 returns `campaign_v5_execution_retired_recreate_required` and is never migrated or routed to an AppServer fallback.

## Contract Conformance

Before handoff:

- fix implementation misses in code;
- update missing durable facts through `Context Delta: required`;
- confirm every material source constraint is covered, task-local, explicitly out of scope or a reported decision blocker;
- confirm controlling Context reached correct implementation and verification surfaces;
- confirm no forbidden shortcut, duplicate workflow artifact or stale authority was used;
- confirm implementation and Context have not drifted.

Handoff reports only implementation, verification, Context status and blockers. Conformance evidence stays in the handoff/PR, not Context.

## Non-Goals

- Do not restore lifecycle phases, phase gates, plan state, fixed plan files, Task Ledgers, forced TDD/review/subagents, matrix/verdict/evidence-ledger completion or PRD/UX/tech-plan/review/test/release document chains.
- Do not make Context-first order, Source-to-Context judgment, internal plans or Conformance into a validator gate.
- Do not auto-trigger long-task workflows.
- Do not remove any of the three Composite completion gates or let targeted verification issue acceptance.
