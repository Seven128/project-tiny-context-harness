# Project Tiny Context Harness — Product And Workflow Specification

## 1. Product Purpose

Project Tiny Context Harness is repo-native memory and delivery-drift protection for AI coding agents. Its design is intentionally small:

1. **Minimal Context** preserves durable project facts that code cannot reliably explain: goals/non-goals, ownership, architecture/interface/state boundaries and repeatable verification/deployment paths.
2. **Workflow Contract** defines the lightweight default loop: graph-directed Context reads, one `Context Delta`, platform-internal planning, implementation, project verification, Contract Conformance and Context drift checking.
3. **Long-Task Workflow** adds one Canonical Delivery Contract and verifier-owned current-snapshot acceptance for work that needs pause/compaction/new-session recovery or multiple observable outcomes.

The Long-Task Workflow V1 product equation is:

> one authoritative Contract + one continuing platform-native Goal + one selected workspace + rolling technical implementation + one trustworthy Evidence Kernel + risk-proportional proof

The product stops adding workflow mechanism when the marginal reduction in delivery drift no longer justifies the orchestration, state and recovery cost.

## 2. Authority Model

- `project_context/**` owns intended durable project facts.
- `delivery-contract.yaml` owns the declared product outcomes, stable technical boundaries and machine acceptance for one active long task.
- Current code owns implementation reality.
- Project tests, browser/runtime/API/data/security proof, CI and human acceptance own product-quality evidence.
- The current platform session is the execution Goal. Harness does not create, simulate, persist or reconnect physical Goals or Turns.
- Git history naturally records Contract revisions. Harness does not add a Packet revision chain, second plan or hand-written completion state.

When authorities disagree, disagreement is drift, missing implementation, stale Context/Contract or a real decision—not permission to follow local code convenience.

## 3. Workflow Levels

### L0 — Default Local Work

Use the default Workflow Contract when work is local, reversible, directly testable, covered by current Context, needs no cross-session recovery and does not change durable API/schema/data/security/recovery/product semantics. No Delivery Contract or long-task binding is created.

`Architecture Context Hit` is an internal high-risk routing question. `Decision Rationale Hit` is an internal `existing|required|none` coverage question. They are not a durable fact, role, validator or artifact, and the check never creates a rationale delta or required file. `Context Delta` remains the only durable-fact decision point.

Product Surface Contract work uses `context_surface_contract` and the existing `contract`, area/subdomain and verification roles. It must not add a new product-surface role; Source-to-Context judgment and Contract Conformance remain internal workflow checks.

### L1 — Standard Long Task

Use one Delivery Contract, one native Goal and one workspace when work has multiple observable Outcomes, crosses modules or needs pause/compaction recovery, but does not hit an L2 risk floor and has reliable executable proof.

### L2 — Strict Long Task

The compiler requires strict when any declared fact is true:

- public API or schema change;
- persistent data change;
- data migration;
- security boundary change;
- permission boundary change;
- irreversible external effect;
- full-population operation;
- multi-repository change is rejected as unsupported in V1;
- critical user path with weak end-to-end observability.

Users may raise risk to strict. A requested `standard` level below the computed floor fails with `risk_level_below_required`. Skill or executor logic can never lower risk.

## 4. Single-Goal Rolling Delivery

The active flow is:

```text
request or external implementation source
-> minimum relevant Context
-> one Contract/Contract Bundle or one Delivery Set authority
-> one coverage review
-> pure static compile/preflight
-> current native Goal executes in current workspace
-> temporary dependency-ready Outcome Frontier
-> targeted repair verification
-> same-Goal repair as needed
-> one-snapshot complete Final Gate
-> Stop freshness
-> external Git/PR/CI/deployment/human confirmation
-> required Context update and drift check
```

Outcome is an acceptance-result unit. It is not a Goal, branch, worktree, worker or fixed implementation slice. `depends_on` determines acceptance readiness. The current Goal dynamically chooses one or more ready Outcomes as an internal Frontier and forms only the technical detail needed for that Frontier.

The Frontier is not persisted as a scheduler graph. Full file/function/component/test order is intentionally not frozen before implementation discovers current-code reality.

Core execution has no internal parallel mutation. Users may explicitly use platform-native parallel or Git facilities, but those facilities are external and do not change Harness completion authority.

## 5. Canonical Delivery Contract V1

The root authoring authority is `delivery-contract.yaml`, schema `long-task-delivery-v1`. It may contain inline Outcomes or `outcome_files` fragments that own Outcome content only; both forms compile to one logical Contract. Original `source_paths` remain provenance and direct Source Claims retain coverage into Outcomes or Set Children.

