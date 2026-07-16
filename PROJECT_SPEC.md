# Project Tiny Context Harness — Product And Workflow Specification

## 1. Product Purpose

Project Tiny Context Harness is repo-native memory and delivery-drift protection for AI coding agents. Its design is intentionally small:

1. **Minimal Context** preserves durable project facts that code cannot reliably explain: goals/non-goals, ownership, architecture/interface/state boundaries and repeatable verification/deployment paths.
2. **Workflow Contract** defines the lightweight default loop: graph-directed Context reads, one `Context Delta`, platform-internal planning, implementation, project verification, Contract Conformance and Context drift checking.
3. **Long-Task Workflow** adds one Canonical Delivery Contract and verifier-owned current-snapshot acceptance for work that needs pause/compaction/new-session recovery or multiple observable outcomes.

The Long-Task Workflow V2 product equation is:

> one authoritative Contract + one continuing platform-native Goal + one selected workspace + rolling technical implementation + one trustworthy Evidence Kernel + risk-proportional proof

Its controlling objective is to eliminate false completion inside the declared authority. When the source and Contract are sufficiently detailed and unambiguous, and every material plan item or acceptance criterion is represented by an observable Claim and falsifiable Check, no unfinished declared item may become authoritative completion. Agent prose, a checked box, command exit alone or historical evidence never overrides that rule.

The workflow cannot guarantee that model-driven implementation never drifts while work is in progress; that depends on implementation capability. It instead makes observable drift detectable, blocks acceptance and Stop, identifies the responsible Outcome/Claim/Check or boundary, and directs repair until the Live Final Gate proves a final current-snapshot artifact with no remaining drift relative to the declared Contract and relevant Context.

Every added workflow mechanism must buy concrete drift-prevention value. The product keeps Claim Coverage, authority/freshness binding, scope/risk escalation, actionable findings and current-snapshot recomputation because they close distinct false-completion paths, and stops adding orchestration, state or ceremony before diminishing marginal drift reduction no longer justifies authoring, runtime and recovery cost.

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
- multi-repository change is rejected as unsupported;
- critical user path with weak end-to-end observability.

Users may raise risk to strict. A requested `standard` level below the computed floor fails with `risk_level_below_required`. Skill or executor logic can never lower risk.

## 4. Single-Goal Rolling Delivery

The active flow is:

```text
request or external implementation source
-> minimum relevant Context
-> one Contract or logical Contract Bundle authority
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

## 5. Canonical Delivery Contract V2

The root authoring authority is `delivery-contract.yaml`, schema `long-task-delivery-v2`. It may contain inline Outcomes or `outcome_files` fragments that own Outcome content only; both forms compile to one logical Contract. Original `source_paths` remain provenance and direct Source Claims resolve to generated Claims, global constraints, source-backed out-of-scope items or decision blockers.

The Contract keeps three logical authorities in one file:

- **Product Authority**: complete observable end states, ownership/surfaces/controls, non-goals and non-completing results.
- **Technical Boundary Authority**: stable obligations, allowed/forbidden path and architecture boundaries, bindings/forbidden shortcuts and strict rollback/recovery constraints.
- **Acceptance Authority**: falsifiable executable Checks, claimed proof surfaces, positive/negative assertions, population/counterfactual obligations and environment requirements.

The required top-level shape is:

```yaml
schema_version: long-task-delivery-v2
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
    public_api_or_schema_change: []
    persistent_data_change: []
    data_migration: []
    security_boundary_change: []
    permission_boundary_change: []
    irreversible_external_effect: []
    critical_user_path: []
    full_population_operation: []
    multi_repository_change: []
    weak_observability: []
global:
  product:
    non_goals: []
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

Authors use stable local keys for controls, obligations, bindings and Assertions. The compiler creates canonical Outcome-qualified Claim ids plus `GLOBAL.non_goal.<key>`, `GLOBAL.constraint.<key>` and `GLOBAL.forbidden_shortcut.<key>`. Global Claims are covered only by Global Checks; Outcome and Global Assertions cannot cross scope. Global non-goals and forbidden shortcuts require negative proof, while Global constraints accept either polarity. Global forbidden paths remain static changed-path authority and do not become Assertion Claims.

Compile derives canonical, key-sorted Product and Global semantic projections and combines them with Source hashes and the selected Context topology/file set/file hashes as Authority Revision materials. Any Contract authority or material change requires `--revise`; Source or Context cannot be silently refrozen by ordinary compile.

After execution starts, Source/Context/Product/Global semantic changes, Product Claim additions/removals/rewrites, expanding owner/change/support/binding paths, removing forbidden paths, changing runners or existing verification inputs, reducing `input_paths`, weakening `expected_output_paths`, or weakening artifacts, environment requirements, bindings, obligations, counterfactuals, population or rollback/recovery creates a pending revision whose identity binds previous/next authority hashes, actual materials, diff, risk floor and affected Outcomes. Every Contract authority structure has a compile-time field-policy registry so newly added fields cannot silently escape authority hashing and revision classification. Only mechanical proof additions and machine-proven scope/input/output tightening may revise automatically. Risk downgrade is rejected and every revision invalidates old progress and Receipts.

