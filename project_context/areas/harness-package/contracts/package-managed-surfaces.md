---
context_role: contract
read_policy: default
---
# Package-Managed Surface Contract

Product Surface Contract guidance is package-managed workflow support only. It must not generate project semantics, plan artifacts, lifecycle state or campaigns; business surface responsibility remains project-owned Context using existing roles.

## Role

This contract defines source-only, managed, packaged and human-facing surfaces for the Harness.

## Surface Ownership

- `.codex/ty-context-managed/**` is source-workspace managed source for portable/default guidance, Context templates, profile metadata and package-managed Skills. The executable Long-Task Hook entry is package-owned compiled code.
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
- `/source-plan-authoring` explicitly authors or audits one high-fidelity Markdown Source Plan. It preserves direct requirements, marks derived content and unresolved decisions, uses stable semantic keys/anchors where useful, and creates no Context update, Contract Draft/YAML, repository binding, workflow state, implementation or completion claim. Its recommended format is optional Source guidance.
- `/long-task-workflow` accepts ordinary prose or a Source Plan as Source and owns iterative authoring of the same non-authoritative Contract Draft, Material Source Item marking, typed Source/REQ/CTRL/OBL/AC all-of coverage, shared-kernel read-only Preflight repair, formal Compile/Authority Lock, rolling execution and Live Final Gate. A Draft Outcome is an authoring-time Outcome and semantic verification boundary, not a runtime Worker or scheduler unit.
- No `contract-authoring`, `draft-authoring` or other standalone Contract Draft Skill exists. Contract Draft authoring and the later workflow are one lifecycle, with one Contract and one Final Gate; no Source Inventory/Preflight Receipt, second Contract plan, top-level split or Goal/agent/process/Git orchestration is allowed.
- Historical reasons involving particular conversational or coding platforms remain source-workspace decision rationale. Package-managed Skills and public consumer guidance use only the platform-neutral repository-binding, Preflight-feedback, handoff, one-authority and iterative-authoring rationale.
- `/normal-long-task` only reports retirement and points to `/long-task-workflow`; it creates no checklist, target prompt or Local Audit.
- No package-managed Skill may restore Source Unit/SFC/Packet/Wave/Campaign artifacts or a second authority.

## Change Impact Rule

Public behavior changes require a same-semantics sweep across implementation, schema, managed source, package assets, Context, PROJECT_SPEC, English/Chinese README, package README, tests, source sync, quickstart/tarball and release/version surfaces as applicable.

Public package surfaces must be English-complete. Chinese text is additive aligned documentation, never the sole activation path or explanation.
