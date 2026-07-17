# Project Agent Overlay

本文件是 agent 启动路由器和硬边界，不承载完整设计思想、长原则或角色流程；默认 Minimal Context 规则见下方 managed block。

## 本仓库 Authoring 例外

- 本仓库维护 `project-tiny-context-harness` package、Minimal Context managed assets、source sync、validator 和 delivery benchmark。
- 本仓库普通开发一律直接在 `main` 分支进行；除非用户明确要求，不创建、切换或保留 feature/Codex 开发分支或额外 worktree。显式 `/long-task-workflow` 也始终复用当前选定工作区和当前原生 Goal，不创建编排分支、Worker 或 worktree。
- 修改 `packages/ty-context/**`、`.codex/ty-context-managed/**`、`tools/**` 或 `examples/delivery-benchmark/**` 时，先读 `project_context/**`，并使用 `.codex/skills/authoring/harness_package_design/SKILL.md`。
- 旧阶段式工作流只作为历史设计摘要保留在 `PROJECT_SPEC.md`；不要把 stage artifacts 恢复成默认 package 能力。
- Karpathy 编码准则是本仓库 agent 的底层行为原则：先思考并暴露假设，优先简洁，精准修改，目标驱动验证；不要把长原则常驻在 AGENTS 启动路径。

<!-- ty-context:managed:begin -->
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
2. If the user explicitly invokes `/long-task-workflow`, prepare or resume exactly one complete `long-task-delivery-v2` Contract for the selected delivery in the current native Goal.
3. `/normal-long-task` is a retirement pointer only. Otherwise remain on the default Workflow Contract, even when work is long.

An optional Source Plan is upstream Source guidance, not a Contract Draft or required input protocol. Contract Draft authoring belongs inside `long-task-workflow`: the same non-authoritative `delivery-contract.yaml` is revised until the first successful formal Compile creates Authority Lock.

The workflow uses exactly one native Goal, one selected repository/workspace, one Contract and one Final Gate for the selected delivery. New authoring keeps inline Outcomes in the root `delivery-contract.yaml`; existing `outcome_files` remain only a physical compatibility form and create no semantic or completion boundary. A Draft Outcome is the pre-lock lifecycle of an independently decidable acceptance/dependency unit; it decouples implementation and verification work but is not an output-length fragment, Worker, scheduler task, branch, worktree or model session.

Supported CLI:

- `ty-context long-task init <workdir>`
- `ty-context long-task preflight <workdir>`
- `ty-context long-task compile <workdir> [--revise]`
- `ty-context long-task approve-authority-revision <workdir> --revision <sha>`
- `ty-context long-task explain <workdir>`
- `ty-context long-task verify <workdir> [--outcome <key>] [--check <key>]`
- `ty-context long-task status|resume|doctor|final-gate <workdir>`
- `ty-context long-task stop-check <workdir> [--message <text>]`
- `ty-context long-task close <workdir>`
- `ty-context long-task abandon <workdir> [--force-corrupt-state]`

Contract V2 requires real Source files containing non-rendering, uniquely keyed Material Source Item markers. Marker keys and `source_claim` keys are set-equal, statements remain text-exact after whitespace normalization, and every non-decision Source item owns exactly one canonical target of the same semantic kind and normalized text; duplicate target ownership fails closed. Types include independently decided Control fields. Every Outcome has a non-Result atomic Claim, each Source AC maps to one criterion-identical Assertion containing an independently Source-backed non-Result Claim, `out_of_scope` is never resolved, and all required proof surfaces must be non-empty, unique and covered.

Preflight is read-only and Compile uses the same activation-safety kernel, so skipping Preflight bypasses no rule. Claim operators are strict: `truthy`/`falsy` are diagnostic-only and `exists` proves only implementation-structure obligations. Evidence adapters derive from runner kind: only Playwright proves `ui_browser`; other runners use structured evidence. Claim-bearing Playwright evidence is only `playwright.case.<ac>.passed equals true`; `[ac:<key>]` binds one declared AC per Test, ordinary tags are ignored, and missing/skipped/flaky/unexpected/multi-AC cases fail closed. Every claim-bearing structured Check needs same-Check, Claim-related Counterfactual sensitivity; unrelated Artifacts or another Check do not count, same-Check Population exempts only its own Claims unless observability is weak, and Result proof must fail from Result plus a related non-Result root. One claim-bearing Observation cannot be reused across Checks sharing a Raw Execution. Counterfactuals bind a declared implementation carrier and accept only designated value mismatches. Claim proofs exist only for a fully passed Check.

The first successful formal Compile is Authority Lock; later Source/Context/Product/Global/Acceptance/verifier-content or proof-reduction changes compare against active authority regardless of progress, Receipt/cache deletion or restored code. Pure verifier relocation and proven proof/scope tightening auto-revise; content weakening needs exact user approval. Every path-bearing field uses one canonical grammar, and Check execution fields have a compile-time raw/per-Check/progress/final classification. Targeted verify rechecks active identity before progress writes.

Status, progress, Receipts and compiled cache are audit/recovery surfaces only. Commit, migration, clear and abandon share one active-state lock. Final Gate rechecks task/revision/compiled/worktree identity after all Checks; Stop/close use accepted-identity CAS and cannot clear a newer revision. Corrupt continuity is cleaned only by explicit `abandon --force-corrupt-state`. External confirmations remain explicit; machine acceptance never implies CI, deployment or human acceptance.

Final Gate, Stop and close recompile the source Contract before evaluating the current Authority and snapshot.

Risk routing is per Outcome. Public API/schema, persistent data, migration, security/permission boundaries, irreversible effects, full-population operations, or a critical path with weak observability impose strict proof on the affected Outcome. Risk downgrades are rejected. Multi-repository delivery is unsupported.

Tiny Context does not create or restore platform Goals, invoke models, spawn agents, call an App Server, create branches/worktrees, merge, push, open PRs or manage process trees. Only Contract-declared project verification runners may execute product checks. Network isolation is the responsibility of the external platform.

## Durable Facts And Generated Surfaces

- Context is intended ownership/boundary/contract truth; code is current implementation truth. Treat disagreement as drift, missing work or stale Context.
- Long-term facts only go in `project_context/**` or `DESIGN.md`. Do not store logs, raw evidence, secrets, runtime state or receipts there.
- Full-project/source-pack exports stay under `tmp/ty-context/context-exports/**` and never enter Context.
- Explicit Tiny Context upgrades use `context_harness_upgrade` and run `upgrade` before standalone `sync`.
- Managed `AGENTS.md` blocks, `<harnessRoot>/ty-context-managed/**` and package-managed Skills are generated and sync-overwritten.
- Non-Codex defaults install portable core/workflow only; `ty-context enable long-task` explicitly installs the Source Plan Authoring Skill, Long-Task Workflow Skill and package-owned completion Hook.
- `init`, `sync` and `upgrade` never import or execute historical V1/Campaign state or development-period V2 Active Authority/Progress/Receipts. Version 0.6.0 reports unfinished old authority as `manual_required` and installs only the package-owned V2 Hook.

## Verification

- `make validate-context`: Context recoverability only.
- `make validate-harness`: Context plus touched-source modularity.
- `npm run test:long-task-performance --workspace project-tiny-context-harness`: independent large-repository budgets.
- `npx --yes --package project-tiny-context-harness@latest ty-context package check-source`: managed-source/package drift.

Every handoff reports exactly one of `Context: updated ...` or `Context: no durable fact change`. Never claim tests, deployment or acceptance from Context alone.
<!-- ty-context:managed:end -->