If one atomic Product + Acceptance Contract exceeds a single file, use a Contract Bundle. Independent release/rollback/owner/risk/product boundaries run as separate top-level Contracts. Capacity, parallelism and model preference are never semantic separation boundaries.

## 6. Composition, Authority And Finalization

Contract Boundary Check returns only `single_contract`, `single_contract_bundle`, `separate_top_level_contracts`, `decision_required` or `capacity_blocked`. It is a semantic authoring judgment and creates no execution state. `delivery-set` is a fixed non-executing retirement tombstone.

The first formal Contract compile freezes `initial_task_base` with commit, tree and workspace manifest. Recompile retains that base. The complete `CompiledDeliveryContractV2` becomes an internal `active-long-task-authority-v3` snapshot under Git common-dir; its hash and the worktree Git-config marker bind task id, authority revision and compiled identity. `.ty-context/compiled-contract.json` is only a rebuildable projection and can never define previous authority, the initial base, risk floor or Final Gate identity. Protected source/Product/Acceptance/risk changes require `--revise`; reductions create a pending hash-bound Authority Revision, while risk downgrade is rejected. The executing Agent must not approve its own pending revision.

Authority publication is compare-and-swap against the expected previous compiled identity. Compile stages the cache, commits the common-dir authority and marker, then publishes the cache and invalidates derived progress/Receipts. Failed compile/revision/CAS leaves the previous snapshot, initial base and progress intact; a cache publish failure leaves the new common-dir authority valid and repairable. Legacy `active-long-task-binding-v2` can migrate only when its workdir cache fully matches task, repository, workdir, revision, initial base, verifier and compiled identity. Missing or inconsistent legacy cache returns `active_authority_continuity_unrecoverable` rather than guessing from the current Contract.

Targeted verification persists independent per-Check Progress Records scoped to protected authority, check/runner/verifier identity, relevant Context, input paths, binding carriers and dependency interfaces. They accumulate across runs and never authorize completion.

Live Final Gate requires a clean candidate commit after all required Context updates. It recompiles the source Contract, validates the complete common-dir authority snapshot against the task/revision/identity worktree marker, creates one Git-tree snapshot and reruns the complete Contract without historical proof reuse. Verify, status and resume also read this snapshot rather than the workdir cache. Receipts bind HEAD, tree, workspace, Contract, source, Context and verifier identities but are audit-only and never reusable acceptance authority.

## 7. Static Compiler And Preflight

Compile is deterministic, static and model-free. It:

- strictly parses YAML and rejects duplicate/unknown keys, aliases, merges, tags and multiple documents;
- validates Contract schema and unique Outcome/Check keys;
- generates internal ids and validates Outcome dependencies/cycles;
- validates registered Context refs and requires every Source Claim to bind a declared real Source file, with optional `file#anchor` location;
- validates repository-contained safe paths, owner/binding semantics, resolved command targets, explicit verification inputs, package scripts, project binaries, Oracle/Playwright targets and structured environment probes;
- rejects symlink and detectable hardlink authority/proof files, including the Contract, fragments, Source, Context, runner targets, verification inputs, frozen package/config files, Counterfactual fixtures and package-owned verifier files;
- compiles and requires coverage for Global non-goal/constraint/forbidden-shortcut Claims plus Outcome result, control, non-completing, obligation and forbidden-shortcut Claims;
- requires executable falsifiable proof for every Outcome;
- requires `ui_browser` proof when a UI owner surface or controls exist;
- computes effective risk and rejects a requested level below the floor;
- enforces risk-trigger-specific negative, counterfactual, population, security, environment and rollback/recovery proof;
- freezes source, Contract, selected Context topology/files, verifier, runner/oracle/command, workdir and repository identity;
- activates the one long-task binding for the current worktree.

Repository pattern normalization, matching, subset and overlap/disjoint use one AST. The active language supports literal segments, `*`, `?`, full-segment `**` and simple extension patterns; brackets, braces, extglob and non-segment `**` are rejected during compile. `not_subset` and `unknown` both fail closed for owner/binding validation and count as expansion in Authority Revision. Only `proven_disjoint` can separate verification inputs, artifacts, allowed/forbidden paths or runtime state; overlap and unknown are protected conflicts. Planned output may excuse a missing input only when overlap is proven, never when it is merely unknown.

Compile never implements code, invokes a model, creates a process/worktree/branch or runs project verification.

If actual changes escape declared expected/support paths or touch an undeclared Context owner/boundary, verify/final returns `scope_or_risk_escalation_required`. The same current Goal updates the Contract and recompiles.

## 8. Evidence Kernel

The Evidence Kernel retains only low-level capabilities that directly close false-completion paths:

- repository/workspace snapshot and identity;
- explicit argv command runner with bounded timeout/output and a minimal environment whitelist; only Check-declared `env_var` requirements are additionally passed;
- observation and positive/negative assertion evaluation;
- implementation binding/path evaluation;
- population coverage evaluation;
- counterfactual controls where strict risk requires them;
- selected Context/source/runner/oracle/verifier hashes;
- Git common-dir Active Authority V3 snapshot plus matching task/revision/identity worktree Git-config marker;
- outcome/check projection and derived status;
- source-recompiled Live Final Gate and audit-only Receipt;
- Stop Hook preflight and decision.

