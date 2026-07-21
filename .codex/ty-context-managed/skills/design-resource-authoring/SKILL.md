---
name: design-resource-authoring
description: Use when the user explicitly asks to generate, author, plan, commission, or iterate design resources; use Open Design; create a scoped wireframe, prototype, visual candidate, component/control state study, or design handoff from raw drafts, product/technical plans, optional Source Plans, visual briefs, screenshots, or existing design resources; or asks to “生成设计资源”, “使用 Open Design”, “生成原型图”, “生成高保真/低保真设计”, or “先看一个控件/页面效果” in a Minimal Context Harness project. Do not trigger for generic design discussion, UX audits, ordinary UI implementation, local CSS fixes, durable Design Authority/Context adoption, Source Plan authoring itself, or Long-Task execution.
---

# Design Resource Authoring

Commission the smallest sufficient set of design resources from the currently available Open Design capabilities. This Skill is a thin task-local planner, provider adapter, iteration guide and handoff layer. Open Design owns its generation logic; Tiny Context owns neither its prompts nor its runtime.

## Hard boundaries

- A raw draft is a valid input. Never require, invoke, regenerate or edit a Source Plan.
- Never edit an initial proposal, `project_context/**`, `DESIGN.md`, a Delivery Contract, production code or tests as a side effect of design-resource work.
- Never make a prototype, wireframe, high-fidelity candidate, design system, Figma file, variant count or directory layout universally mandatory.
- Never let supplied background expand the user's explicit output scope. “One control,” “one page,” “these three pages” and “exploration only” are hard ceilings.
- Generated candidates are ordinary external Source. They do not select themselves, become `exact-target`, create Design Authority or prove product acceptance.
- Keep provider projects, runs and generated artifacts task-local until the user requests a handoff or explicitly selects a candidate.
- Do not install or persistently configure MCP servers, plugins, authentication or new disclosure paths without separate user authorization.
- Do not create a Tiny Context resource pack, provider registry, workflow state, Contract artifact, acceptance record or parallel authority lifecycle.

## Read the references

1. Always read [resource-selection.md](references/resource-selection.md) before deciding what to generate.
2. Read [open-design-provider.md](references/open-design-provider.md) before capability discovery, provider execution, recovery or Figma routing.
3. Read [downstream-handoff.md](references/downstream-handoff.md) before a handoff, selected-source preparation, accepted-decision summary or use by Source Plan/default/Long-Task workflows. A simple unselected preview may stop before this reference is needed.

## Core workflow

1. **Fix the requested-scope ceiling.** Separate background coverage from requested output coverage. Record explicit exclusions and whether the user wants exploration, handoff or selected-source preparation.
2. **Inventory every supplied input.** Accept raw notes, an initial proposal, product and technical plans, an optional Source Plan, visual briefs, screenshots, references and existing artifacts. Preserve each input's role as existing exact target, constraint, inspiration, current-implementation evidence or background; report unreadable or intentionally unused material and do not invent missing authority.
3. **Find the design gaps.** Identify only the uncertainties that block or materially improve the requested decision: information hierarchy, flow, control/state behavior, visual direction, responsive/platform behavior, reusable system detail or editable team handoff.
4. **Discover live capabilities.** Inspect the current Open Design agent/model, functional skills, rendering templates, design systems, plugins and export routes. Treat absent or non-enumerable capabilities honestly; never substitute a remembered catalogue.
5. **Choose the minimum sufficient commission.** Give every considered resource one disposition: `selected`, `optional`, `not-needed`, `unavailable` or `decision-required`, with one reason. Select multiple resources only when each closes an independent gap. Ask only when a genuine missing preference materially changes the commission; otherwise use traceable, reversible judgment.
6. **Commission through Open Design.** Send a product-specific, bounded commission envelope around the selected provider capability. Do not copy, restate or simulate the provider's internal template prompt. Prefer structured MCP; use the bounded fallbacks in the provider reference only when needed.
7. **Observe and inspect proportionally.** Keep provider execution state, artifact readiness and design suitability separate. Exploration needs only scope/corruption sanity and a visible result; handoff needs relevant structure/interaction inspection; downstream product verification remains downstream.
8. **Iterate within scope.** Revise the candidate from user feedback without expanding coverage or continuously rewriting the source proposal. Stop when the requested design decision is supported, the user stops, or a genuine decision/provider blocker is reached.
9. **Return the intent-sized result.** A simple exploration should show the artifact promptly. A handoff adds compact provenance, coverage and limitations. Selected-source preparation requires explicit selection basis and an immutable locator/hash or approved snapshot.

## Raw-draft exploration loop

An initial proposal may go directly through this Skill before `source-plan-authoring`:

```text
raw initial proposal
  -> bounded design candidate
  -> user feedback and iterations
  -> explicit human selection/rejection
  -> optional consolidated accepted-design-decision delta (when requested)
  -> separately authorized revision of the initial proposal
  -> optional source-plan-authoring(revised proposal + selected resources)
```

The Skill performs only the first four transitions and returns differences as output. It does not apply the proposal revision or invoke the optional final step. The delta distinguishes accepted, rejected and unresolved choices and identifies affected surface/control/state keys when available. Do not require or emit an interim delta after every iteration: keep those observations task-local and, when requested, return one consolidated delta after the direction is final. Never continuously synchronize or write back the proposal during candidate iteration.

## Stop and route elsewhere

- Route durable UI/UX authority adoption or repair to `context_uiux_design`.
- Route synthesis of an implementation-ready Source Plan to `source-plan-authoring` only when the user explicitly requests that separate work.
- Route ordinary implementation with sufficient design authority to the default Workflow Contract.
- Route a complete explicit Single-Goal delivery to `long-task-workflow`.
- If no new resource is justified, say so and route to the appropriate existing path instead of generating filler.

## Completion response

Report the requested scope and intent, selected/omitted/unavailable resources, visible artifacts or durable locators, provider/artifact status, review actually performed, provenance appropriate to intent, unresolved decisions and forbidden inferences. For an explicit selection after raw-draft iteration, return the accepted-design-decision delta when requested, without modifying any source document; it may be deferred until the end and consolidated once.
