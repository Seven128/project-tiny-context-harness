# Minimal Context Harness Protocol

This project uses Tiny Context. The Harness maintains durable Context and workflow authority; project tests, CI, browser/runtime evidence and human acceptance prove product quality.

Tiny Context has three capabilities:

- Minimal Context: durable project facts in `project_context/**`.
- Workflow Contract: lightweight default engineering behavior.
- Single-Goal Long-Task Workflow: explicit rolling delivery with machine completion authority.

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

Routing precedence:

1. If `.codex/ty-context-active-long-task.json` exists in the current repository, resume its workdir with `ty-context long-task resume <workdir>` in the current native Goal.
2. If the user explicitly invokes `/long-task-workflow`, prepare or resume one `long-task-delivery-v1` Delivery Contract and execute it in the current native Goal.
3. `/normal-long-task` is a retirement pointer only and routes to `/long-task-workflow`; it creates no checklist, target prompt or second authority.
4. Otherwise remain on the default Workflow Contract, even when work is long.

The long-task workflow uses exactly one native Goal, one selected repository/worktree and one `delivery-contract.yaml`. The Contract holds Product Authority, Technical Boundary Authority and Acceptance Authority. Outcomes are acceptance units, not worker, branch, worktree or model-session units. File-level implementation detail remains a rolling internal Frontier in the current Goal.

The supported CLI is:

- `ty-context long-task init <workdir>`
- `ty-context long-task compile <workdir>`
- `ty-context long-task verify <workdir> [--outcome <key>] [--check <key>]`
- `ty-context long-task status <workdir>`
- `ty-context long-task resume <workdir>`
- `ty-context long-task final-gate <workdir>`
- `ty-context long-task stop-check <workdir> [--message <text>]`
- `ty-context long-task close <workdir>`
- `ty-context long-task abandon <workdir>`

Compile freezes Contract, source, relevant Context, verifier, Oracle/runner definitions and repository/workdir identity. Targeted verify is diagnostic and never grants acceptance. Final Gate creates one current snapshot, reruns every declared Check on that snapshot, may deduplicate only identical execution identities inside that gate, and accepts only when all required current evidence passes. Stop allows completion only while the accepted receipt remains fresh against workspace, Contract, source, Context, runner, verifier and Hook identity. `close` requires fresh acceptance; `abandon` clears package state but preserves authored source and Contract files.

Risk routing is deterministic. L0 stays on the default workflow. L1 uses standard long-task delivery. Public API/schema, persistent data, migration, security/permission boundaries, irreversible effects, full-population operations, multi-repository change, or a critical path with weak observability impose an L2 strict floor. Strict proof obligations are compiler-enforced; explicit `standard` below the floor fails.

Tiny Context does not create or restore platform Goals, invoke models, spawn sub-agents, call an App Server, create branches/worktrees, merge, push, open PRs or manage process trees. Only Contract-declared project verification runners may execute product checks. Retired `composite-campaign` and `composite-long-task` commands are non-executing tombstones.

## Durable Facts And Generated Surfaces

- Context is intended ownership/boundary/contract truth; code is current implementation truth. Treat disagreement as drift, missing work or stale Context.
- Long-term facts only go in `project_context/**` or `DESIGN.md` for durable visual-system facts. Do not store logs, raw evidence, secrets, runtime state or acceptance receipts there.
- Role-specific product/UIUX/development/surface work uses the matching `context_*` Skill when explicitly requested.
- Full-project/source-pack/code-index exports stay under `tmp/ty-context/context-exports/**` and never enter Context.
- Explicit Tiny Context upgrades use `context_harness_upgrade` and run `upgrade` before standalone `sync`.
- Managed `AGENTS.md` blocks, `<harnessRoot>/ty-context-managed/**` and package-managed Skills are generated and sync-overwritten. Project-specific rules belong in separate project-local Skills.
- `init`, `sync` and `upgrade` install or refresh enabled capabilities only. They never import or execute historical long-task/Campaign files.
- Non-Codex defaults install portable core/workflow only; `ty-context enable long-task` explicitly installs the Long-Task Workflow Skill and completion Hook.

## Verification

- `make validate-context`: Context recoverability only.
- `make validate-harness`: Context plus touched-source modularity.
- `npx --yes --package project-tiny-context-harness@latest ty-context package check-source`: managed-source/package drift.

Every handoff reports exactly one of `Context: updated ...` or `Context: no durable fact change`. Never claim tests, deployment or acceptance from Context alone.
