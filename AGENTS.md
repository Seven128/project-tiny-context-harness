# Project Agent Overlay

本文件是 agent 启动路由器和硬边界，不承载完整设计思想、长原则或角色流程；默认 Minimal Context 规则见下方 managed block。

## 本仓库 Authoring 例外

- 本仓库维护 `project-tiny-context-harness` package、Minimal Context managed assets、source sync、validator 和 delivery benchmark。
- 本仓库普通开发一律直接在 `main` 分支进行；除非用户明确要求，不创建、切换或保留 feature/Codex 开发分支或额外 worktree。显式 `/long-task-workflow` 也始终复用当前选定工作区和当前原生 Goal，不创建编排分支、Worker 或 worktree。
- 修改 `packages/ty-context/**`、`.codex/ty-context-managed/**`、`tools/**` 或 `examples/delivery-benchmark/**` 时，先读 core Context、default area root 和由 `project_context/context.toml` 触发的相关 on-demand Context，并使用 `.codex/skills/authoring/harness_package_design/SKILL.md`。
- 旧阶段式工作流只作为历史设计摘要保留在 `PROJECT_SPEC.md`；不要把 stage artifacts 恢复成默认 package 能力。
- Karpathy 编码准则是本仓库 agent 的底层行为原则：先思考并暴露假设，优先简洁，精准修改，目标驱动验证；不要把长原则常驻在 AGENTS 启动路径。

<!-- ty-context:managed:begin -->
# Minimal Context Harness Protocol

This project uses Tiny Context. The Harness maintains durable Context and workflow authority; project tests, CI, runtime evidence and human acceptance prove product quality.

Tiny Context has three capabilities: Minimal Context, the default Workflow Contract, and the explicitly enabled Single-Goal Long-Task Workflow.

## Default Workflow Contract

Unless an active Long-Task binding exists:

1. Read `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml` and the default area root, then collect graph/trigger candidates.
2. Before deciding `Context Delta`, run one bounded text search over `project_context/**` using a small set of high-signal task terms such as explicit area/module names and API/schema/state/security/verification/deployment terms. Merge matching Context with manifest candidates and read only relevant files; search supplements rather than replaces semantic judgment.
3. For UI/product-surface work, confirm information/action/feedback ownership and use `context_surface_contract` when durable responsibility is unclear or changes; Product Surface Contracts own cross-surface interfaces and optional on-demand Screen Contracts use existing area/subdomain/contract/verification roles for deeper screen/control facts. Before material production UI implementation, reconcile each affected stable surface/control/target key as Context-covered, requiring a Context update, task-local, out of scope or decision-required, then read `DESIGN.md`, its token source and referenced design targets. An unconfigured starter, candidate, style-only guidance or inspiration does not authorize invented production layout; only a selected exact/constraint target with adequate declared coverage authorizes fidelity. Dedicated external design tools may author resources upstream, but their output remains ordinary Source until this workflow uses `context_uiux_design` when needed to adopt or repair durable Design Authority. Local style fixes and explicit non-fidelity prototypes remain lightweight.
4. Decide exactly one `Context Delta: none|required`. Update owning Context before code when durable product ownership, architecture, API/schema/data, state/recovery, dependency, security, product-surface responsibility or repeatable verification/deployment changes. Local fixes preserving durable semantics are `none`.
5. Use the agent/platform internal plan. For high-risk work keep `Architecture Context Hit`, `Decision Rationale Hit: existing|required|none` and `Modularity Check: none|required|exception` as internal routing and maintenance questions, not artifacts or extra deltas.
6. Implement precisely, run project-owned verification, perform Contract Conformance and a Context drift check, then report implementation, verification, Context status and blockers.

The default workflow never requires a plan artifact, matrix, verdict, evidence ledger or result document. Optional scratch is not Context or completion proof. The bounded Context search creates no index, cache, state or second authority.

Externally authored design resources such as Figma frames, images, prototypes, token exports and component specifications are ordinary Source. Their authoring does not update `project_context/**` or `DESIGN.md`, edit production implementation, create a Delivery Contract or claim acceptance. The consuming workflow owns UI Authority Closure, `Context Delta`, durable adoption, implementation and project verification; candidates authorize no fidelity, while selected targets control only their declared surface/viewport/mode/state coverage.

