---
name: design-system-authoring
description: Use only when the user explicitly asks to initialize, generate, choose, adopt, replace or repair a project design system or design style with Open Design; asks for “初始化设计系统”, “生成设计系统”, “确定设计风格”, “采纳 Open Design 设计系统”, or explicitly invokes design-system-authoring in a Minimal Context Harness project. This cold-start capability never runs merely because DESIGN.md is missing, a project is new, another Skill needs visual style, or ordinary UI work begins.
---

# Design System Authoring

Generate or select an Open Design design system, obtain an explicit selection, and adopt that selection into the project's existing durable Design Authority. The user invokes this Skill at project cold start or later repair time; installation only makes it available.

## Hard boundaries

- Run only from an explicit user request. Never auto-run from `init`, `sync`, the default Workflow, `design-resource-authoring`, a missing/starter `DESIGN.md`, or a new-project inference.
- A combined explicit user request to initialize the system and then generate resources authorizes that sequence; a resource gate alone does not.
- Open Design owns generation, revision, previews and its catalogue. Use its live structured capabilities; do not copy its prompts, emulate its generator, vendor a catalogue or invent provider IDs.
- Keep candidate generation, human/delegated selection and authority adoption distinct. A successful job or attractive preview is not selected and is not project authority.
- Project `DESIGN.md` and its one declared authored exact-value token source or generation direction are canonical. An Open Design design-system record and project binding are provider synchronization, not a second authority.
- Put durable surface, information-architecture and interaction facts in their owning `project_context/**`; put visual-system semantics, rationale, token direction and reference interpretation in `DESIGN.md`. Do not duplicate facts across owners.
- Do not create a design registry, receipt, workflow state, Contract, acceptance gate or provider runtime inside Tiny Context.
- Do not persistently install/configure MCP, plugins, authentication or disclosure paths without separate authorization. Task-local use of an already available Open Design MCP/daemon is allowed.
- Do not implement production UI or claim downstream fidelity, accessibility, product correctness or acceptance.

## Read the references

1. Always read [open-design-design-system-provider.md](references/open-design-design-system-provider.md) before discovery, generation, revision, selection or provider synchronization.
2. Always read [authority-adoption.md](references/authority-adoption.md) before changing `DESIGN.md`, its token source, relevant Context or provider bindings.

## Core workflow

1. **Confirm explicit intent and scope.** Identify whether the user wants a new system, selection from existing systems, repair, or replacement; capture the product/brand purpose, supported surface/platform, accessibility needs, required modes and supplied references. Ask only when an unresolved aesthetic or brand choice materially changes the candidates and the user has not delegated selection.
2. **Inspect current authority.** Read core Context, relevant surface/interaction Context, `DESIGN.md`, its declared token source/generation direction and any recorded Open Design provenance. Classify the project as `unconfigured`, `configured`, or `configured-but-inconsistent`; this is a task-local finding, not new state.
3. **Discover live Open Design capabilities.** Prefer structured MCP. List/read `od://design-systems/<id>/DESIGN.md`, inspect tool schemas, and feature-detect design-system creation/revision/acceptance plus project binding. Record the live provider/MCP version and any fallback used.
4. **Reuse or generate candidates.** Reuse an existing provider system only when its identity and meaning fit. If a live MCP creation capability exists, use it. Otherwise use the official daemon generation-job API described in the provider reference. Keep every output a candidate until selection.
5. **Review and iterate.** Inspect `DESIGN.md`, generated token files, preview/showcase and relevant workspace files. Use provider revision jobs for scoped feedback, poll boundedly, preserve diagnostics and keep pending revisions non-authoritative.
6. **Obtain selection.** Require an explicit user/team selection, or an explicit instruction delegating selection with known criteria. Record the selection basis, provider design-system ID, selected revision when applicable and immutable content digest/snapshot. Reject or leave other candidates unselected.
7. **Adopt once.** Reconcile the selected system through the authority-adoption procedure. Update root `DESIGN.md`, establish exactly one authored token source/generation direction, update only owning Context facts, and record provider provenance without making it authoritative.
8. **Synchronize Open Design.** Accept the selected pending revision when applicable. Confirm MCP can read the adopted provider system. For later style-bearing resource work, create or verify an Open Design project with `create_project.designSystem` equal to the adopted provider ID.
9. **Validate and report.** Run project-owned Context/design lint and source/package checks appropriate to the repository. Separately report provider execution, artifact readiness, selection, authority adoption, provider synchronization, verification and unresolved issues.

## Readiness classification

Treat Design Authority as unconfigured when `DESIGN.md` is absent, explicitly says `Design authority status: unconfigured`, remains an unedited starter, contains only style adjectives/inspiration, or lacks one authored exact-value token source/generation direction. A configured visual system still does not make every surface implementation-ready; selected exact/constraint targets and declared coverage remain separate.

If authority is already configured and the user did not ask to replace or repair it, prefer reuse and explain the current system. Never generate a competing system as filler.

## Completion response

Report:

- requested operation and design-system scope;
- Open Design transport/version and capabilities actually used;
- candidate IDs and review performed;
- explicit or delegated selection basis;
- adopted `DESIGN.md`, token source and Context owners changed;
- provider ID, revision/digest and project-binding verification;
- validations run, limitations and decisions still required.

Always distinguish `provider succeeded`, `artifact ready`, `selected`, `authority adopted` and `binding verified`; none implies the next.
