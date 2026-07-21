---
context_role: contract
read_policy: on-demand
---
# Package-Managed Surface Contract

Product Surface Contract guidance is package-managed workflow support only. It must not generate project semantics, plan artifacts, lifecycle state or campaigns; business surface responsibility remains project-owned Context using existing roles.

## Role

This contract defines source-only, managed, packaged and human-facing surfaces for the Harness.

## Surface Ownership

- `.codex/ty-context-managed/**` is source-workspace managed source for portable/default guidance, Context templates, profile metadata and package-managed Skills. The executable Long-Task Hook entry is package-owned compiled code.
- Managed Context templates include cross-surface `product-surface-contract.md` and optional on-demand `screen-contract.md`. They teach ownership/structure only and never generate consumer product facts.
- `packages/ty-context/assets/**` is packaged canonical output produced by source mappings.
- `.codex/skills/**` exposes generated/default Skills in this source workspace. The `long-task` profile owns `.codex/skills/source-plan-authoring/**` and `.codex/skills/long-task-workflow/**`; `normal-long-task` is a retirement pointer. Package-managed defaults are overwritten by sync.
- `.codex/skills/authoring/**` is source-workspace-only and never packaged.
- `README.md`, `README.zh-CN.md`, `packages/ty-context/README.md`, npm metadata and release docs are human-facing public surfaces and must match behavior.
- `PROJECT_SPEC.md` is the full source-workspace workflow design specification, not a consumer asset.
- `project_context/**` is source-workspace durable fact authority and is not copied wholesale to consumers.

## Profile And Consumer Boundary

- `core-portable` plus `workflow-default` are installed by default.
- `long-task` is explicit. Enabling it installs the optional Source Plan Authoring Skill, Long-Task Workflow Skill, Stop Hook and required templates. Enable, disable and upgrade recognize current or relocated package-owned absolute Hook commands only when the known managed status and package layout both match; exact repo-local retired commands remain migratable. User entries, group metadata, no-status lookalikes and commands merely containing `composite` are preserved.
- Upgrade safely removes the V1 repo-local Hook, reports unfinished V1 or development-period V2 active state as manual, and never imports historical Progress/Receipts as current authority.
- Retired command names are CLI tombstones in code, not packaged runtime profiles. They import no Campaign/SFC/worker/AppServer/worktree modules.
- `init`, `sync` and `upgrade` never create, discover, import, activate or abandon a Delivery Contract.
- Consumer CI receives portable project gates only. Maintainer package CI owns Delivery Contract/Long-Task Workflow self-tests, exact-tarball smoke and source drift.

## Source Sync Boundary

- `node packages/ty-context/dist/cli.js package sync-source` copies mapped managed source to package assets.
- `package check-source` verifies exact mapping parity.
- Run build, sync twice, check-source, the enabled-profile workspace sync and relevant consumer/package tests after changing managed guidance, Skills, Hooks, templates, profile metadata or source mappings. The managed source, generated `.codex/skills/**` copy and package asset for each package-managed Skill must be byte-identical.
- Public `sync` refreshes enabled package-managed assets only; semantic migration belongs to `upgrade`.

## Generated Skill Boundary