For external product, architecture, technical or acceptance sources, internally classify every material constraint as covered by Context, requiring a Context update, task-local, explicitly out of scope or requiring a genuine user decision. Conformance must confirm controlling Context reached the correct modules, surfaces, APIs, state machines and verification paths without forbidden shortcuts or duplicate authority.

## Long-Task Routing

Do not infer long-task mode from duration, complexity, file count or agent preference.

1. A valid Git common-dir active record plus matching worktree Git-config marker resumes through `ty-context long-task resume <workdir>` and `/long-task-workflow` in the current native Goal.
2. Explicit `/long-task-workflow` authors or resumes exactly one complete `long-task-delivery-v2` Contract for the selected delivery.
3. `/normal-long-task` is a retirement pointer. Otherwise remain on the default Workflow Contract, even when work is long.

Contract Draft authoring belongs inside `long-task-workflow`: continuously revise the same non-authoritative `delivery-contract.yaml` until the first successful formal Compile creates Authority Lock. An optional Source Plan and externally authored design resources are ordinary upstream Source guidance, not a Contract Draft or required input protocol. Candidate design resources authorize no fidelity Claim; selected targets and acceptance-affecting resources enter real marked Source and existing verification inputs, and after Authority Lock use protected revision.

The workflow uses one native Goal, one selected workspace, one Contract and one Final Gate. New authoring uses inline vertical Outcomes grouped by ordered Stages; existing `outcome_files` are physical compatibility only. Target profiles name required product targets and root runtimes; Checks declare Given/When journeys and all-of Evidence Capabilities. Stage/frontier state is derived from ordinary Progress and creates no second Gate, Receipt, scheduler or completion authority.

After the first Authority Lock, stop once before implementation and ask the user to continue with the current model or switch models and then resume the active Long-Task. A model choice already stated explicitly for this task satisfies the checkpoint; later revisions do not repeat it. Harness records no model route or checkpoint state.

Before authoring, proof design or authority lifecycle work, read the phase-specific references in the package-managed `long-task-workflow` Skill. Use `ty-context long-task help` for CLI syntax instead of treating this startup router as a command reference.

Final Gate, Stop and close recompile the source Contract and rerun every declared Check on one clean current snapshot. Required targets cannot substitute for one another; presence cannot prove behavior; success and degradation remain distinct; typed boundary effects require an observer. Targeted verify is repair evidence only. Status, progress, Stage/frontier projections, receipts and compiled cache are audit/recovery surfaces only; prose, historical tests or Agent judgment never create acceptance. An adopted Authority Revision returns to rolling execution and is never delivery completion. External confirmations remain typed and explicit; machine acceptance reports target/stage qualification but cannot by itself authorize completing the platform-native Goal, CI, deployment or human acceptance.

Tiny Context does not create or restore platform Goals, invoke models, spawn agents, call an App Server, create branches/worktrees, merge, push, open PRs, deploy or manage process trees. `ty-context enable long-task` installs the Source Plan Authoring Skill, Long-Task Workflow Skill and package-owned completion Hook.

## Durable Facts And Generated Surfaces

- Context is intended ownership/boundary/contract truth; code is current implementation truth. Treat disagreement as drift, missing work or stale Context.
- Long-term facts live only in `project_context/**` or `DESIGN.md`; versioned authored design targets remain upstream project Source/verifier inputs until the consuming workflow adopts durable meaning, while generated implementation screenshots/diffs, logs, raw evidence, secrets, runtime state and receipts do not become Context.
- Managed `AGENTS.md` blocks, `<harnessRoot>/ty-context-managed/**` and package-managed Skills are generated and sync-overwritten.
- Explicit upgrades use `context_harness_upgrade`; package sync never imports retired Campaign or development-period authority state.

## Verification

- `make validate-context`: Context recoverability.
- `make validate-harness`: Context plus touched-source modularity.
- `ty-context doctor`: installation health plus advisory default Context footprint and Design Authority status.
- `node packages/ty-context/dist/cli.js package check-source`: managed-source/package parity in this source workspace.

Every handoff reports exactly one of `Context: updated ...` or `Context: no durable fact change`. Never claim tests, deployment or acceptance from Context alone.
<!-- ty-context:managed:end -->
