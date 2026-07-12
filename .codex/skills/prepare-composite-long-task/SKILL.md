---
name: prepare-composite-long-task
description: Use when directly invoked to prepare or resume a composite long-task campaign from a raw requirement.
---

# Prepare Composite Long Task

中文显示名：多组合长程任务准备与续接 Skill

## Boundary

This package-managed Skill owns semantic preparation before strict composite execution. It turns a raw requirement into an opt-in, user-owned campaign and prepares exactly one dependency-ready SFC at a time. `/composite-long-task-workflow` remains the downstream execution adapter for an already-complete three-input bundle.

Invoke explicitly:

```text
/prepare-composite-long-task
```

Do not use broad automatic routing. Do not import legacy attachments, partial bundles, or old tmp workdirs. There is no legacy importer and no aggregate campaign completion state.

## Bootstrap

1. Read project Context and relevant code before making semantic decisions.
2. Run `ty-context composite-campaign contract --json`; its descriptor is the current field, enum, filename, ordering, and contract-hash authority.
3. Determine whether this is a new raw request, a campaign resume/review, an explicit start, or a result/continue request.
4. Load only the matching one-level references:
   - scope or decomposition: `references/scope-fit-and-selection.md`
   - current-SFC authoring or repair: `references/packet-authoring.md`
   - review, handoff, start, result, or continuation: `references/campaign-lifecycle.md`

Never copy field inventories from this Skill into a competing schema. Never register campaign files in `project_context/context.toml`.

## New Campaign Workflow

1. Perform a preliminary Scope Fit from the request. If it is `not_long_task`, recommend the smaller path without creating a campaign unless the user explicitly asks to retain that decision.
2. Otherwise preserve the user's requirement in an in-root UTF-8 file, create the explicit campaign with `composite-campaign create`, then apply Scope Fit and a stable SFC dependency graph using `composite-campaign apply-scope`.
3. If a decision is required, ask one narrow question and stop mutation until answered.
4. Use `composite-campaign next --campaign <path> --json`; author the current SFC only.
5. Produce `CompositeAuthoringPacketV3`, then publish it with `composite-campaign apply-packet`.
6. Run `render`, then `preflight --json`. Repair the packet through a new immutable revision; do not hand-edit rendered YAML.
7. Review the rendered authorities and run `handoff`. Handoff does not create a Goal. Stop at `handoff_ready` unless the user explicitly authorized start or prepare-and-execute.

Do not hand-write the three YAML projections. Package rendering from the V2 packet is their only campaign projection path.

## Start And Continuation

- On explicit start with no bound Goal, read `goal-objective.txt`, call `create_goal` with the complete objective, and only after success run `start --campaign <path> --slice <id> --goal-id <id>`.
- If the same Goal ID is already bound, skip `create_goal` and retry `start` with that Goal ID; this is idempotent. A different Goal ID is a conflict. Never create a second unfinished Goal for the SFC.
- Goal execution must reread current Context/code and resolve Context Delta before implementation.
- After execution has a current final gate, use `record-result`; it only mirrors the hash- and attempt-verified current final gate.
- When no active Goal remains, run `next`, persist its unique recommendation or the user's tie choice through a stable-graph `apply-scope` transition, rerun `next` to confirm `selected`, refresh current Context/code, and author only that SFC.

Never infer completion from campaign state, validators, matrices, verdict prose, or Skill output. `record-result` does not run the final gate, and this Skill never computes campaign completion.

## Stop Conditions

Stop with a structured, actionable report when:

- Scope Fit is `blocked_for_decision`, or multiple same-priority candidates require a user choice.
- the request is `not_long_task` and should use a smaller workflow;
- packet authoring would require inventing product intent, ownership, architecture, assertions, or acceptance semantics;
- preflight remains invalid after evidence-based repair, or the rendered projection drifted;
- start was not explicitly authorized;
- Goal creation failed, another Goal is bound, or result identity/hashes do not match the current final gate.

Do not weaken non-completion conditions or acceptance semantics merely to pass preflight.

## Outputs

Tracked campaign authoring/provenance remains under the configured campaign root. Runtime state, attempts, evidence, logs, and derived views remain under `tmp/ty-context/plan-acceptance/**`. Report the campaign path, selected SFC/revision, preflight state, handoff workdir, Goal binding if any, result projection if any, and the exact next action.