The Contract keeps three logical authorities in one file:

- **Product Authority**: complete observable end states, ownership/surfaces/controls, non-goals and non-completing results.
- **Technical Boundary Authority**: stable obligations, allowed/forbidden path and architecture boundaries, bindings/forbidden shortcuts and strict rollback/recovery constraints.
- **Acceptance Authority**: falsifiable executable Checks, claimed proof surfaces, positive/negative assertions, population/counterfactual obligations and environment requirements.

The required top-level shape is:

```yaml
schema_version: long-task-delivery-v1
task:
  id: stable-task-key
  title: Human title
  goal: Complete delivery goal
  source_paths: []
  context_refs: []
  context_snapshot_mode: referenced
risk:
  requested_level: auto
  facts:
    public_api_or_schema_change: false
    persistent_data_change: false
    data_migration: false
    security_boundary_change: false
    permission_boundary_change: false
    irreversible_external_effect: false
    critical_user_path: false
    full_population_operation: false
    multi_repository_change: false
    weak_observability: false
global:
  product:
    non_goals: []
    owner_boundaries: []
  technical:
    constraints: []
    forbidden_paths: []
    forbidden_shortcuts: []
  acceptance:
    checks: []
outcomes: []
```

Each Outcome has a stable `key`, title, dependencies, Product, Technical and Acceptance sections. UI controls declare location, trigger, input/precondition, loading, empty, success, failure and feedback states. Every Outcome has at least one executable Check.

Checks support the runner kinds `package_script`, `project_binary`, `node_oracle` and `playwright_test` and proof surfaces `ui_browser`, `runtime_behavior`, `api_contract`, `data_state`, `security_boundary`, `population_coverage` and `implementation_structure`.

Model-authored identifiers stop at task, Outcome and Check keys. The compiler deterministically generates internal identities such as:

```text
OUT.<outcome-key>
CHECK.<outcome-key>.<check-key>
CHECK.GLOBAL.<check-key>
```

There is no Requirement/PI/Obligation/Binding/AC/Proof/Spec authoring namespace and no cross-file semantic duplication.

Product or Acceptance meaning may not be silently weakened by execution. Technical support paths and local constraints may be revised when real implementation discoveries do not change product or acceptance meaning; every revision requires recompile and invalidates old results.

If one atomic Product + Acceptance Contract exceeds a single file, use a Contract Bundle. Multiple Child Contracts are allowed only inside a Delivery Set after a semantic Boundary Check confirms independent observable results, executable Acceptance and a real release/rollback/owner/risk/product boundary without splitting an atomic loop. Capacity, parallelism and model preference are never semantic separation boundaries.

## 6. Composition, Authority And Finalization

Contract Boundary Check returns only `single_contract`, `single_contract_bundle`, `delivery_set`, `decision_required` or `capacity_blocked`. It is a semantic authoring judgment, creates no execution state and never claims the compiler proved product independence.

`long-task-delivery-set-v1` owns one Set goal/source coverage, global Product/Technical boundaries, integration Checks, external confirmations and an acyclic map of Child Contracts. Each Child declares an observable result, one permitted separation reason and evidence. The active binding remains `mode: delivery_set`; Child Gate receipts are dependency checkpoints only. Status/resume project ready, blocked, passed, stale and remaining Children and start no execution. V1 rejects multi-repository delivery.

The first formal Contract or Set compile freezes `initial_task_base` with commit, tree and workspace manifest. Recompile retains that base. Once implementation changes, targeted progress or a Child Gate exists, protected source/Product/Acceptance/risk/Set-boundary changes create a pending hash-bound Authority Revision and cannot activate without explicit approval. Technical-only amendments require a reason and stale affected progress.

Targeted verification persists independent per-Check Progress Records scoped to protected authority, check/runner/verifier identity, relevant Context, input paths, binding carriers and dependency interfaces. They accumulate across runs and never authorize completion.

Top-level Final Gate requires a clean candidate commit after all required Context updates. Standalone Final Gate reruns its complete Contract on one snapshot. Delivery Set Final Gate reruns all Child and integration Checks on one shared snapshot and ignores historical Child passes. Receipts bind HEAD, tree, workspace, Contract/Set, source, Context and verifier identities. A later content commit stales the receipt; remote push/PR operations that do not change local commit/tree do not. `machine_accepted_external_pending` explicitly separates declared external/human/deploy confirmation from machine Contract acceptance.

