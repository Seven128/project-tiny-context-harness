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

Tiny Context keeps those concerns narrow. `project_context/**` records durable ownership, architecture, contracts and repeatable verification. The default Workflow Contract guides ordinary work. The explicit Long-Task Workflow adds one machine-checked Delivery Contract, rolling repair verification, a same-snapshot Final Gate and Stop freshness.

It does not launch models, spawn agents, create branches or worktrees, merge, push, open pull requests, deploy, or claim to replace project tests and human acceptance.

## Capability Model

1. **Minimal Context** — small, role-aware durable facts under `project_context/**`.
2. **Workflow Contract** — Context-first default engineering behavior using the platform's internal plan; no required plan artifact.
3. **Long-Task Workflow** — explicit Single-Goal Rolling Delivery with `long-task-delivery-v2`, compiled Claim Coverage and a verifier-owned Live Final Gate.

Default profiles are `core-portable` and `workflow-default`. Enable the opt-in profile with:

```powershell
ty-context enable long-task
```

This installs the `/long-task-workflow` Skill and completion Hook. It does not install an agent runtime, model worker, scheduler, or Git orchestration assets.

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

Typical roles are area/domain, contract, foundation, decision-rationale, implementation-index, verification and deployment. Context owns durable intended boundaries; code owns current implementation; tests, CI, browser/runtime evidence and people own behavior and product acceptance.

Every engineering handoff reports one Context result:

```text
Context: updated <files/reason>
# or
Context: no durable fact change
```

## Default Workflow Contract

Ordinary tasks stay lightweight:

1. read minimum relevant Context;
2. decide `Context Delta: none|required`;
3. update owning Context first when durable semantics change;
4. use the platform's internal plan;
5. implement and run project-owned verification;
6. perform Contract Conformance and Context drift checks.

The default workflow creates no required `plan.md`, matrix, verdict, evidence ledger or second execution plan. Task length, file count and complexity never auto-enable long-task state.

Plan Validator commands no longer exist; existing plan, matrix or verdict files remain ordinary user files.

### Architecture And Modularity Guidance

Technical architecture support is a Minimal Context capability. For high-risk work, `Architecture Context Hit`, `Decision Rationale Hit: existing|required|none` and `Modularity Check: none|required|exception` are internal routing questions inside the platform's internal plan. No Task Contract or fixed `plan.md` is required. Do not invent rationale: store stable reasons, rejected alternatives or tradeoffs only in the smallest durable Context surface, and remember that architecture Context does not prove product quality.

`ty-context check-modularity` audits selected handwritten source. `validate-code-modularity` and `validate-harness` enforce it separately from `validate-context`.

#### Modularity Policy

Newly generated Harness configs default to `strict_except_generated`. Generated/build files remain excluded; `strict_except_generated` rejects configured `modularity.waivers`. Projects with bounded legacy exceptions may opt into `scoped_waivers`, whose entries require `path`, `category`, `owner`, `introduced_at`, `reason`, `tracking_issue` and `expiry_condition`.

### Product Surface Contract

`context_surface_contract` compiles durable screen/page/CLI responsibility using the existing `contract`, area/subdomain and verification roles; `product-surface-contract.md` is the package template. Product Surface Contract authoring uses Source-to-Context judgment and Contract Conformance; it must not add a new product-surface Context role or claim product-quality proof.

## Single-Goal Rolling Delivery

Use `/long-task-workflow` only when explicitly requested or when the current worktree already has an active long task. It uses:

- one platform-native continuing Goal;
- one user-selected repository/worktree;
- one top-level authority: one Contract or logical Contract Bundle;
- Outcome dependencies as acceptance readiness, not worker scheduling;
- a rolling internal implementation Frontier;
- targeted repair checks that never accept;
- a complete Final Gate on one current snapshot;
- a Stop Hook that rejects stale completion.

The platform owns physical Goal/session lifecycle. A later session runs `resume` to reconstruct semantic state; Tiny Context does not recreate the prior physical Turn.

### CLI

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

