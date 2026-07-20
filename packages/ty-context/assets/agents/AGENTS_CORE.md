# Minimal Context Harness Protocol

This project uses Tiny Context. The Harness maintains durable Context and workflow authority; project tests, CI, runtime evidence and human acceptance prove product quality.

Tiny Context has three capabilities: Minimal Context, the default Workflow Contract, and the explicitly enabled Single-Goal Long-Task Workflow.

## Default Workflow Contract

Unless an active Long-Task binding exists:

1. Read `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml` and the default area root, then collect graph/trigger candidates.
2. Before deciding `Context Delta`, run one bounded text search over `project_context/**` using a small set of high-signal task terms such as explicit area/module names and API/schema/state/security/verification/deployment terms. Merge matching Context with manifest candidates and read only relevant files; search supplements rather than replaces semantic judgment.
3. For UI/product-surface work, confirm information/action/feedback ownership and use `context_surface_contract` when durable responsibility is unclear or changes; contract owns interfaces and existing area/subdomain/verification roles own the project facts.
4. Decide exactly one `Context Delta: none|required`. Update owning Context before code when durable product ownership, architecture, API/schema/data, state/recovery, dependency, security, product-surface responsibility or repeatable verification/deployment changes. Local fixes preserving durable semantics are `none`.
5. Use the agent/platform internal plan. For high-risk work keep `Architecture Context Hit`, `Decision Rationale Hit: existing|required|none` and `Modularity Check: none|required|exception` as internal routing and maintenance questions, not artifacts or extra deltas.
6. Implement precisely, run project-owned verification, perform Contract Conformance and a Context drift check, then report implementation, verification, Context status and blockers.

The default workflow never requires a plan artifact, matrix, verdict, evidence ledger or result document. Optional scratch is not Context or completion proof. The bounded Context search creates no index, cache, state or second authority.

For external product, architecture, technical or acceptance sources, internally classify every material constraint as covered by Context, requiring a Context update, task-local, explicitly out of scope or requiring a genuine user decision. Conformance must confirm controlling Context reached the correct modules, surfaces, APIs, state machines and verification paths without forbidden shortcuts or duplicate authority.

## Long-Task Routing

Do not infer long-task mode from duration, complexity, file count or agent preference.

1. A valid Git common-dir active record plus matching worktree Git-config marker resumes through `ty-context long-task resume <workdir>` and `/long-task-workflow` in the current native Goal.
2. Explicit `/long-task-workflow` authors or resumes exactly one complete `long-task-delivery-v2` Contract for the selected delivery.
3. `/normal-long-task` is a retirement pointer. Otherwise remain on the default Workflow Contract, even when work is long.

Contract Draft authoring belongs inside `long-task-workflow`: continuously revise the same non-authoritative `delivery-contract.yaml` until the first successful formal Compile creates Authority Lock. An optional Source Plan is ordinary upstream Source guidance, not a Contract Draft or required input protocol.

The workflow uses one native Goal, one selected workspace, one Contract and one Final Gate. New authoring uses inline Outcomes; existing `outcome_files` are physical compatibility only. Outcomes decompose dependency-ready execution, targeted repair and diagnosis, not completion authority, workers, branches or model sessions.

After the first Authority Lock, stop once before implementation and ask the user to continue with the current model or switch models and then resume the active Long-Task. A model choice already stated explicitly for this task satisfies the checkpoint; later revisions do not repeat it. Harness records no model route or checkpoint state.

Before authoring, proof design or authority lifecycle work, read the phase-specific references in the package-managed `long-task-workflow` Skill. Use `ty-context long-task help` for CLI syntax instead of treating this startup router as a command reference.

Final Gate, Stop and close recompile the source Contract and rerun every declared Check on one clean current snapshot. Targeted verify is repair evidence only. Status, progress, receipts and compiled cache are audit/recovery surfaces only; prose, historical tests or Agent judgment never create acceptance. An adopted Authority Revision returns to rolling execution and is never delivery completion. External confirmations remain explicit; machine acceptance covers declared machine Authority and cannot by itself authorize completing the platform-native Goal, CI, deployment or human acceptance.

Tiny Context does not create or restore platform Goals, invoke models, spawn agents, call an App Server, create branches/worktrees, merge, push, open PRs, deploy or manage process trees. `ty-context enable long-task` installs the Source Plan Authoring Skill, Long-Task Workflow Skill and package-owned completion Hook.

## Durable Facts And Generated Surfaces

- Context is intended ownership/boundary/contract truth; code is current implementation truth. Treat disagreement as drift, missing work or stale Context.
- Long-term facts live only in `project_context/**` or `DESIGN.md`; logs, raw evidence, secrets, runtime state and receipts do not.
- Managed `AGENTS.md` blocks, `<harnessRoot>/ty-context-managed/**` and package-managed Skills are generated and sync-overwritten.
- Explicit upgrades use `context_harness_upgrade`; package sync never imports retired Campaign or development-period authority state.

## Verification

- `make validate-context`: Context recoverability.
- `make validate-harness`: Context plus touched-source modularity.
- `ty-context doctor`: installation health plus advisory default Context footprint.
- `node packages/ty-context/dist/cli.js package check-source`: managed-source/package parity in this source workspace.

Every handoff reports exactly one of `Context: updated ...` or `Context: no durable fact change`. Never claim tests, deployment or acceptance from Context alone.