The compiled internal graph is deliberately small:

```text
Task -> Outcome -> Check -> Observation/Assertion
```

Agent/worker prose, hand-written state and command exit code alone cannot create accepted authority. Every Assertion needs an explicit Observation. Missing or type-incomparable values fail closed; negative operators never pass by inverting a type error, implicit absence operators are unsupported, and negative proof uses explicit values such as `equals: false`. Positive Assertions may be empty when exit/artifact/population or negative proof is the intended Check evidence, while Global non-goal/forbidden-shortcut coverage still requires negative Assertions.

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

Bottom-up acceptance succeeds only when all required executable Checks, Outcomes, global constraints and risk-specific obligations pass. Human, CI, deployment and product confirmations exist only as `external_confirmations` and never contribute machine proof. A machine pass with pending external confirmations reports `machine_accepted_external_pending`.

### Freshness And Stop

Receipts and status describe the last audit only. Status/resume report missing or mismatched cache as a diagnostic while retaining the common-dir authority. Doctor is read-only and distinguishes valid/invalid authority, migratable legacy authority, unrecoverable continuity, matching/missing/mismatched cache and marker/record mismatch. The Stop Hook is a no-op without an active task; otherwise Stop and close run the Live Final Gate themselves. Success atomically clears the common-dir record and Git-config marker. `abandon` is explicit non-success teardown and never touches user Git content.

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
ty-context long-task compile <workdir> --revise
ty-context long-task approve-authority-revision <workdir> --revision <sha>
ty-context long-task explain <workdir>
ty-context long-task verify <workdir> [--outcome <key>] [--check <key>]
ty-context long-task status <workdir>
ty-context long-task resume <workdir>
ty-context long-task doctor <workdir>
ty-context long-task final-gate <workdir>
ty-context long-task stop-check <workdir> [--message <text>]
ty-context long-task close <workdir>
ty-context long-task abandon <workdir>
```

No Long-Task CLI command may start Codex/AppServer/agents, create/delete worktrees or branches, merge, push, open PRs, retry model calls or manage process trees. Only a Contract-declared project verification command may create a child process.

`composite-campaign` and `composite-long-task` are lightweight retirement tombstones only. They report `retired`, do not execute historical state and direct users to `ty-context long-task`.

## 12. Skills And Distribution Profiles

`/long-task-workflow` is the only active long-task Skill. It performs Boundary Check, creates/reviews one V2 Contract/Bundle from user/external source, compiles Claim Coverage, continuously implements rolling Frontiers in the current native Goal, resumes semantic state, runs the Live Final Gate and reports results.

`/normal-long-task` is a retirement pointer and creates no checklist, prompt or Local Audit.

Profiles are:

- `core-portable`;
- `workflow-default`;
- explicit `long-task`.

`ty-context enable long-task` installs only the Long-Task Skill, Stop Hook and required templates. Enable, disable and upgrade share one entry-level cleanup function. Current or relocated package-owned absolute commands are recognized only with a known Tiny Context managed status, an exact `node "<absolute>/dist/long-task-hook.js"` shape and a known `node_modules`, pnpm or workspace-package layout; exact retired repo-local commands remain migratable. User entries in the same group, no-status lookalikes, user-only groups and commands merely containing `composite` are preserved.

Upgrade safely changes package-owned `composite-codex` profile selection to `long-task`, removes package-owned retired assets and leaves user-authored historical campaign/source/Contract files untouched. It never imports an unfinished campaign or automatically executes it.

## 13. Managed And Packaged Surfaces

- `.codex/ty-context-managed/**` is managed source.
- `packages/ty-context/assets/**` is package canonical output.
- `packages/ty-context/source-mappings.yaml` defines source-to-package mapping.
- `.codex/skills/authoring/**` remains source-workspace-only.
- README, Chinese README, package README, Context, AGENTS managed block, Skills, tests, release scripts and package assets must describe the same current workflow.
- Public surfaces are English-complete; Chinese is an aligned translation.

The package version for this architecture is `0.6.0`.

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
- Local mode trusts the installed package-owned verifier and Git metadata.
- Network isolation remains the responsibility of the external platform.

## 15. Historical Design Boundary

Earlier pre-0.5 designs experimented with stage document chains and later with multi-SFC campaign orchestration, including Source Unit inventories, Scope Fit, Packets, Codex/AppServer workers, Waves, worktrees and integration/finalization gates. Those designs provided useful evidence-freshness lessons but made Harness own platform/process/Git responsibilities with diminishing delivery-drift benefit.

Version 0.6.0 keeps the reusable Evidence Kernel lesson—static falsifiability, current-snapshot recomputation, identity binding and Stop freshness—while retiring the orchestration plane. Historical names may appear only in explicit history, migration tests or command tombstones, never as current product behavior.