- `init` creates only a Contract template.
- `compile` generates Global plus Outcome Product/Control/Non-completing/Technical Claims, rejects uncovered Claims, preserves an immutable first baseline, calculates per-Outcome risk, freezes Source hashes, Context topology/files, canonical Product/Global semantics, owner/binding authority, resolved runners and verification inputs, and commits a complete Active Authority V3 snapshot in Git common-dir. The worktree marker binds task id, authority revision and compiled identity.
- `verify` writes scoped per-Check Progress Records. Records accumulate across Outcome/Check runs and can never create accepted authority.
- `status` reports each Outcome as `unverified`, `progress_passing`, `progress_failing`, `progress_stale` or `blocked_external`. It reads the common-dir authority snapshot and reports a missing or mismatched workdir cache as a repairable diagnostic.
- `resume` is read-only and reports task identity, risk, relevant Context, Git state, ready Outcomes, findings and the next safe action from the common-dir authority snapshot.
- `final-gate` requires a clean candidate commit, recompiles source authority and reruns every required Check on one Git-tree snapshot.
- `stop-check` and `close` run that Live Final Gate themselves. They never trust status, progress, a Receipt or compiled cache for acceptance; success atomically clears the active binding.
- `abandon` is explicit non-success cleanup; it preserves `source.md` and `delivery-contract.yaml` and never touches user Git state.

### Delivery Contract

`long-task-delivery-v2` keeps Product Authority, Technical Boundary Authority and Acceptance Authority as logical sections of one file. The compiler derives machine Claims for observable results, control states, non-completing outcomes, technical obligations and forbidden shortcuts:

```yaml
schema_version: long-task-delivery-v2
task:
  id: example-task
  title: Example task
  goal: Complete observable delivery goal
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
  product: { non_goals: [] }
  technical: { constraints: [], forbidden_paths: [], forbidden_shortcuts: [] }
  acceptance: { checks: [] }
outcomes:
  - key: observable-outcome
    title: Observable outcome
    depends_on: []
    product:
      observable_result: What a user or system can observe
      owner:
        label: Owning product or module boundary
        context_refs: [project_context/areas/main.md]
        path_globs: [src/**]
      owner_surfaces: []
      controls: []
      non_completing_outcomes: []
    technical:
      obligations: []
      expected_change_paths: ["src/**"]
      allowed_support_paths: ["tests/**"]
      forbidden_paths: []
      bindings: []
      forbidden_shortcuts: []
      rollback_and_recovery: null
    acceptance:
      checks: []
      population: null
      counterfactual_controls: []
```

Authors provide task, Outcome, control and Check keys. The compiler generates `OUT.<outcome-key>` and `CHECK.<outcome-key>.<check-key>` identities. It rejects unknown/duplicate keys, YAML aliases/tags/merges, dependency cycles, unsafe paths, missing Context/source/runner files, missing package scripts, unverifiable Outcomes, and UI Outcomes without browser proof.

Global non-goals, constraints and forbidden shortcuts generate `GLOBAL.non_goal.<key>`, `GLOBAL.constraint.<key>` and `GLOBAL.forbidden_shortcut.<key>`. They must be covered by Global Check Assertions using local refs. Non-goals and forbidden shortcuts require negative proof; constraints accept either polarity. Outcome and Global Checks cannot cross Claim scope. Global forbidden paths do not generate Claims because the changed-path boundary enforces them statically.

Supported runners are `package_script`, `project_binary`, `node_oracle` and `playwright_test`. Supported proof surfaces are `ui_browser`, `runtime_behavior`, `api_contract`, `data_state`, `security_boundary`, `population_coverage` and `implementation_structure`.

### Contract Bundle And Source Claims

A large atomic delivery remains one logical Contract. The root may replace inline `outcomes` with sorted `outcome_files`; fragments contain Outcome content only and share one binding, baseline, Final Gate and Receipt. File size, token count, implementation layers, parallelism or agent preference never justify multiple Contracts.

V2 authoring preserves original `source_paths` and direct `source_claims`, each disposed to generated Claim refs, a global constraint, a source-backed out-of-scope item or a decision-required blocker. Every Source Claim must bind a declared real Source file; `file#anchor` locations are allowed. Compiler coverage validates declared claims without claiming it discovered omitted requirements.

Delivery Set orchestration is retired. Genuinely independent release/rollback/owner/risk/product boundaries run as separate top-level Contracts. `ty-context delivery-set ...` returns a fixed non-executing tombstone.

