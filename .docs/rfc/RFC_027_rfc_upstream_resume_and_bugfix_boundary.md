# RFC_027: RFC upstream resume and bugfix boundary

## 1. 背景

实际项目在 `REVIEWING` 中处理需求或设计变化时，Agent 发现当前 phase graph 只允许 `RFC_RECALIBRATION -> SPRINTING`。这会把“需求、体验或技术方案事实变化”误路由成开发阶段恢复，导致 Agent 需要 `--force` 才能回到 `UI_UX_DESIGNING` 或其它上游阶段。

Harness 需要把两类恢复路径分清：

- RFC：`SPRINTING` 及之后发现需求、验收、UI/UX 或技术方案事实变化时，先进入 `RFC_RECALIBRATION`，再回到 `REQUIREMENT_GATHERING`、`UI_UX_DESIGNING` 或 `ARCHITECTING` 中的受影响阶段。
- Bugfix：`REVIEWING`、`TESTING` 或 `RELEASING` 发现既有 PRD、UI/UX 和技术方案正确但实现偏离时，才直接回 `SPRINTING`。

## 2. 变更内容（Change Content）

- Added: `RFC_RECALIBRATION -> REQUIREMENT_GATHERING` / `UI_UX_DESIGNING` / `ARCHITECTING` resume edges，均清理 `suspended_phase`。
- Added: `REVIEWING -> SPRINTING` 和 `RELEASING -> SPRINTING` 的 `bugfix_implementation_gap` return edges，与现有 `TESTING -> SPRINTING` 对齐。
- Changed: `RFC_RECALIBRATION` 的 allowed next phases 不再收敛到 `SPRINTING`。
- Changed: Manager、Dev、Tester、Reviewer、Release、Architect 和 RFC prompts 区分 RFC upstream resume 与 implementation-gap bugfix。
- Removed: `TESTING -> UI_UX_DESIGNING` / `ARCHITECTING` 的直接 bugfix return 语义；测试发现上游事实变化时先走 RFC。
- Unchanged: `SPRINTING` / `REVIEWING` / `TESTING` / `RELEASING -> RFC_RECALIBRATION` interrupt 入口仍合法；开发前 `ARCHITECTING -> REQUIREMENT_GATHERING` / `UI_UX_DESIGNING` return 仍合法。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | Public workflow behavior changes for managed consumers; no product feature scope expansion. |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `.codex/pjsdlc_managed/policies/phase_contracts.yaml` | Canonical transition graph changes RFC resume and bugfix return edges. | high |
| `tests/sdlc-harness/transition.test.mjs` | Regression covers RFC upstream targets, illegal RFC-to-SPRINTING, and post-development bugfix return. | high |
| `.codex/skills/**` / `AGENTS.md` | Prompt routing updated so agents stop treating upstream design changes as direct bugfix returns. | high |
| `README.md` / `packages/sdlc-harness/README.md` / `PROJECT_SPEC.md` | Public and design docs describe the new boundary. | high |
| `packages/sdlc-harness/assets/**` | Source sync distributes managed policy, prompts, templates, tools and README. | high |

## 5. UI/UX Impact（体验影响）

- Reviewed experience docs: `.docs/02_experience/**` not modified.
- DESIGN.md impact: none.
- Superseded screen contracts: none.
- Retained UX facts: existing UX facts remain current.
- Reason: workflow routing changes how post-development UX fact changes return to `UI_UX_DESIGNING`; it does not change a product screen contract.

## 6. Visual Reconciliation Impact（视觉还原影响）

- Reference images reviewed: none.
- Visual target type: `not_applicable`
- Usage boundary: `not_applicable`
- Existing screenshot / mock: none.
- Required screenshot artifacts: none.
- Difference analysis required: `false`
- Human visual approval required: `false`
- Approval status: `not_applicable`
- Engineering gates affected: transition and package source tests only.
- Visual acceptance affected: none.

## 7. Acceptance Criteria

- [x] `RFC_RECALIBRATION` exposes `REQUIREMENT_GATHERING`, `UI_UX_DESIGNING` and `ARCHITECTING` as legal next phases.
- [x] `RFC_RECALIBRATION -> SPRINTING` is illegal in the canonical graph.
- [x] `REVIEWING` / `TESTING` / `RELEASING -> SPRINTING` are legal only as `bugfix_implementation_gap` return edges.
- [x] TESTING no longer directly returns to `UI_UX_DESIGNING` or `ARCHITECTING`; upstream fact changes route through RFC.
- [x] Managed prompts and public docs describe RFC upstream resume versus bugfix return.

## 8. Regression Requirements（回归要求）

- [x] Run `node --test tests/sdlc-harness/transition.test.mjs`.
- [ ] Run `npm test --workspace agent-project-sdlc`.
- [ ] Run `node packages/sdlc-harness/dist/cli.js package sync-source`.
- [ ] Run `node packages/sdlc-harness/dist/cli.js package check-source`.
- [ ] Run `make docs-overview`.
- [ ] Run `make validate-harness`.

## 9. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.docs/07_test/TEST_REPORT.md` and `.docs/07_test/harness_consumer_lab.md` references will be refreshed only if generated overview or current report needs updated evidence.
- Superseded test docs: none.
- Retained test docs: existing test evidence remains historical unless a current report is explicitly updated by a TESTING task.
- Reason: this RFC adds transition regression coverage and does not invalidate current product test facts.

## 10. Development Self-Test Impact（开发自测影响）

- Entry/exit impact: lifecycle transition entrypoint `python3 tools/transition.py --to <PHASE>` changes legal RFC exit targets and bugfix return targets.
- Runtime / target environment impact: local CLI / Python transition helper only; no deployed runtime.
- Required gates impact: `validate-harness`, package source check and package regression cover the managed workflow behavior.
- Tech plan self-test contract impact: transition graph regression now expects RFC upstream resume and illegal RFC-to-SPRINTING.
- `plan.yaml` / `plan.draft.yaml` task contract impact: none to schema; workflow prompts clarify when RFC tasks lead back to upstream phase tasks.
- Implementation doc self-test report impact: implementation docs should record the new transition regression and package sync evidence.
- Module key test path impact: `node --test tests/sdlc-harness/transition.test.mjs` drives SPRINTING/REVIEWING/TESTING/RELEASING RFC interrupts, RFC upstream exits, illegal RFC-to-SPRINTING, direct bugfix returns, and illegal direct TESTING-to-upstream returns.
- Review / Testing handoff impact: Review/Testing can rerun the transition regression and inspect `phase_contracts.yaml`.

## 11. Status

- Status: APPLIED
