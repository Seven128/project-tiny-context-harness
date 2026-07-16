# Minimal Context Harness Protocol

This project uses Tiny Context. The Harness maintains durable Context and workflow authority; project tests, CI, runtime evidence and human acceptance prove product quality.

Tiny Context has three capabilities:

- Minimal Context: durable project facts in `project_context/**`.
- Workflow Contract: lightweight default engineering behavior.
- Single-Goal Long-Task Workflow: explicit rolling delivery with a live machine-completion gate.

## Default Workflow Contract

Unless an active Single-Goal Long-Task binding exists:

1. Read `project_context/global.md`, `project_context/architecture.md` and `project_context/context.toml`, then only graph-relevant area/role Context.
2. For UI/product-surface work, confirm the user decision, required information/actions/feedback and main-versus-drilldown ownership before narrowing to code. Use `context_surface_contract` when durable responsibility is unclear or changes.
3. Place durable facts by role: area/domain owns product scope; contract owns interfaces; foundation owns stable concepts; verification/deployment owns repeatable paths; implementation-index owns navigation; decision-rationale owns stable reasons.
4. Decide exactly one durable-fact result: `Context Delta: none|required`. Product ownership, architecture, API/schema, state/recovery, dependency, security or repeatable verification/deployment changes are `required` and update owning Context before code. Local fixes preserving durable semantics are `none`.
5. Use the agent/platform internal plan. Keep goal, boundaries/non-goals, controlling Context, likely implementation surfaces and verification clear before editing. For high-risk work, keep `Architecture Context Hit`, `Decision Rationale Hit: existing|required|none` and `Modularity Check: none|required|exception` as internal routing and maintenance questions; they are not artifacts or additional deltas.
6. Implement, run project-owned verification, perform Contract Conformance and Context drift checks, then report implementation, verification, Context status and blockers.

The default workflow never requires a plan artifact, matrix, verdict, evidence ledger or result document. Optional scratch files are not Context or completion proof and are never registered in `context.toml`.

For external product, architecture, technical or acceptance sources, internally classify every material constraint as covered by Context, requiring a Context update, task-local, explicitly out of scope or requiring a genuine user decision. Conformance must confirm controlling Context reached the correct modules, surfaces, APIs, state machines and verification paths without forbidden shortcuts.

## Long-Task Routing

Do not infer long-task mode from duration, complexity, file count or agent preference.

1. If the Git common-dir active record and matching worktree Git-config marker exist, resume its workdir with `ty-context long-task resume <workdir>` in the current native Goal.
2. If the user explicitly invokes `/long-task-workflow`, perform the semantic Contract Boundary Check, then prepare or resume one `long-task-delivery-v2` Contract or logical Contract Bundle in the current native Goal.
3. `/normal-long-task` is a retirement pointer only. Otherwise remain on the default Workflow Contract, even when work is long.

The workflow uses exactly one native Goal and one selected repository/workspace. A large atomic delivery remains one logical Contract and may split only Outcome fragments under one root `delivery-contract.yaml`. Genuinely independent top-level deliveries run as separate Contracts; `delivery-set` is a fixed retired tombstone. Outcomes are acceptance/dependency units, not workers, branches, worktrees or model sessions.

Supported CLI:

- `ty-context long-task init <workdir>`
- `ty-context long-task compile <workdir> [--revise]`
- `ty-context long-task approve-authority-revision <workdir> --revision <sha>`
- `ty-context long-task explain <workdir>`
- `ty-context long-task verify <workdir> [--outcome <key>] [--check <key>]`
- `ty-context long-task status|resume|doctor|final-gate <workdir>`
- `ty-context long-task stop-check <workdir> [--message <text>]`
- `ty-context long-task close <workdir>`
- `ty-context long-task abandon <workdir> [--force-corrupt-state]`

Contract V2 compiles Global plus Product/Control/Non-completing/Technical Claims and rejects uncovered Claims. The first successful compile is Authority Lock; later Source/Context/Product/Global/verifier-content or proof-reduction changes compare against active authority regardless of progress, Receipt/cache deletion or restored code. Pure verifier relocation and proven proof/scope tightening auto-revise; content weakening needs exact user approval. Every path-bearing field uses one canonical grammar, and Check execution fields have a compile-time raw/per-Check/progress/final classification. Targeted verify rechecks active identity before progress writes.

Status, progress, Receipts and compiled cache are audit/recovery surfaces only. Commit, migration, clear and abandon share one active-state lock. Final Gate rechecks task/revision/compiled/worktree identity after all Checks; Stop/close use accepted-identity CAS and cannot clear a newer revision. Corrupt continuity is cleaned only by explicit `abandon --force-corrupt-state`. External confirmations remain explicit; machine acceptance never implies CI, deployment or human acceptance.

Risk routing is per Outcome. Public API/schema, persistent data, migration, security/permission boundaries, irreversible effects, full-population operations, or a critical path with weak observability impose strict proof on the affected Outcome. Risk downgrades are rejected. Multi-repository delivery is unsupported.

Tiny Context does not create or restore platform Goals, invoke models, spawn agents, call an App Server, create branches/worktrees, merge, push, open PRs or manage process trees. Only Contract-declared project verification runners may execute product checks. Network isolation is the responsibility of the external platform.

## Durable Facts And Generated Surfaces

- Context is intended ownership/boundary/contract truth; code is current implementation truth. Treat disagreement as drift, missing work or stale Context.
- Long-term facts only go in `project_context/**` or `DESIGN.md`. Do not store logs, raw evidence, secrets, runtime state or receipts there.
- Full-project/source-pack exports stay under `tmp/ty-context/context-exports/**` and never enter Context.
- Explicit Tiny Context upgrades use `context_harness_upgrade` and run `upgrade` before standalone `sync`.
- Managed `AGENTS.md` blocks, `<harnessRoot>/ty-context-managed/**` and package-managed Skills are generated and sync-overwritten.
- Non-Codex defaults install portable core/workflow only; `ty-context enable long-task` explicitly installs the Long-Task Workflow Skill and package-owned completion Hook.
- `init`, `sync` and `upgrade` never import or execute historical V1/Campaign state. Version 0.6.0 reports unfinished V1 authority as a manual migration and installs only the package-owned V2 Hook.

## Verification

- `make validate-context`: Context recoverability only.
- `make validate-harness`: Context plus touched-source modularity.
- `npm run test:long-task-performance --workspace project-tiny-context-harness`: independent large-repository budgets.
- `npx --yes --package project-tiny-context-harness@latest ty-context package check-source`: managed-source/package drift.

Every handoff reports exactly one of `Context: updated ...` or `Context: no durable fact change`. Never claim tests, deployment or acceptance from Context alone.
