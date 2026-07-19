# Project Tiny Context Harness

[![npm version](https://img.shields.io/npm/v/project-tiny-context-harness.svg)](https://www.npmjs.com/package/project-tiny-context-harness)
[![Package CI](https://github.com/Seven128/project-tiny-context-harness/actions/workflows/package.yml/badge.svg)](https://github.com/Seven128/project-tiny-context-harness/actions/workflows/package.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/Seven128/project-tiny-context-harness/badge)](https://securityscorecards.dev/viewer/?uri=github.com/Seven128/project-tiny-context-harness)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Open in GitHub Codespaces](https://img.shields.io/badge/open%20in-Codespaces-181717?logo=github)](https://codespaces.new/Seven128/project-tiny-context-harness)

Translations: [Chinese (Simplified)](README.zh-CN.md)

Project Tiny Context Harness is repo-native project memory for AI coding agents, plus a narrow delivery harness for trustworthy long-task completion. The product principle is: keep the memory, drop the ceremony. It adds durable project memory behind `AGENTS.md` without becoming an agent scheduler or Git orchestrator.

Public launch surfaces are English-first; localized documents are secondary entry points.

Best for:

- repositories where coding agents repeatedly rediscover project intent;
- teams using multiple agents or frequent fresh chats;
- maintainers who want durable Context and explicit long-task evidence.

Not for:

- replacing project tests, review, CI or human acceptance;
- autonomous Tiny Context execution;
- codebase semantic indexing or external docs retrieval.

Concrete shift:

```text
Before: ask a fresh agent to read the repo and tell you what matters.
After: ask it to read AGENTS.md and project_context/** first, then summarize goal, non-goals, architecture boundaries and validation paths before proposing code.
```

What gets added:

```mermaid
flowchart LR
  A["Fresh agent session"] --> B["AGENTS.md startup router"]
  B --> C["project_context/** durable facts"]
  C --> D["Goal, boundaries, validation paths"]
  D --> E["Implementation and delivery work"]
  F["Tests / CI / review"] --> G["Product quality evidence"]
  C -. "does not own" .-> G
```

![Project Tiny Context Harness terminal demo](https://raw.githubusercontent.com/Seven128/project-tiny-context-harness/main/docs/launch/assets/demo-terminal.gif)

The demo shows the core loop: initialize `AGENTS.md` and `project_context/**`, run `validate-context`, then ask a fresh agent to recover intent before proposing code. Use the npm install path below, or inspect the no-install previews first.

Install:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
```

No-install preview:

- Read the [fresh-agent recovery walkthrough](docs/examples/fresh-agent-recovery.md).
- Inspect the [Minimal Context sample guide](docs/examples/minimal-context-sample.md).
- Browse the tiny generated repository at [examples/minimal-context-sample/](examples/minimal-context-sample/).

## Why It Exists

Coding agents need two different kinds of help:

- durable facts that survive sessions without loading the whole repository;
- trustworthy completion checks when a task spans many edits or context compactions.

Tiny Context keeps those concerns narrow. `project_context/**` records durable ownership, architecture, contracts and repeatable verification. The default Workflow Contract combines manifest routing with one bounded Context search before `Context Delta`. The explicit Long-Task Workflow adds one machine-checked Delivery Contract, a one-time post-Authority-Lock model choice, rolling repair verification, a same-snapshot Final Gate and Stop freshness.

It does not launch or switch models, spawn agents, create branches or worktrees, merge, push, open pull requests, deploy, or claim to replace project tests and human acceptance.

## Capability Model

1. **Minimal Context** — small, role-aware durable facts under `project_context/**`.
2. **Workflow Contract** — Context-first default engineering behavior using the platform's internal plan; no required plan artifact.
3. **Long-Task Workflow** — explicit Single-Goal Rolling Delivery with `long-task-delivery-v2`, compiled Claim Coverage and a verifier-owned Live Final Gate.

The opt-in long-task profile also provides `/source-plan-authoring`, an upstream Source-quality helper rather than another authority layer.

Default profiles are `core-portable` and `workflow-default`. Enable the opt-in profile with:

```powershell
ty-context enable long-task
```

This installs `/source-plan-authoring`, `/long-task-workflow` and the completion Hook. It does not install an agent runtime, model worker, scheduler, or Git orchestration assets.

## Try It In 60 Seconds

```sh
mkdir project-tiny-context-harness-demo
cd project-tiny-context-harness-demo
git init
npm init -y
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
make validate-context
```

Then open `AGENTS.md`, `project_context/global.md` and `project_context/architecture.md`.

Expected result:

```text
AGENTS.md
project_context/
  context.toml
  global.md
  architecture.md
  areas/main.md
  areas/main/verification.md
```

Fresh-agent test prompt:

```text
Read AGENTS.md and project_context/** first. Summarize the project goal, non-goals, architecture boundaries, validation entry points and next safe action before proposing code changes.
```

For an existing repository, use `npx --yes --package project-tiny-context-harness@latest ty-context init --adopt`.

### Source checkout preview:

Open <https://codespaces.new/Seven128/project-tiny-context-harness>, or run locally:

```sh
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart
npm run preview:pack
```

The smoke packs the local workspace, installs it into a disposable repo and validates the generated Minimal Context files. Use this path for package development, source-preview testing or private review.

```sh
cd /path/to/your/test-repo
npm install -D /path/to/project-tiny-context-harness/tmp/ty-context/source-preview/package/project-tiny-context-harness-0.6.0.tgz
npx --no-install ty-context init --adopt
make validate-context
```

If it fails, open a [Source preview report](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=source_preview_report.yml).

## Positioning

| Adjacent tool type | Use it for | Harness stance |
|---|---|---|
| Spec-first kits | Turning a feature idea into structured specs and plans. | Complementary; Harness keeps durable repo facts beyond one feature spec. |
| BMAD-style workflows and full Tiny Context processes | Role/process ceremony for selected work. | Lighter default; ordinary work stays Context-first. |
| Task Master-style planners | Backlog decomposition and task state. | Complementary; Harness does not own backlog state. |
| Context7/Serena-style retrieval | External docs, symbols or repository retrieval. | Complementary; Harness owns local intended boundaries. |

## Minimal Context

The default read path is:

```text
project_context/global.md
project_context/architecture.md
project_context/context.toml
minimum graph-relevant area/role Context
```

Only near-universal recovery facts should use `read_policy = "default"`; specialized architecture, contract, deployment and historical detail should be task-triggered `on-demand` Context. Before deciding `Context Delta`, the Agent also runs one bounded text search over `project_context/**` using a small set of high-signal task terms such as explicit area/module names and API/schema/state/security/verification/deployment language. Matching files are merged with manifest candidates and filtered by semantic relevance. This is not a vector or persistent retrieval system and creates no index, cache, registry, search state or authority.

`ty-context doctor` reports the deterministic default read footprint, per-file/total soft-budget overages and byte-identical default files. These are advisory maintenance signals, not a new validation gate or workflow state.

Typical roles are area/domain, contract, foundation, decision-rationale, implementation-index, verification and deployment. Context owns durable intended boundaries; code owns current implementation; tests, CI, browser/runtime evidence and people own behavior and product acceptance.

Every engineering handoff reports one Context result:

```text
Context: updated <files/reason>
# or
Context: no durable fact change
```

## Default Workflow Contract

Ordinary tasks stay lightweight:

1. read core/default Context and collect manifest candidates;
2. run one bounded Context search over `project_context/**` and read only relevant matches;
3. decide `Context Delta: none|required`;
4. update owning Context first when durable semantics change;
5. use the platform's internal plan;
6. implement and run project-owned verification;
7. perform Contract Conformance and Context drift checks.

The default workflow creates no required `plan.md`, matrix, verdict, evidence ledger, persistent Context-search index or second execution plan. Task length, file count and complexity never auto-enable long-task state.

Plan Validator commands no longer exist; existing plan, matrix or verdict files remain ordinary user files.

### Architecture And Modularity Guidance

Technical architecture support is a Minimal Context capability. For high-risk work, `Architecture Context Hit`, `Decision Rationale Hit: existing|required|none` and `Modularity Check: none|required|exception` are internal routing questions inside the platform's internal plan. No Task Contract or fixed `plan.md` is required. The architecture gate is risk-triggered for durable module/capability boundaries, public API/schema/data or persistence, source-of-truth/state ownership, dependency direction, cross-area work, migration/security/recovery and reusable abstractions. It resolves owner, unique source of truth, dependency direction, interface/state lifecycle, failure/recovery/compatibility, forbidden shortcuts and the project-owned executable check that protects the boundary. Small fixes do not pay this ceremony.

Do not invent rationale: store stable reasons, rejected alternatives or tradeoffs only in the smallest durable Context surface, and remember that architecture Context does not prove product quality. Harness may route repository-native lint/AST/dependency/contract checks, but it does not become a language-generic architecture analyzer.

`ty-context check-modularity` audits selected handwritten source and identifies the highest-risk function and line for statement/branch findings. `validate-code-modularity` and `validate-harness` enforce it separately from `validate-context`.

#### Modularity Policy

Newly generated Harness configs default to `strict_except_generated`. Generated/build files remain excluded; `strict_except_generated` rejects configured `modularity.waivers`. Projects with bounded legacy exceptions may opt into `scoped_waivers`, whose entries require `path`, `category`, `owner`, `introduced_at`, `reason`, `tracking_issue` and `expiry_condition`.

### Product Surface Contract

`context_surface_contract` compiles durable screen/page/CLI responsibility using the existing `contract`, area/subdomain and verification roles; `product-surface-contract.md` is the package template. Product Surface Contract authoring uses Source-to-Context judgment and Contract Conformance; it must not add a new product-surface Context role or claim product-quality proof.

### Visual Delivery Guidance

For material design-system, redesign, high-fidelity or visual-polish work, `context_uiux_design` keeps a task-local risk-proportional Visual Coverage Set across production surfaces/components, viewports, themes/modes, states, content stress and accessibility/motion conditions. It is internal planning, not a required matrix or authority. Durable surface/interaction facts remain in `project_context/**`; durable visual-system semantics and rationale remain in `DESIGN.md`; the project names one authored exact token source and generation direction. `context_development_engineer` binds that intent to production components/routes and reports only combinations actually rendered and checked, so a detached static kit or mock cannot substitute for product UI evidence.

An explicit Long-Task expresses material visual expectations through the existing Requirement, Control, Assertion, `ui_browser`, verification-input and `external_confirmation` mechanisms. Acceptance-affecting screenshot baselines are frozen verifier inputs, generated screenshots/diffs are review artifacts, and subjective design or new-baseline approval remains external. This guidance adds no visual Schema, risk level, lifecycle state, Gate or required artifact and does not change the default Workflow Contract.

### Optional Source Plan Authoring

Use `/source-plan-authoring` only when explicitly asking for an initial plan, Source Plan, source draft, or an audit/refinement of such a plan for later implementation or Contract authoring.

It outputs one self-contained Markdown Source Plan that:

- preserves direct requirements and their qualifiers;
- marks necessary derivations and cites what they derive from;
- turns unsupported product choices into `DEC`/`decision_required`;
- splits Outcomes only by independently decidable observable results;
- uses stable semantic keys and explicit anchors for important Source items;
- separates mandatory `OBL` obligations from advisory `HINT` suggestions;
- independently records each decided `CTRL` Location, User task, Trigger, Input, Loading, Empty, Success, Failure and Feedback field;
- uses `NCOMP` for explicit results that must not count as completion;
- states each `RISK` Fact, one Affected Outcome, Basis and Consequence, or emits `DEC` when the pair is unknown; Fact is exactly one of `public_api_or_schema_change`, `persistent_data_change`, `data_migration`, `security_boundary_change`, `permission_boundary_change`, `irreversible_external_effect`, `critical_user_path`, `full_population_operation`, `multi_repository_change` or `weak_observability`;
- writes one Given/When/Then scenario per `AC`, names its accepted `REQ`/`CTRL`/`OBL`/`NCOMP` keys, and hides no new requirement in AC text.

It does not update project Context, bind real repository owners/paths/runners, generate Delivery Contract YAML, run implementation, create workflow state or claim completion. `HINT` is not a Material Source Item, and Source Plan authoring emits no `ty-source-item` markers; repository-aware Long-Task authoring inserts markers later. A Source Plan is Source, not a Contract Draft. Its structure is an authoring fast path, not a required input protocol; ordinary prose plans remain valid Long-Task Source.

## Single-Goal Rolling Delivery

Use `/long-task-workflow` only when explicitly requested or when the current worktree already has an active long task. It uses:

- one platform-native continuing Goal;
- one user-selected repository/worktree;
- one complete selected delivery, one Contract and one Final Gate;
- Outcome dependencies as acceptance readiness, not worker scheduling;
- one user model-choice checkpoint after first Authority Lock and before implementation;
- a rolling internal implementation Frontier;
- targeted repair checks that never accept;
- a complete Final Gate on one current snapshot;
- a Stop Hook that rejects stale completion.

Long-Task Contract authoring preserves stable Source keys and anchors where practical. Meaning-preserving structural decomposition and evidence-backed repository binding may continue; new business rules, defaults, recovery behavior, permissions or scope become `decision_required` instead of being silently added. Missing recommended Source Plan structure never blocks authoring, but the marker-only Material Source Item enumeration required for activation does.

Before the first successful formal Compile, `delivery-contract.yaml` is one non-authoritative Contract Draft. `/long-task-workflow` keeps revising that same Draft across repository/Context reads and Preflight repair rounds; it does not require one response to produce a complete Contract. Draft authoring is integrated because repository bindings and verification inputs need real evidence, Preflight findings must feed back into the same object, and a separate handoff would risk lost meaning or a second plan/authority. No standalone Contract Draft Skill, Draft Receipt or Authoring State exists.

The first successful Compile creates Authority Lock and returns `execution_model_checkpoint.required: true`. Before implementation, the Agent asks the user to `continue_current_model` or switch models and then resume the active Long-Task. A task-specific model strategy already stated explicitly satisfies the checkpoint. Later Compile revisions return `required: false`; Harness does not switch models, persist acknowledgement/model-route state or repeat the pause.

The package-managed Long-Task Skill uses progressive disclosure: its main `SKILL.md` keeps the objective, boundaries and phase routing; one-level references are read only for Contract authoring, evidence design or authority lifecycle. This reduces routine instruction load without moving any rule into a second authority. When Source or controlling Context declares an architecture invariant, the Contract uses existing technical obligations/global constraints/forbidden shortcuts, owner/path/Binding boundaries and a project-owned executable Check. Functional acceptance cannot substitute when the architecture invariant can fail independently.

A Draft Outcome is simply an Outcome before Authority Lock. Outcomes split independently observable, decidable and target-verifiable results so the current Goal can keep a smaller dependency-ready working set, target verification, localize failures, resume findings and invalidate stale local results. `depends_on` expresses acceptance readiness; the Rolling Frontier is temporary. An Outcome is not a Worker, scheduler task, queue or parallelism unit. Outcome decomposes execution and diagnosis, not completion authority: targeted passes never replace the one complete Final Gate on the current final snapshot.

The platform owns physical Goal/session lifecycle. A later session runs `resume` to reconstruct semantic state; Tiny Context does not recreate the prior physical Turn.

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
- `preflight` applies Compact defaults and reports all discoverable Source/REQ/CTRL/OBL/AC, Context, risk, path/binding, runner/input and proof diagnostics. Exact duplicate diagnostics are merged with `occurrences`; known problems may include stable `refs` and a safe `repair_hint` that never weakens authority or invents product semantics. It is read-only: no Authority Lock, marker, cache, progress, Receipt, pending revision, state lock or project Check.
- `compile` generates Global plus Outcome Result/Requirement/Control-field/Non-completing/Technical Claims, rejects uncovered Claims, preserves an immutable first baseline and makes the first successful formal Compile the Authority Lock. The first result also includes `execution_model_checkpoint.required: true`; later Compile results return `required: false`. Every revision compares against active authority regardless of progress, Receipt/cache deletion or implementation restoration. Source/Context/Product/Acceptance/Global/verifier materials, owner/binding authority, resolved runners and verification inputs are frozen in the common-dir Active Authority V3 snapshot; the model-choice result is not stored as Authority state.
- `verify` writes scoped per-Check Progress Records only after rechecking active task/revision/compiled/worktree identity. A concurrent revision returns `active_authority_changed_during_verify` and writes no stale progress.
- `status` reports each Outcome as `unverified`, `progress_passing`, `progress_failing`, `progress_stale` or `blocked_external`. It also reports the fresh Final Receipt as `final_workflow_status` (or `null` after drift) and the active Contract's complete `external_confirmations`. It reads the common-dir authority snapshot and reports a missing or mismatched workdir cache as a repairable diagnostic.
- `resume` is read-only and reports task identity, risk, relevant Context, Git state, the same `final_workflow_status` and external confirmations, ready Outcomes, findings and the next safe action from the common-dir authority snapshot.
- `final-gate` requires a clean candidate commit, recompiles source authority, reruns every required Check on one Git-tree snapshot and rechecks active identity before acceptance.
- `stop-check` and `close` run that Live Final Gate themselves. They never trust status, progress, a Receipt or compiled cache for acceptance; success clears only the accepted identity through CAS. When machine scope passes with external work pending, the Stop Hook allows stopping but shows a non-blocking `systemMessage`; `close` returns `workflow_status` plus all `external_confirmations`. `status: closed` means only that machine Authority was cleared, not that complete external delivery finished.
- `abandon` is explicit non-success cleanup. `--force-corrupt-state` is reserved for invalid/mismatched/legacy-unrecoverable state or a stale active lock and removes only deterministic local active state plus `<workdir>/.ty-context/**`; Contract, Source, Context and Git content are preserved.

### Delivery Contract

`long-task-delivery-v2` keeps Product Authority, Technical Boundary Authority and Acceptance Authority as logical sections of one file. Compact YAML omits only deterministic defaults; the normalized Contract and all hashes are identical to the expanded form. The compiler derives machine Claims for observable results, atomic Requirements, control fields including location, non-completing outcomes, technical obligations and forbidden shortcuts:

<!-- long-task-public-contract-example:start -->
```yaml
schema_version: long-task-delivery-v2
task:
  id: example-task
  title: Example task
  goal: Complete observable delivery goal
  source_paths: [plans/example.md]
  context_refs: [project_context/areas/main.md]
source_claims:
  - key: observable-requirement
    source_ref: plans/example.md#observable-requirement
    statement: The outcome is observable.
    disposition:
      type: claim
      refs: [observable-outcome.requirement.observable]
risk:
  facts: {}
global: {}
outcomes:
  - key: observable-outcome
    title: Observable outcome
    product:
      observable_result: What a user or system can observe
      owner:
        label: Owning product or module boundary
        context_refs: [project_context/areas/main.md]
        path_globs: ["src/**", "tests/**"]
      requirements:
        - key: observable
          statement: The outcome is observable.
          required_proof_surfaces: [runtime_behavior]
    technical:
      expected_change_paths: ["src/**"]
      bindings:
        - key: observable-carrier
          kind: file
          target: src/observable.ts
          carrier_paths: [src/observable.ts]
          existence: planned
    acceptance:
      checks:
        - key: runtime
          proof_surface: runtime_behavior
          runner:
            type: node_oracle
            target: tests/runtime.mjs
            effect: read_only
          verification_inputs: [tests/runtime.mjs]
          input_paths: [src/observable.ts]
          expected_output_paths: [src/observable.ts]
          positive_assertions:
            - key: observable-ac
              criterion: The declared requirement is observable.
              claims: [result, requirement.observable]
              observation: result
              operator: equals
              expected: true
      counterfactual_controls:
        - key: remove-observable-carrier
          binding_key: observable-carrier
          claims: [result, requirement.observable]
          check_key: runtime
          mutation:
            type: remove_paths
            paths: [src/observable.ts]
          expected_assertion_failures: [observable-ac]
```
<!-- long-task-public-contract-example:end -->

Authors provide task, Outcome, control and Check keys. The compiler generates `OUT.<outcome-key>` and `CHECK.<outcome-key>.<check-key>` identities. It rejects unknown/duplicate keys, YAML aliases/tags/merges, dependency cycles, unsafe paths, missing Context/source/runner files, missing package scripts, unverifiable Outcomes, and UI Outcomes without browser proof.

Global non-goals, constraints and forbidden shortcuts generate `GLOBAL.non_goal.<key>`, `GLOBAL.constraint.<key>` and `GLOBAL.forbidden_shortcut.<key>`. They must be covered by Global Check Assertions using local refs. Non-goals and forbidden shortcuts require negative proof; constraints accept either polarity. Outcome and Global Checks cannot cross Claim scope. Global forbidden paths do not generate Claims because the changed-path boundary enforces them statically.

Claim-bearing structured Global Checks also declare `global.acceptance.counterfactual_controls`. Each control uses `binding_ref: <outcome-key>.<binding-key>` to reuse an Outcome-owned implementation carrier; no separate Global Binding layer exists. An `existing` mutation target must exist at Preflight/Compile, while a `planned` target may be absent until implementation but must exist at Final Gate and participates in Progress freshness.

Supported runners are `package_script`, `project_binary`, `node_oracle` and `playwright_test`. Supported proof surfaces are `ui_browser`, `runtime_behavior`, `api_contract`, `data_state`, `security_boundary`, `population_coverage` and `implementation_structure`.

### One Contract And Source Claims

Every complete delivery selected by the user remains one Contract and one Final Gate, even when Outcomes are weakly related. Outcome boundaries exist only for independently decidable, target-verifiable results and never for output length, YAML/file size, frontend/backend layers, module count, parallelism or Agent capacity. New authoring uses inline Outcomes. Existing `outcome_files` remains parser compatibility for physical file organization only and creates no semantic, state or completion boundary.

V2 authoring requires at least one real `source_path` and one `source_claim`. During authoring, every Material Source Item in the original Markdown is wrapped without rewriting it:

```markdown
<!-- ty-source-item:start key=save-failure kind=requirement -->
Saving failure preserves the user's input and shows the reason.
<!-- ty-source-item:end -->
```

Supported kinds are `outcome_result`, `requirement`, `control`, `acceptance`, `technical_obligation`, `non_completing`, `non_goal`, `forbidden_shortcut`, `risk_fact`, `external_confirmation` and `decision`. A risk marker additionally carries its exact pair, for example `<!-- ty-source-item:start key=permission-risk kind=risk_fact fact=permission_boundary_change outcome=observable-outcome -->`. Every declared Source file contains at least one Material Item; background-only references stay outside Source Authority. Marker keys and Source Claim keys must be set-equal and globally unique across all Source files. Nested, overlapping, unclosed, empty or invalid markers fail Compile. Each `source_claim.statement` must match the marked text after only line-ending, surrounding-blank-line and trailing-space normalization.

Typed dispositions keep overall results, Requirement/Control/Obligation/Non-completing Claims, one named Acceptance Assertion, Global constraints/non-goals, declared Fact/Affected-Outcome risk pairs, external confirmations and genuine decisions distinct. Risk marker metadata must exactly equal its disposition and declared risk fact, and each Fact/Outcome pair has one Source owner. Source Plan and Runtime use the same ten Fact names: data migration is `data_migration`, a weakly observable critical path is two independent `critical_user_path` and `weak_observability` items, and `multi_repository_change` stays in Source until Compiler rejection. Every other non-decision Source item owns exactly one canonical target of the same kind and normalized text, and no target may have two Source owners. An Outcome Source acceptance maps to one `<outcome>.<check>.<assertion>` whose criterion is text-identical and which proves an independently Source-backed non-Result Claim. A Global Source acceptance maps to `GLOBAL.<check>.<assertion>`, is also criterion-identical, proves no Outcome Claim and includes at least one independently Source-backed Global non-goal, constraint or forbidden-shortcut Claim. `out_of_scope` is retired: an explicit Source non-goal needs covered negative proof, while excluding an in-scope item requires `decision_required`. Ordinary prose and Source Plans remain valid after marker-only enumeration; Compiler coverage is honest about being unable to discover unmarked natural-language requirements.

Delivery Set orchestration and top-level Contract splitting within one selected delivery are retired. `ty-context delivery-set ...` returns a fixed non-executing tombstone.

Every Contract-authority, Source hash/file-set, selected Context authority structure/file-set/hash, Product/Global semantic or verifier-content change requires `--revise`; ordinary Compile cannot silently refreeze it. Retrieval-only `context.toml` changes do not revise active Authority, while selected ownership, role/dependency and content changes remain protected. After Authority Lock, reductions and Product Claim additions require approval of an exact revision identity. Pure verifier relocation and proven tightening may revise automatically.

Every path-bearing field uses one canonical grammar before hashing and matching. Windows separators and one leading `./` normalize to `/`; runner `cwd` alone may be `.`. Internal `.`/`..`, controls, empty segments, absolute/drive/UNC paths, brackets, braces, parentheses/extglob and non-segment `**` are rejected. Pattern matching, subset and overlap/disjoint use the same AST, and unknown relations fail closed.

### Deterministic Risk

- **L0**: local, reversible, directly testable work stays on the default workflow.
- **L1 standard**: multiple observable Outcomes or cross-session recovery, with reliable executable checks.
- **L2 strict**: the same Long-Task workflow and Outcome model, with stronger proof on affected public API/schema, persistent data, migration, security/permission, irreversible, full-population or weak-observability critical-path Outcomes. Multi-repository delivery is unsupported.

An explicit user request can raise the level to strict. Explicit `standard` below the computed floor fails with `risk_level_below_required`. Strict negative, counterfactual, population, security, environment and rollback/recovery obligations are compiler-enforced as applicable. Changed paths outside the declared envelope return a `scope_escape` Finding and require the same Goal to review risk/ownership, revise and recompile the Contract.

### Evidence And Authority

Final acceptance is computed from executable current evidence, not agent prose. Evidence adapters derive from runner kind: `playwright_test` produces `playwright_json_v1` and is the only adapter allowed for `ui_browser`; package scripts, project binaries and Node oracles produce `structured_json_v2` for all non-browser surfaces. The adapter is part of acceptance, raw-execution, compiled, progress and Receipt identity.

Every Outcome has at least one non-Result atomic Claim, and a Claim is covered only when all `required_proof_surfaces` are covered. Claim-bearing assertions use explicit expected-value comparisons; unary `truthy`/`falsy` are forbidden, and `exists` is limited to `implementation_structure` obligations. Across all Checks sharing one Raw Execution identity, one claim-bearing Observation belongs to one Assertion. Playwright Claim proof has one canonical form: `playwright.case.<ac-key>.passed equals true`. Missing, skipped, flaky, unexpected, failed or duplicate-within-project ACs fail closed; the same AC across distinct Playwright projects aggregates only when every instance passes. Decoder diagnostic fields such as aggregate pass, executed, skipped, status and counts cannot prove Claims.

Outcome Counterfactuals bind a local Binding; Global Counterfactuals bind an Outcome-owned `binding_ref`. Both may mutate only a proven subset of carriers. `structured_json_v2` requires completed exit-zero execution with exactly the expected `assertion_value_mismatch` set. A weak `playwright_json_v1` Counterfactual may accept exit one only under exact, complete unexpected-instance accounting; ordinary Playwright Baseline Checks still require exit zero. Standard frozen Playwright content is trusted verifier input. For a `weak_observability` Outcome, every claim-bearing Playwright AC and related Claim needs same-Check sensitivity. Claim and Population proofs are emitted only after the complete Check status is `passed`.

Raw Execution identity binds frozen runner identity plus canonical declared Environment Requirements, never actual environment values. A Playwright Test uses `[ac:<assertion-key>]`; one Test may bind at most one declared AC. Every Claim-bearing structured Check needs same-Check, Claim-related Counterfactual sensitivity; unrelated Artifacts or another Check do not count. Counterfactual Findings are projected into their owning Check Result before Progress is written, so status/resume recover the Finding without a new Global Outcome state. Explain traces Source Item → canonical target → Claim or Assertion → required surfaces → Check → adapter → Observation.

The workdir `.ty-context/compiled-contract.json` is only a rebuildable cache projection. Previous authority, the immutable initial base, risk floor and Final Gate identity come only from the common-dir snapshot. Commit, verifier migration, clear and abandon share one active-state lock; Final/Verify recheck identity and Stop/close use accepted-identity CAS. Development-period V2 Active Authority, Progress and Receipts are not migrated. Corrupt continuity is recovered explicitly with `abandon --force-corrupt-state`.

Final Gate may run only Contract-declared verification commands and never production mutation/deployment/payment/migration execution. Retry defaults to none and is allowed once only for `transient_once` + idempotent + read-only/test-sandbox runners. Runners receive a minimal environment whitelist plus only declared environment requirements. Protected authority/proof inputs reject symlinks and detectable hardlinks. Network isolation remains external. Receipts are audit-only (`reusable_for_acceptance: false`). Human, CI, deployment and product confirmation live only in `external_confirmations`; a machine pass with pending confirmations reports `machine_accepted_external_pending`.

## Compatibility And Migration

Version 0.6.0 retires the V1 schema/runtime and repo-local Hook. Enable, disable and upgrade remove only exact Tiny Context managed Hook entries. Relocated package-owned absolute commands are recognized only when known managed status and package layout match; similar-name user Hooks remain. Upgrade never imports V1 progress or Receipts into V2 authority. Delivery Set, `composite-campaign` and `composite-long-task` commands are non-executing tombstones.

Version 0.6.0 defines the first public V2 semantics while retaining the `long-task-delivery-v2` schema name and physical `outcome_files` parser form. Optional Source Plan authoring adds no Schema, CLI, Preflight, Compile, Validator, Receipt, Authority or state. Preflight and direct Compile use one activation-safety kernel.

`/normal-long-task` is also a retirement pointer to `/long-task-workflow`; it creates no checklist, prompt, audit, matrix, verdict or second authority.

### Package update modes

After updating the package, run `ty-context upgrade`. Use `ty-context upgrade --check` first when you need a read-only plan.

Release metadata declares one update mode: `sync-only`, `upgrade-required` or `manual-required`. Upgrade plans report steps as `safe_pending`, `manual_required` or `blocked`. A `sync-only` release may use `sync`; `sync` does not run migrations. An `upgrade-required` release must run upgrade, while `manual-required` includes an explicit operator step.

## Development And Verification

```powershell
npm install
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

`npm run preview:pack` produces a local preview named `project-tiny-context-harness-0.6.0.tgz` under the preview output directory.

## Community And Further Reading

Feedback from real repositories is especially useful. Open an [adoption report](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=adoption_report.yml) with the recovery problem and what remained unclear.

Early feedback and starter issues:

- Report a [Context recovery gap](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=context_gap.yml) through `context_gap.yml`.
- Share results in the pinned [adoption reports issue](https://github.com/Seven128/project-tiny-context-harness/issues/4).
- Pick a starter issue: [demo](https://github.com/Seven128/project-tiny-context-harness/issues/5), [sample walkthrough](https://github.com/Seven128/project-tiny-context-harness/issues/6), [benchmark rerun](https://github.com/Seven128/project-tiny-context-harness/issues/7) or [launch FAQ](https://github.com/Seven128/project-tiny-context-harness/issues/8).
- Keep claims narrow: recovery evidence is useful; benchmark speedup claims need fresh Minimal Context benchmark runs.

Read the [roadmap](docs/roadmap.md), [Benchmarking And Evidence](docs/benchmarking.md), [comparison guide](docs/comparison.md), [adoption guide](docs/adopt-existing-repo.md), [agent surface recipes](docs/agent-surface-recipes.md) and [FAQ](docs/faq.md).

For concrete examples, see the [fresh-agent recovery walkthrough](docs/examples/fresh-agent-recovery.md), [Minimal Context sample guide](docs/examples/minimal-context-sample.md) and [browseable sample repository](examples/minimal-context-sample/). The longer argument is [Fresh coding-agent sessions need project memory, not more ceremony](docs/articles/fresh-agent-project-memory.md).

## Honest Limits

- Tiny Context does not create or restore a platform Goal or physical session.
- It cannot prove that a user declared every real requirement.
- Bounded Context keyword search can still miss synonyms or indirect dependencies; it supplements rather than replaces semantic judgment.
- Harness cannot switch the host-selected model; it only asks for the one post-Authority-Lock user choice.
- Core long-task execution intentionally provides no parallel mutation runtime.
- It does not observe platform token counts or model-call counts.
- Network policy is declared to runners and proxy variables are restricted, but this is not an OS sandbox.
- Same-user/admin filesystem tampering and Hook bypass are outside its security boundary.
- Git/PR/CI, deployment and human product confirmation remain external responsibilities.

## License

MIT
