---
context_role: contract
read_policy: default
---
# Package-Managed Surface Contract

Product Surface Contract guidance is package-managed workflow support only. It must not generate project semantics, plan artifacts, lifecycle state or campaigns; business surface responsibility remains project-owned Context using existing roles.

## Role

This contract defines source-only, managed, packaged and human-facing surfaces for the Harness.

## Surface Ownership

- `.codex/ty-context-managed/**` is source-workspace managed source for portable/default guidance, Context templates, profile metadata, package-managed Skills, the Long-Task Stop Hook and templates.
- `packages/ty-context/assets/**` is packaged canonical output produced by source mappings.
- `.codex/skills/**` exposes generated/default Skills in this source workspace. The active long-task Skill is `.codex/skills/long-task-workflow/**`; `normal-long-task` is a retirement pointer. Package-managed defaults are overwritten by sync.
- `.codex/skills/authoring/**` is source-workspace-only and never packaged.
- `README.md`, `README.zh-CN.md`, `packages/ty-context/README.md`, npm metadata and release docs are human-facing public surfaces and must match behavior.
- `PROJECT_SPEC.md` is the full source-workspace workflow design specification, not a consumer asset.
- `project_context/**` is source-workspace durable fact authority and is not copied wholesale to consumers.

## Profile And Consumer Boundary

- `core-portable` plus `workflow-default` are installed by default.
- `long-task` is explicit. Enabling it installs only the Long-Task Workflow Skill, Stop Hook and required templates; disabling it removes only package-owned long-task surfaces and preserves user Hooks/files.
- Upgrade safely maps package-owned `composite-codex` profile selection to `long-task` and removes retired package-owned assets. It never deletes or executes user-authored historical campaigns, sources or contracts.
- Retired command names are CLI tombstones in code, not packaged runtime profiles. They import no Campaign/SFC/worker/AppServer/worktree modules.
- `init`, `sync` and `upgrade` never create, discover, import, activate or abandon a Delivery Contract.
- Consumer CI receives portable project gates only. Maintainer package CI owns Delivery Contract/Long-Task Workflow self-tests, exact-tarball smoke and source drift.

## Source Sync Boundary

- `node packages/ty-context/dist/cli.js package sync-source` copies mapped managed source to package assets.
- `package check-source` verifies exact mapping parity.
- Run build, sync twice, check-source and relevant consumer/package tests after changing managed guidance, Skills, Hooks, templates, profile metadata or source mappings.
- Public `sync` refreshes enabled package-managed assets only; semantic migration belongs to `upgrade`.

## Generated Skill Boundary

- Package-managed Skills are business-agnostic. Project facts belong in the consumer Context or separate project-local Skills.
- `/long-task-workflow` may prepare one Contract, perform one coverage review, compile, execute a rolling Frontier in the current native Goal, resume semantic state and run Final Gate. It cannot create Goal/agent/process/Git orchestration.
- `/normal-long-task` only reports retirement and points to `/long-task-workflow`; it creates no checklist, target prompt or Local Audit.
- No package-managed Skill may restore Source Unit/SFC/Packet/Wave/Campaign artifacts or a second authority.

## Change Impact Rule

Public behavior changes require a same-semantics sweep across implementation, schema, managed source, package assets, Context, PROJECT_SPEC, English/Chinese README, package README, tests, source sync, quickstart/tarball and release/version surfaces as applicable.

Public package surfaces must be English-complete. Chinese text is additive aligned documentation, never the sole activation path or explanation.