- Package-managed Skills are business-agnostic. Project facts belong in the consumer Context or separate project-local Skills.
- Dedicated external Product Design, Figma, image-generation, prototype or human design workflows own standalone resource production outside Tiny Context. `context_uiux_design` consumes selected Source during development to adopt or repair durable authority without duplicating those generation systems.
- Package-managed visual-delivery guidance reuses the existing authority split and verification surfaces. The default Workflow performs UI Authority Closure plus a conditional Design Authority Check for material production UI; `context_uiux_design` owns missing/conflicting design-authority repair, durable cross-surface/screen/control facts stay in `project_context/**`, durable visual-system semantics and the reference registry stay in `DESIGN.md`, and a task-local risk-proportional Visual Coverage Set replaces any required matrix or artifact. `context_development_engineer` binds stable surface/control/target keys to one declared authored token source/generation direction, production components/routes and project-owned rendered verification.
- Long-Task visual guidance is authoring and evidence specialization only: material UI Source reconciles UI authority before Compile, then the existing Control projection preserves applicable surface, region/location, type/label, user task, visibility/availability, trigger/input/validation/default, interaction/navigation, states/recovery/permission/feedback and accessibility fields as independent Source-backed Claims. Visual and behavioral expectations still use existing Requirement, Control, Assertion, proof-surface, verification-input, Stage, Binding and `external_confirmation` mechanisms. Candidate targets cannot authorize fidelity implementation until selected Source/registry authority is adopted through the existing protected revision path. There is no `uiux_delivery` block, new Claim kind, risk level, lifecycle state, baseline authority or Final Gate.
- External design briefs/indexes may enter `source_paths`; selected acceptance-affecting targets, token sources and fixed prototype fixtures may enter `verification_inputs`; production carriers use `input_paths`/Bindings; generated implementation renders/diffs/reports remain `artifact_globs`. Tool-specific export or authoring validation is not package, product or Long-Task acceptance.
- `/source-plan-authoring` explicitly authors or audits one high-fidelity Markdown Source Plan from a near-complete draft or a sparse goal plus mixed attachments. It inventories every supplied artifact, preserves direct requirements, marks necessary derivations and records each defensible recommended plan choice as delegated with its instruction, basis and added meaning. Before comparative research or any material product, technical or provider selection, it determines whether the user's decision criteria are known; when an unknown quality/cost, speed, reliability, privacy, lock-in, operational-burden or similar priority could change the research or recommendation, it stops and asks one concise targeted clarification before proceeding. This conditional clarification is not a mandatory questionnaire. Once preferences are clear, the Skill researches current authoritative external facts when needed and delegates the supported recommendation without a second approval pause. High-impact plan semantics are not an automatic pause, but payment, contracting, production release, destructive production mutation, real permission grants, sensitive-data transmission and required legal/security/human approval remain external confirmations; conflicts, user-reserved choices, missing material preferences and choices with no defensible recommendation remain `DEC`. The Skill also expands interactive work through surface/region/control/state/feedback detail, retains independent CTRL fields, NCOMP meanings, one-scenario AC links and exact Risk Fact/Outcome/Basis/Consequence. It creates no Context update, Contract Draft/YAML, repository binding, workflow state, implementation or completion claim; its format remains optional Source guidance.
- `/long-task-workflow` accepts ordinary prose or a Source Plan as Source and owns iterative authoring of the same non-authoritative Contract Draft, Material Source Item marking, typed Source/REQ/CTRL/OBL/AC all-of coverage, shared-kernel read-only Preflight repair, formal Compile/Authority Lock, rolling execution and Live Final Gate. A Draft Outcome is an authoring-time Outcome and semantic verification boundary, not a runtime Worker or scheduler unit.
- No `contract-authoring`, `draft-authoring` or other standalone Contract Draft Skill exists. Contract Draft authoring and the later workflow are one lifecycle, with one Contract and one Final Gate; no Source Inventory/Preflight Receipt, second Contract plan, top-level split or Goal/agent/process/Git orchestration is allowed.
- Historical reasons involving particular conversational or coding platforms remain source-workspace decision rationale. Package-managed Skills and public consumer guidance use only the platform-neutral repository-binding, Preflight-feedback, handoff, one-authority and iterative-authoring rationale.
- CLI JSON, the package-owned Stop Hook, the managed Long-Task Skill and English/Chinese public docs preserve revision and terminal scope consistently: revision adoption explicitly returns to rolling execution and cannot complete delivery; pending external confirmation remains named through status/resume/stop-check/`systemMessage`/close; accepted terminal output identifies `declared_machine_authority`; and `closed` denotes only machine Authority cleanup with no native-Goal effect. Generated and packaged copies must not erase those distinctions or add revision/native-Goal/external-confirmation state.
- `/normal-long-task` only reports retirement and points to `/long-task-workflow`; it creates no checklist, target prompt or Local Audit.
- No package-managed Skill may restore Source Unit/SFC/Packet/Wave/Campaign artifacts or a second authority.

## Change Impact Rule

Public behavior changes require a same-semantics sweep across implementation, schema, managed source, package assets, Context, PROJECT_SPEC, English/Chinese README, package README, tests, source sync, quickstart/tarball and release/version surfaces as applicable.

The public README Contract and reusable release fixture are executable examples, not regex documentation. Source sync owns README/package copies and both Skills; exact-tarball smoke and its built-CLI fixture must share the same marked Source/Binding/Counterfactual semantics.

Public package surfaces must be English-complete. Chinese text is additive aligned documentation, never the sole activation path or explanation.