## 7. Static Compiler And Preflight

Compile is deterministic, static and model-free. It:

- strictly parses YAML and rejects duplicate/unknown keys, aliases, merges, tags and multiple documents;
- validates Contract schema and unique Outcome/Check keys;
- generates internal ids and validates Outcome dependencies/cycles;
- validates registered Context refs and source paths;
- validates repository-contained safe paths, command definitions, package scripts, project binaries, Oracle/Playwright targets and timeouts/network policy;
- requires executable falsifiable proof for every Outcome;
- requires `ui_browser` proof when a UI owner surface or controls exist;
- computes effective risk and rejects a requested level below the floor;
- enforces risk-trigger-specific negative, counterfactual, population, security, environment and rollback/recovery proof;
- freezes source, Contract, selected Context topology/files, verifier, runner/oracle/command, workdir and repository identity;
- activates the one long-task binding for the current worktree.

Compile never implements code, invokes a model, creates a process/worktree/branch or runs project verification.

If actual changes escape declared expected/support paths or touch an undeclared Context owner/boundary, verify/final returns `scope_or_risk_escalation_required`. The same current Goal updates the Contract and recompiles.

## 8. Evidence Kernel

The Evidence Kernel retains only low-level capabilities that directly close false-completion paths:

- repository/workspace snapshot and identity;
- explicit argv command runner with bounded timeout/output/environment;
- observation and positive/negative assertion evaluation;
- implementation binding/path evaluation;
- population coverage evaluation;
- counterfactual controls where strict risk requires them;
- selected Context/source/runner/oracle/verifier hashes;
- active-task binding;
- outcome/check projection and derived status;
- Final Gate, accepted Receipt and freshness;
- Stop Hook preflight and decision.

The compiled internal graph is deliberately small:

```text
Task -> Outcome -> Check -> Observation/Assertion
```

Agent/worker prose, hand-written state and command exit code alone cannot create accepted authority. Missing, weakened or unexecutable proof fails closed.

## 9. Verification And Recovery Semantics

### Targeted Verify

`verify` can select one Outcome, one Check or all repair checks. It runs on a current snapshot, records precise findings and projects current status, but always has `acceptance_authorized: false`.

### Status

`status` is machine JSON and reports each Outcome as:

- `unverified`;
- `progress_passing`;
- `progress_failing`;
- `progress_stale`;
- `blocked_external`.

It is not completion authority.

### Resume

`resume` is read-only and reports Contract/compiled identity, effective risk, relevant Context, current Git HEAD/dirty state, freshness of recent verify/final results, passing/failing/stale/ready Outcomes, recent findings and the next safe action. It starts no process, changes no Git state and does not claim to reconnect a physical Turn.

### Final Gate

`final-gate` creates one current workspace snapshot and reruns all global and Outcome Checks. Fully identical execution identities may run once inside that Gate and project to all owning Checks. No historical targeted or final result is reused.

Bottom-up acceptance succeeds only when all required Checks, Outcomes, global constraints and risk-specific obligations pass. Manual-only judgment produces `external/manual acceptance required`, not machine accepted.

### Freshness And Stop

The accepted Receipt binds workspace snapshot, repository/workdir, Contract, source, selected Context, runner/oracle/command and verifier identity. Any bound change makes the result stale immediately.

The Stop Hook is a no-op without an active task. With an active task, it blocks uncompiled, needs-work, stale, failing or workspace-mismatched state and permits only an exact fresh accepted Receipt.

`close` requires that fresh Receipt, clears only the matching active binding and preserves Contract/final Receipt. `abandon` is explicit non-success teardown: it clears matching temporary state, preserves `source.md` and `delivery-contract.yaml`, and never touches a user branch/worktree/commit/remote.

## 10. Retry And Decision Boundaries

- Static Contract errors block implementation and are fixed in the same current Goal before product code work.
- Local test/Check failures are repaired in the same Goal with no new Agent or model session.
- Retry defaults to none. A transient verification command gets one mechanical retry only when it explicitly declares `transient_once`, idempotency and a read-only/test-sandbox effect; timeout alone does not establish safety.
- Product, acceptance or architecture semantic conflicts pause for user/main-conversation decision and are not disguised as implementation failures.
- If the current Goal truly ends, a new session uses `resume` for semantic recovery. Harness does not simulate the old Turn or invent a Campaign identity.

## 11. CLI Contract

The active public surface is:

```text
ty-context long-task init <workdir>
ty-context long-task compile <workdir>
ty-context long-task approve-authority-revision <workdir> --revision <sha>
ty-context long-task verify <workdir> [--outcome <key>] [--check <key>]
ty-context long-task status <workdir>
ty-context long-task resume <workdir>
ty-context long-task final-gate <workdir>
ty-context long-task stop-check <workdir> [--message <text>]
ty-context long-task close <workdir>
ty-context long-task abandon <workdir>
ty-context delivery-set init|compile|status|resume|final-gate|stop-check|close|abandon <setdir>
ty-context delivery-set approve-authority-revision <setdir> --revision <sha>
```

No Long-Task CLI command may start Codex/AppServer/agents, create/delete worktrees or branches, merge, push, open PRs, retry model calls or manage process trees. Only a Contract-declared project verification command may create a child process.

`composite-campaign` and `composite-long-task` are lightweight retirement tombstones only. They report `retired`, do not execute historical state and direct users to `ty-context long-task`.

## 12. Skills And Distribution Profiles

`/long-task-workflow` is the only active long-task Skill. It performs Boundary Check, creates/reviews one Contract/Bundle or Set from user/external source, compiles it, continuously implements rolling Frontiers in the current native Goal, resumes semantic state, runs the matching Final Gate and reports results.

`/normal-long-task` is a retirement pointer and creates no checklist, prompt or Local Audit.

Profiles are:

- `core-portable`;
- `workflow-default`;
- explicit `long-task`.

`ty-context enable long-task` installs only the Long-Task Skill, Stop Hook and required templates. `disable long-task` removes only package-owned assets and preserves user Hooks/files.

Upgrade safely changes package-owned `composite-codex` profile selection to `long-task`, removes package-owned retired assets and leaves user-authored historical campaign/source/Contract files untouched. It never imports an unfinished campaign or automatically executes it.

## 13. Managed And Packaged Surfaces

- `.codex/ty-context-managed/**` is managed source.
- `packages/ty-context/assets/**` is package canonical output.
- `packages/ty-context/source-mappings.yaml` defines source-to-package mapping.
- `.codex/skills/authoring/**` remains source-workspace-only.
- README, Chinese README, package README, Context, AGENTS managed block, Skills, tests, release scripts and package assets must describe the same current workflow.
- Public surfaces are English-complete; Chinese is an aligned translation.

The package version for this architecture is `0.5.0`.

## 13. Performance And Cost Boundaries

Release update mode is part of the release contract. Every published version declares `sync-only`, `upgrade-required` or `manual-required`; `ty-context upgrade --check` reports `safe_pending`, `manual_required` and `blocked`, and direct `sync` does not run migrations.

- Small-fixture compile/preflight target: at most two seconds.
- Small-fixture status/resume target: at most one second.
- Focused new loop tests target: at most five minutes.
- Complete Long-Task Workflow suite: at most fifteen minutes.
- Harness makes no model calls, implements no model retry and starts no long-lived child process outside declared verification commands.
- Automated tests call no real Codex, VM, browser matrix, large worktree farm or real external service.
- Local timing may report compile/verify/final wall time, invocation count and failure stage. Harness does not fabricate tokens, model calls, parent-agent attention or platform Goal duration.

## 14. Completion And Honest Limits

The architecture is complete only when CLI, Contract/compiler, Evidence Kernel, Skill/profile/Hook/assets, migration, docs/Context, tests, consumer smoke, package tarball and source sync all agree; the active runtime contains none of the retired orchestration plane; a controlled two-Outcome CLI smoke proves repair/final/stale/close behavior; and a local commit records the change.

Stable honest limits:

- Harness does not create or restore a platform physical Goal.
- Harness does not prove the user never omitted an undeclared requirement.
- Harness provides no core parallel mutation.
- Harness does not observe platform token/model-call accounting.
- Git/PR/CI/deployment/human product confirmation remain external.

## 15. Historical Design Boundary

Earlier pre-0.5 designs experimented with stage document chains and later with multi-SFC campaign orchestration, including Source Unit inventories, Scope Fit, Packets, Codex/AppServer workers, Waves, worktrees and integration/finalization gates. Those designs provided useful evidence-freshness lessons but made Harness own platform/process/Git responsibilities with diminishing delivery-drift benefit.

Version 0.5 keeps the reusable Evidence Kernel lesson—static falsifiability, current-snapshot recomputation, identity binding and Stop freshness—while retiring the orchestration plane. Historical names may appear only in explicit history, migration tests or command tombstones, never as current product behavior.
