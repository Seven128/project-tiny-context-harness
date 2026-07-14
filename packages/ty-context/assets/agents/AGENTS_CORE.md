# Minimal Context Harness Protocol

This project uses Tiny Context. The Harness maintains Context quality and workflow authority; project tests, CI, smoke, browser evidence and human acceptance prove product quality.

Tiny Context has three capabilities:

- Minimal Context: durable project facts in `project_context/**`.
- Workflow Contract: the lightweight default behavior.
- Long-Task Workflow: explicit strict multi-SFC execution and machine completion authority.

## Default Workflow Contract

Unless an explicit long-task Skill or active Contract V3 binding applies:

1. Read `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml`, then only graph-relevant area/role Context.
2. For UI/product-surface/layout/information-placement work, check the surface's user decision, required information/actions/feedback and main-vs-drilldown ownership before narrowing to code. Use `context_surface_contract` when durable responsibility or information architecture is unclear or changes.
3. For Context authoring/migration, place facts by role: area/domain owns product scope; contract owns interfaces; foundation owns stable concepts; verification/deployment owns repeatable paths; implementation-index owns navigation; decision-rationale owns stable reasons.
4. Decide the one durable-fact result: `Context Delta: none|required`. Product/surface ownership, architecture, API/schema, state/recovery, dependency, security or repeatable verification/deployment changes are `required` and update owning Context before code. Local fixes preserving durable semantics are `none`.
5. Use the agent/platform's internal plan. Before editing, keep goal, boundaries/non-goals, controlling Context, likely implementation surfaces and verification clear. For high-risk work keep `Architecture Context Hit`, `Decision Rationale Hit: existing|required|none` and `Modularity Check: none|required|exception` inside this reasoning; they are not artifacts or additional deltas.
6. Implement, run project-owned verification, perform Contract Conformance and Context drift check, then report implementation, verification, Context status and blockers.

The default workflow never requires `plan.md`, a Task Contract file, Source-to-Context or Context-to-Implementation Markdown tables, a matrix, verdict, evidence ledger or result document. Optional scratch files have no fixed name/schema, are not Context or completion proof and are never registered in `context.toml`. Existing `plan.md` files remain ordinary user files and are not read as authority.

For external product/architecture/technical/acceptance sources, internally classify every material constraint as covered by Context, requiring a Context update, task-local, explicitly out of scope or requiring a genuine user decision. Conformance must confirm controlling Context reached the correct modules/surfaces/APIs/state machines/verification and avoided forbidden shortcuts.

## Long-Task Routing

Do not auto-detect task duration, file count or complexity and do not auto-create long-task state.

Routing precedence:

1. Active Contract V3 binding in the current worktree: resume it.
2. Explicit `/prepare-composite-long-task`: create/resume/execute a Campaign V5 with maximal-coherent Scope Fit V4.
3. Explicit `/composite-long-task-workflow`: execute one already-complete Contract V3 three-input SFC.
4. Explicit `/normal-long-task`: preserve source, generate one full acceptance checklist and optional target prompt; do not execute. Local Audit is opt-in.
5. Otherwise remain on the default Workflow Contract, even when work is long.

Composite inherits Context Priority, `Context Delta`, durable Context updates and final Context drift check. It replaces ordinary planning, implementation mapping, execution state, acceptance and completion with Source Coverage/Scope Fit, Packet/Goal, Contract V3 bindings/Change Envelope, Campaign/thread/receipt state, Slice Final Gate, Wave Integration Gate and same-snapshot Campaign Final Gate. It must not create or consume a second plan, matrix, verdict, ordinary Local Audit or hand-written complete state.

Campaign accepted authority is committed before idempotent owned-asset cleanup; rerunning an accepted Campaign returns finished.

Scope Fit preserves semantic completeness and the largest coherent independently accepted SFC before considering parallelism. File/layer boundaries, agent count, duration and parallel opportunity are never split reasons. Goal creation freezes the graph.

## Durable Facts And Generated Surfaces

- Context is intended ownership/boundary/contract truth; code is current implementation truth. Treat disagreement as implementation drift, missing work or stale Context, never as permission to silently follow code convenience.
- Long-term facts only go in `project_context/**` or `DESIGN.md` for durable visual-system facts. Do not store logs, reports, temporary JSON, raw evidence, secrets, acceptance artifacts or Composite runtime state there.
- Role-specific product/UIUX/development/surface work uses the matching `context_*` Skill when explicitly requested. Project-specific rules belong in separate project-local Skills, never package-managed generated Skills.
- Explicit full-project/source-pack/code-index export requests use `context_full_project_export`; exports stay under `tmp/ty-context/context-exports/**` and never enter Context.
- Explicit Tiny Context upgrade requests use `context_harness_upgrade` and run `upgrade` before standalone `sync`.
- Managed `AGENTS.md` blocks, `<harnessRoot>/ty-context-managed/**` and package-managed `context_*`, export, upgrade, ordinary-long-task and Composite Skills are generated/sync-overwritten. Do not put project-specific rules in them.
- `init`, `sync` and `upgrade` install/refresh enabled capability only; they never create, discover, import or mutate campaigns. Non-Codex defaults install portable core/workflow only; `ty-context enable composite-codex` explicitly installs Codex Hooks and Composite surfaces.

## Verification

- `make validate-context`: Context recoverability only.
- `make validate-harness`: Context plus touched-source modularity.
- `npx --yes --package project-tiny-context-harness@latest ty-context package check-source`: managed-source/package drift.

Every handoff reports exactly one of `Context: updated ...` or `Context: no durable fact change`. Never claim tests, deployment or acceptance from Context alone.