Every Contract-authority, Source hash/file-set, Context topology/file-set/hash, Product semantic projection or Global semantic projection change requires `--revise`; ordinary compile cannot silently refreeze changed Source or Context. After execution begins, Source/Context/Product/Global semantic changes, Product Claim additions/removals/rewrites, runner or verification-input replacement, reduced `input_paths`, weakened `expected_output_paths`, other proof weakening and scope expansion require approval of an exact revision identity bound to the previous and next materials. Every Contract authority field has a compile-time policy classification so new fields cannot silently bypass revision handling. Only mechanical proof additions and machine-proven scope/input/output tightening revise automatically. Risk downgrade is rejected, the executing Agent cannot self-approve, the immutable initial baseline is retained and affected progress becomes stale.

Repository pattern matching, subset and overlap/disjoint use one AST and one restricted language: literal segments, `*`, `?`, full-segment `**` and simple extension patterns. Brackets, braces, extglob and non-segment `**` are rejected. Only proven disjointness separates protected paths; unknown relations fail closed. In particular, `**` overlaps verification inputs, `src/*.ts` is disjoint from `src/*.js`, and changing `src/safe/*.ts` to `src/safe/**` is widening even though the literal prefix is unchanged.

### Deterministic Risk

- **L0**: local, reversible, directly testable work stays on the default workflow.
- **L1 standard**: multiple observable Outcomes or cross-session recovery, with reliable executable checks.
- **L2 strict**: public API/schema, persistent data, migration, security/permission boundary, irreversible external effect, full-population operation, or a critical path with weak observability. Proof is bound to the affected Outcome; multi-repository delivery is unsupported.

An explicit user request can raise the level to strict. Explicit `standard` below the computed floor fails with `risk_level_below_required`. Strict negative, counterfactual, population, security, environment and rollback/recovery obligations are compiler-enforced as applicable. Changed paths outside the declared envelope return `scope_or_risk_escalation_required` and require the same Goal to revise and recompile the Contract.

### Evidence And Authority

Final acceptance is computed from executable current evidence, not agent prose. A command exit code, handwritten status, historical targeted pass or missing/weak proof cannot produce accepted. Every Assertion requires an explicit Observation; missing or type-incomparable values fail, implicit absence operators are unsupported, and negative proof uses an explicit value such as `equals: false`. Contract, source, relevant Context, Oracle/runner, verifier or workspace drift invalidates previous results.

The workdir `.ty-context/compiled-contract.json` is only a rebuildable cache projection. Previous authority, the immutable initial base, risk floor and Final Gate identity come only from the common-dir snapshot. Authority updates use compare-and-swap and publish the cache afterward; deleting or forging the cache cannot reset authority. Legacy `active-long-task-binding-v2` state migrates only when its cache fully matches every bound identity, otherwise doctor reports `active_authority_continuity_unrecoverable`.

Final Gate may run only Contract-declared verification commands and never production mutation/deployment/payment/migration execution. Retry defaults to none and is allowed once only for `transient_once` + idempotent + read-only/test-sandbox runners. Runners receive a minimal system environment whitelist plus only explicitly declared `env_var` requirements; undeclared secrets are not inherited. Protected authority/proof inputs reject symlinks and detectable hardlinks. Network isolation remains external. Counterfactual V2 accepts only exact designated Assertion failures with no artifact, population or other finding, and Population V2 proves exact entity coverage. Receipts are audit-only (`reusable_for_acceptance: false`). Every Outcome has an executable Check; human, CI, deployment and product confirmation live only in `external_confirmations`. A machine pass with pending confirmations reports `machine_accepted_external_pending`.

## Compatibility And Migration

Version 0.6.0 retires the V1 schema/runtime and repo-local Hook. Enable, disable and upgrade remove only exact Tiny Context managed Hook entries. Relocated package-owned absolute commands are recognized only when the known managed status and a known `node_modules`, pnpm or workspace-package layout both match; no-status and similar-name user Hooks remain. A command is never deleted merely because it contains `composite`. Upgrade reports unfinished V1 active state as `manual_required` and never imports V1 progress or Receipts into V2 authority. Delivery Set, `composite-campaign` and `composite-long-task` commands are non-executing tombstones.

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
- Core long-task execution intentionally provides no parallel mutation runtime.
- It does not observe platform token counts or model-call counts.
- Network policy is declared to runners and proxy variables are restricted, but this is not an OS sandbox.
- Same-user/admin filesystem tampering and Hook bypass are outside its security boundary.
- Git/PR/CI, deployment and human product confirmation remain external responsibilities.

## License

MIT
