# Project Tiny Context Harness

[![npm version](https://img.shields.io/npm/v/project-tiny-context-harness.svg)](https://www.npmjs.com/package/project-tiny-context-harness)
[![Package CI](https://github.com/Seven128/project-tiny-context-harness/actions/workflows/package.yml/badge.svg)](https://github.com/Seven128/project-tiny-context-harness/actions/workflows/package.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/Seven128/project-tiny-context-harness/badge)](https://securityscorecards.dev/viewer/?uri=github.com/Seven128/project-tiny-context-harness)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Seven128/project-tiny-context-harness/blob/main/LICENSE)

Translations: [Chinese (Simplified)](https://github.com/Seven128/project-tiny-context-harness/blob/main/README.zh-CN.md)

Project Tiny Context Harness is repo-native project memory for AI coding agents, plus a narrow delivery harness for trustworthy long-task completion. The product principle is: **keep the memory, drop the ceremony**.

It provides three cooperating capabilities:

1. **Minimal Context** preserves durable product, ownership, architecture, contract and repeatable verification facts under `project_context/**`.
2. **Workflow Contract** gives ordinary work a lightweight Context-first loop using the platform's internal plan and project-owned verification.
3. **Long-Task Workflow** adds one complete `long-task-delivery-v2` Contract, compiled Claim Coverage, a one-time model choice after Authority Lock, targeted repair evidence and a same-snapshot Live Final Gate.

Tiny Context does not invoke or switch models, create agents, branches or worktrees, merge, push, open pull requests, deploy, or replace project tests and human acceptance.

## Install And Initialize

```powershell
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init

# Existing repository:
npx --yes --package project-tiny-context-harness@latest ty-context init --adopt

npx --yes --package project-tiny-context-harness@latest ty-context validate-context
npx --yes --package project-tiny-context-harness@latest ty-context doctor
```

Default profiles are `core-portable` and `workflow-default`. Explicitly enable long-task support:

```powershell
ty-context enable long-task
```

This installs `/source-plan-authoring`, `/long-task-workflow` and the package-owned completion Hook. Disable only those package-owned surfaces with `ty-context disable long-task`.

## Minimal Context And Default Workflow

The default recovery path is:

```text
project_context/global.md
project_context/architecture.md
project_context/context.toml
default area root
minimum relevant area/role Context
```

Only near-universal recovery facts should use `read_policy = "default"`; specialized architecture, contract, deployment, verification and historical detail should remain `on-demand`.

### Bounded Context discovery

Before deciding `Context Delta`, the Agent combines two routes:

1. collect area/role/trigger/graph candidates from `context.toml`;
2. run one bounded text search over `project_context/**` using a small set of high-signal task terms such as explicit area/module names and API/schema/state/security/verification/deployment language;
3. merge the candidates and read only semantically relevant files.

The search supplements rather than replaces semantic judgment. It creates no vector or persistent index, cache, registry, search state or second authority. It can still miss unrelated synonyms or indirect dependencies, so high-risk work retains Architecture Context Hit and final Contract Conformance.

`ty-context doctor` reports the deterministic default Context footprint, soft-budget overages and byte-identical default files as advisory maintenance signals, not a new gate.

Ordinary tasks:

1. resolve relevant Context through manifest routing plus bounded Context search;
2. decide `Context Delta: none|required`;
3. update the owning Context before code when durable semantics change;
4. use the platform's internal plan;
5. implement and run project-owned verification;
6. perform Contract Conformance and Context drift checks.

The default workflow requires no `plan.md`, matrix, verdict, evidence ledger, retrieval index or second plan. Duration, file count and complexity never auto-enable long-task state.

Every handoff reports exactly one Context result:

```text
Context: updated <files/reason>
# or
Context: no durable fact change
```

### Architecture And Modularity

For high-risk work, `Architecture Context Hit`, `Decision Rationale Hit: existing|required|none` and `Modularity Check: none|required|exception` remain internal routing questions. The risk-triggered architecture gate covers durable modules/capabilities, public API/schema/data/persistence, source-of-truth/state ownership, dependency direction, cross-area work, migration/security/recovery and reusable abstractions. It resolves owner, unique source of truth, lifecycle/failure/compatibility, forbidden shortcuts and a project-owned executable architecture check. Small fixes do not pay this ceremony.

Harness may route repository-native lint/AST/dependency/contract checks but does not become a language-generic architecture analyzer. `ty-context check-modularity` identifies the highest-risk function and line. `validate-code-modularity` and `validate-harness` enforce modularity separately from `validate-context`.

## Optional Source Plan Authoring

Use `/source-plan-authoring` only for an explicitly requested initial plan, Source Plan, source draft, or audit/refinement of such input for later implementation or Contract authoring.

It produces one self-contained Markdown Source that preserves direct requirements, traces necessary derivations, exposes `DEC`/`decision_required`, uses semantic Outcome boundaries and stable keys/anchors, keeps independently meaningful `CTRL` fields, separates mandatory `OBL` from advisory `HINT`, records `NCOMP`, uses the ten exact Runtime Risk Fact names and writes one observable Given/When/Then scenario per `AC` with explicit accepted `REQ`/`CTRL`/`OBL`/`NCOMP` keys.

It does not update Context, bind repository owners/paths/runners, generate Delivery Contract YAML, execute implementation, create workflow state or claim completion. `HINT` is not a Material Source Item, and the Skill emits no `ty-source-item` markers. A Source Plan is Source, not a Contract Draft. The structure is optional; ordinary prose remains valid Long-Task Source.

## Single-Goal Rolling Delivery

Use `/long-task-workflow` only when explicitly requested or when the current worktree already has an active Long Task. It uses:

- one platform-native continuing Goal;
- one user-selected repository/workspace;
- one complete selected delivery, one Contract and one Final Gate;
- semantic Outcomes whose dependencies express acceptance readiness, not Worker scheduling;
- one user model-choice checkpoint after the first Authority Lock and before implementation;
- a rolling internal implementation Frontier;
- targeted verification for repair only;
- one current-snapshot Final Gate and Stop freshness.

Before the first successful formal Compile, `delivery-contract.yaml` is one non-authoritative Contract Draft. `/long-task-workflow` revises that same Draft across repository/Context reads and Preflight repair rounds. No standalone Contract Draft Skill, Draft Receipt, Authoring State or second plan exists.

A Draft Outcome is simply an Outcome before Authority Lock. Outcomes decompose independently observable, decidable and target-verifiable results to improve dependency-ready implementation, targeted verification, failure localization, resume and stale-result invalidation. `depends_on` is acceptance readiness; the Rolling Frontier is temporary. Outcome decomposes execution and diagnosis, not completion authority.

### One-time execution-model choice

The first successful Compile creates Authority Lock and returns:

```json
{
  "execution_model_checkpoint": {
    "required": true,
    "phase": "post_authority_lock_pre_implementation",
    "options": ["continue_current_model", "switch_model_then_resume"]
  }
}
```

Before product implementation, the Agent asks the user to keep the current model or switch models and resume the active Long-Task. A task-specific model choice already stated explicitly satisfies the checkpoint. Later Compile revisions return `{ "required": false }` and do not repeat it.

Harness does not automatically switch models and persists no acknowledgement, model route, tier scheduler or checkpoint state. The choice is an execution-cost affordance enabled by locked Authority and Final Gate protection; it is not acceptance evidence.

### CLI

```text
ty-context long-task init <workdir>
ty-context long-task preflight <workdir>
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
ty-context long-task abandon <workdir> [--force-corrupt-state]
```

- `init` creates one Compact inline-Outcome Contract template.
- `preflight` is a read-only aggregated Source/REQ/CTRL/OBL/AC, Context, risk, path/binding, runner/input and proof check. It creates no authority, state, Receipt or runner execution.
- `compile` generates Global plus Outcome Result/Requirement/Control-field/Non-completing/Technical Claims, rejects uncovered Claims and makes the first successful formal Compile the Authority Lock. The first result emits `execution_model_checkpoint.required: true`; later Compile results emit `false`. The model-choice result is not stored in Active Authority.
- `verify` writes scoped Progress only after rechecking active task/revision/compiled/worktree identity. Targeted verify never accepts.
- `status` and read-only `resume` project current semantic state, fresh `final_workflow_status` and all `external_confirmations` from the common-dir authority snapshot.
- `final-gate` requires a clean candidate commit, recompiles Source and selected Context authority, runs every required Check on one Git-tree snapshot and rechecks active identity before acceptance.
- `stop-check` and `close` run the Live Final Gate themselves and clear only the accepted identity through CAS. `closed` means only that machine Authority was cleared, not that external delivery completed.
- `abandon --force-corrupt-state` is reserved for corrupt/mismatched/legacy-unrecoverable continuity and preserves authored Contract, Source, Context and Git content.

## Delivery Contract V2

`long-task-delivery-v2` keeps Product Authority, Technical Boundary Authority and Acceptance Authority as logical sections of one file. Compact YAML omits only deterministic defaults and normalizes identically to expanded form.

The Contract contains:

- `task`: complete goal, Source paths, relevant Context and snapshot mode;
- `risk`: `auto | standard | strict` plus explicit risk facts;
- `global`: non-goals, technical constraints, forbidden paths/shortcuts, Global Checks and external confirmations;
- `outcomes`: independently decidable results, dependencies, owner boundaries, atomic Requirements/controls/non-completing Claims, technical obligations/paths/Bindings and named AC Assertions.

Supported runners are `package_script`, `project_binary`, `node_oracle` and `playwright_test`.

Supported proof surfaces are `ui_browser`, `runtime_behavior`, `api_contract`, `data_state`, `security_boundary`, `population_coverage` and `implementation_structure`.

Every Long Task has at least one real Source file and every declared Source file contains a Material Source Item. Authoring inserts non-rendering `ty-source-item:start/end` markers without rewriting original text. Marker keys and Source Claim keys are set-equal and globally unique. Each non-decision Source Item owns exactly one same-kind, same-text canonical target. A Source Acceptance is criterion-identical to one named Assertion and must prove an independently Source-backed non-Result Claim. `out_of_scope` is retired; excluding an in-scope item is `decision_required`.

`context.toml` retrieval guidance—`triggers`, `read_when`, `read_policy`, default selection and unselected nodes—does not alter current selected delivery authority. Selected area ownership, role/dependency structure and selected Context contents remain protected. Any changed final Git tree still requires the Live Final Gate.

## Risk And Evidence

- **L0** local work stays on the default Workflow Contract.
- **L1 standard** uses the complete Long-Task workflow for multiple observable Outcomes or recovery needs with reliable executable checks.
- **L2 strict** uses the same Contract and Outcome model but raises proof on affected public API/schema, persistent data, migration, security/permission, irreversible, full-population or weak-observability critical-path Outcomes. Multi-repository delivery is rejected.

Users may raise risk to strict. Explicit `standard` below the computed floor fails. Strict negative, counterfactual, population, security, environment and rollback/recovery proof is compiler-enforced as applicable. Scope escape returns a `scope_escape` Finding for revision and recompilation in the same Goal.

Agent prose, command exit code, handwritten state, historical targeted passes and missing/weak proof cannot create accepted. Evidence adapters derive from runner kind: only Playwright may prove `ui_browser`; other runners use `structured_json_v2`. Every Outcome has a non-Result atomic Claim and all required surfaces are all-of. Claim-bearing Assertions use explicit expected values. Claim-bearing structured Checks require same-Check Counterfactual sensitivity unless the same Check's Population covers the Claim under normal observability. Claim/Population proof is emitted only for a fully passed Check.

## Upgrade And Compatibility

```powershell
ty-context upgrade --check
ty-context upgrade
ty-context sync
```

Version 0.6.0 retires V1 and the repo-local Hook. Development-period V2 Active Authority, Progress and Receipts are not migrated; doctor reports `manual_required`, and the operator upgrades the Contract before forming a new Authority Lock. Invalid JSON, marker/record mismatch or stale lock is never guessed; doctor reports the contained cleanup command `ty-context long-task abandon <workdir> --force-corrupt-state`.

Version 0.6.0 keeps the `long-task-delivery-v2` name and physical `outcome_files` parser form while defining the first public V2 semantics. Optional Source Plan authoring and the additive model-choice result add no new Contract Schema, Authority, Receipt or persisted runtime state.

Release metadata declares one update mode: `sync-only`, `upgrade-required` or `manual-required`. `sync` refreshes managed assets only; migrations remain owned by `upgrade`.

## Verification

```powershell
npm run format:check
npm run typecheck --workspace project-tiny-context-harness
npm run build --workspace project-tiny-context-harness
node --test --test-concurrency=1 tests/ty-context/source-plan-authoring-skill.test.mjs tests/ty-context/sync-init-doctor.test.mjs tests/ty-context/workflow-contract-routing.test.mjs tests/ty-context/long-task-model-choice-checkpoint.test.mjs
npm run test:delivery-contract --workspace project-tiny-context-harness
npm run test:long-task-workflow --workspace project-tiny-context-harness
npm run test:long-task-performance --workspace project-tiny-context-harness
npm test
npm run smoke:quickstart
npm run preview:pack
npm run launch:check
node packages/ty-context/dist/cli.js package check-source
make validate-harness
```

The modularity gate is `ty-context check-modularity`. Scoped waivers require `owner`, `introduced_at`, `reason`, `tracking_issue` and `expiry_condition`.

The synchronized local preview tarball is named `project-tiny-context-harness-0.6.0.tgz`.

## Honest Limits

Tiny Context does not create or restore a platform Goal, prove that every requirement was declared, guarantee bounded keyword search finds every synonym or indirect dependency, switch the host-selected model, provide core parallel mutation, observe platform tokens/model calls, or own Git/PR/CI/deployment/human product confirmation. The installed package verifier and Git metadata are trusted; external platforms own network isolation, and deliberate same-user/admin tampering remains outside the local threat model.

## License

MIT
