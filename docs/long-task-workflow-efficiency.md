# Long-Task Workflow Efficiency Policy

## Objective

The Long-Task Workflow exists to prevent false completion inside declared authority. Its acceptable machine result is binary in substance: either fresh evidence on the complete current final snapshot proves every declared Plan Item and AC, or the delivery remains explicitly unfinished or qualified.

Efficiency is subordinate to that objective. The preferred design is the lowest practical total workflow cost that preserves the same false-completion interception, or stronger interception at the same cost. A mechanism is retained only when it closes an independent delivery-drift path, fails closed and contributes more protection than its Authoring, Runtime, State, Recovery, maintenance and test cost.

## Continuous Goal Execution

After the first successful formal Compile creates Authority Lock, the current Goal continues through implementation, targeted repair and Final Gate. Small implementation-level plans, reordered steps and repair hypotheses are ordinary internal execution state; they do not become a second plan or authority.

The host and user own model selection. The Harness cannot switch the current conversation model and does not add a model-tier scheduler or mandatory switch checkpoint. A healthy Goal is not paused solely to downgrade the model because the pause/resume cost provides no independent false-completion protection. Capability-related drift is handled by precise findings, targeted repair and the Final Gate.

## No Proactive Parallel-Subagent Scheduler

The Harness never proactively spawns, assigns, coordinates, retries or recovers parallel subagents. It creates no Worker queue, Wave, process tree, branch/worktree fan-out or persisted delegation graph.

A platform or Agent may internally delegate work using its own opaque behavior. The Harness neither depends on nor records that behavior, and it never treats delegation as evidence. All changes must converge into one unified current workspace snapshot; only Contract-declared checks on that snapshot can contribute to acceptance.

## Context Evolution During Implementation

`Context Delta` remains live after Authority Lock. When implementation or repair discovers a durable fact, the current Goal updates the owning Context instead of preserving a known stale fact until the end.

Referenced snapshots distinguish:

- **Controlling Context**: core Context, every explicit `context_ref`, verification and deployment Context, and other selected files whose meaning can change ownership, architecture, contract, risk, recovery or repeatable verification. A change requires Authority Revision and may require exact user approval.
- **Supporting Context**: graph-derived, non-explicit `implementation-index` and `archive` files. Their content may auto-revise through `ty-context long-task compile <workdir> --revise` without user approval and without invalidating otherwise fresh targeted Progress.

Full snapshot mode treats every Context file as controlling. Explicitly referencing an otherwise supporting file also makes it controlling. Final Gate always recompiles and records the complete current Context snapshot.

## Authority Projection Without Retrieval Friction

`context.toml` serves both future Context discovery and active Long-Task authority. Retrieval guidance—`triggers`, `read_when`, `read_policy`, default selection and unselected nodes—does not alter the meaning of Context already selected for one delivery, so it is excluded from that delivery's authority projection. Selected area ownership, role/dependency structure and selected Context contents remain protected and fail closed.

This removes unnecessary Authority Revision and scoped-Progress invalidation without adding a registry, index, state file or user step. It does not reuse final acceptance: any changed Git tree still requires the current-snapshot Live Final Gate.

Preflight follows the same cost rule. Repair metadata is emitted only for duplicate/coverage pairs with a deterministic same-Claim dependency. Independent diagnostics keep their existing compact form, and no finding is hidden or treated as resolved.

## Test-Cost Layers

Use short feedback loops during development, then widen before release:

```text
npm run test:affected:list
npm run test:affected
npm run test:long-task:focused
npm run test:delivery-contract:focused
```

The affected selector maps known hot spots to focused regression tests, widens unmapped Long-Task runtime changes to the complete Long-Task suite, and widens shared package, dependency or unknown changes to the full suite. It builds at most once per invocation when a build is required.

Affected and focused results are developer feedback only. They do not replace the complete package suite, source parity, smoke, pack, release checks or the Long-Task Final Gate.
