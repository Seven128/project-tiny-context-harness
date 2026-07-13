---
context_role: verification
read_policy: default
---
# Harness Package Verification

## Verification Paths

- `node packages/ty-context/dist/cli.js validate-context`
  - Use after Context graph, role Context or recovery facts change.
  - Expected signal: command exits with no errors and reports the Context graph files it loaded.
- `node --test tests/ty-context/orientation-fast-path.test.mjs`
  - Use after changing recoverability surfaces, Context topology, managed/default Skill boundaries, README/package README positioning or fast-path orientation expectations.
  - Expected signal: Node test runner exits with no failing subtests.
- `make validate-harness`
  - Composite local gate for Context recoverability and touched-source modularity.
  - Expected signal: Make exits successfully after running the configured Harness gates.
- `node packages/ty-context/dist/cli.js validate-plan-contract <plan.md|dir>`
  - Use after changing workflow-contract plan surface semantics, Source-to-Context Coverage, Context-to-Implementation Binding or plan-contract validator behavior.
  - Expected signal: command exits with no errors, reports source/binding row counts and does not claim product quality.
- `node packages/ty-context/dist/cli.js validate-plan-acceptance tmp/ty-context/plan-acceptance/<slug>`
  - Use after changing long-task matrix/verdict artifact semantics or plan-acceptance validator behavior.
  - Expected signal: command exits with no errors, reports matrix/verdict row counts and rejects contradictory complete claims.
- `node --test tests/ty-context/composite-campaign-*.test.mjs tests/ty-context/prepare-composite-long-task-skill.test.mjs`
  - Use after changing Campaign V4 schemas/graph/source coverage, conservative conflict scheduling, Git baseline/worktree/merge behavior, per-worktree binding, deterministic V3 YAML render/preflight, Goal manifest/receipt recovery, Integration/Campaign gates or the managed preparation Skill.
  - Expected signal: Node exits with no failing subtests. Graph/scheduler unit cases cover cycle/dangling/uncovered sources, explicit dependency, overlapping path/schema/resource/unknown conflicts and stable deterministic waves. Focused Git cases use real linked worktrees to prove shared wave base, branch isolation and independent active bindings. Graph/scheduler tests target 30 seconds total; focused worktree tests target 2 minutes total.
- `node --test tests/ty-context/composite-campaign-v4-black-box.test.mjs`
  - This is the focused Campaign V4 orchestration gate using real temporary Git repositories and a deterministic Fake Goal Adapter rather than real Codex Goal calls.
  - Required scenarios: two independent SFCs launch in one concurrent wave and merge; two SFCs with overlapping root package state serialize and the second uses the new integration head; a real merge conflict produces and completes a repair action without user input; and independently accepted Slices that regress after merge keep the Campaign unaccepted until an integration repair passes.
  - Each scenario must exercise worktree, branch, commit, Slice receipt, merge, integration and same-snapshot Campaign final result. The whole focused Campaign command targets 5 minutes. One optional real Codex Goal smoke remains development-only and is not a default CI gate.
- `npm run test:composite-workflow:built --workspace project-tiny-context-harness`
  - This is the single source-repository profile for Campaign V4 end-to-end and internal-mechanism tests. It includes graph/source coverage, scheduling, Git/worktree/target movement, the complete CLI path, four real-Git/Fake-Goal black boxes, managed preparation-Skill drift and an explicit-entrypoint policy check.
  - It is an explicit maintainer command only. Package CI, trusted publication and consumer Harness gates never run it automatically.
- `node packages/ty-context/dist/cli.js package sync-source` twice, then `node packages/ty-context/dist/cli.js package check-source`
  - Use after changing canonical managed Skills, AGENTS guidance, project-level Hook assets or public README sources.
  - Expected signal: the first sync copies canonical assets, the second reports `changed=0`, and check-source reports no drift; a following workspace `sync` installs the generated Skill without creating or scanning campaigns.
- `node --test tests/ty-context/composite-long-task-lightweight-black-box.test.mjs`
  - This is the focused pre-stable Composite gate. Every case must create a temporary real project and invoke the built CLI plus `final-gate` or the project-level Stop Hook; source-regex, test-name and file-existence assertions do not count.
  - Required cases: `happy_path_real_implementation` reaches `accepted` only with real product implementation; `missing_obligation` leaves one PI obligation unimplemented and reaches `needs_work`; `source_changed_after_compile` rejects Product, Plan or AC drift; `oracle_or_verifier_changed_after_compile` rejects changed verification authority; `stale_or_missing_final_result` makes Stop block before final-gate and after workspace drift; `drift_repair_end_to_end` detects an intentionally drifting first implementation, repairs it and then reaches `accepted`.
  - Budget: the whole focused command must finish within 5 minutes and each individual test should finish within 2 minutes. Exceeding the budget requires simplifying or moving the test, not increasing timeouts.
- `npm run build --workspace project-tiny-context-harness` and `npm run typecheck --workspace project-tiny-context-harness`
  - Use after Composite CLI, contract, verifier, Hook or package surface changes.
  - Expected signal: both commands exit successfully without requiring Rust, administrator permissions, containers or browsers.
- Old V2 assertion/state/derived/equivalence/source-regex tests and the HFC-011 Host attack matrix are not default gates. Do not restore an equivalence gate, privileged Host test, external audit runner, consumer release matrix or cross-platform browser/sandbox matrix for the pre-stable workflow.
- `git diff --check`
  - Use before handoff to catch whitespace and conflict marker issues.
  - Expected signal: no whitespace error output.
- `npm test --workspace project-tiny-context-harness`
  - Use explicitly for broader package behavior changes or when focused tests do not cover the touched package surface. The root `npm test` delegates to the same complete suite.
  - These two full-suite commands remain maintainer-invoked local gates. Package CI and trusted publication do not run the Campaign self-test profile; their retained checks cover build/package source drift/source Context and release artifact integrity as applicable.
  - Budget: the default complete Composite/package test path must finish within 15 minutes. No default test may call a real Codex Goal, install a cross-platform VM, container, browser matrix, privileged Helper or administrator environment. A budget overrun is a test-design failure to simplify, not a reason to raise the timeout.
- `node packages/ty-context/dist/cli.js package sync-source`
  - Use only after changing package-managed source assets that should be copied into `packages/ty-context/assets/**`.
  - For release or pre-upgrade closeout, run it twice; the second run must report `changed=0` or an equivalent no-op signal.
- `node packages/ty-context/dist/cli.js package check-source`
  - Use after source sync or when checking package asset drift.

## Scope Notes

- Context-only source-workspace topology changes normally require `validate-context`, the relevant focused test, `make validate-harness` and `git diff --check`.
- Pre-stable Composite acceptance proves the lightweight functional loop on the smallest common environment. It does not prove hostile-Host resistance, administrator isolation, OS credential protection, kernel sandboxing, release consumer compatibility or all-platform operation.
- Every default Composite test must name the concrete drift it prevents. Heavy Host security, compatibility and platform-release validation may be reconsidered only after the core workflow is stable and must live outside the default path.
- Do not run `package sync-source` for source-workspace `project_context/**`-only changes unless package-managed assets were also touched.
- Verification Context records repeatable paths and expected signals only. Do not add one-off logs, raw command output, temporary JSON, CI artifacts, release ledgers, secrets or result claims.
