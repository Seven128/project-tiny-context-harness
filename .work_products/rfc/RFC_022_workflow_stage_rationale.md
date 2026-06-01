# RFC_022: 工作流阶段动机说明补充

## 1. 背景

`PROJECT_SPEC.md` 的 2.1 已经说明：简单项目可以依靠单纯 Vibe Coding 完成闭环，复杂度上来后需要显式软件工程阶段。用户补充希望进一步说明“为什么需要阶段化工作流”：因为各阶段的输入、执行和输出工作量客观存在，如果没有工作流程约束，这些工作量容易被遗漏，阶段产物偏差会持续累积，直到测试阶段才集中暴露并造成返工。

本 RFC 只处理一处产品规格说明补充，不改变 Harness 的 CLI、validator、Skill、policy、template、package sync/upgrade 或迁移行为。

## 2. 变更内容（Change Content）

- Changed: `PROJECT_SPEC.md` 2.1 补充说明软件工程阶段的工作量来自各阶段客观存在的输入、执行和输出要求。
- Changed: `PROJECT_SPEC.md` 2.1 补充说明缺少工作流/工作阶段时，阶段输入缺失、执行遗漏、输出不完整会让偏差向下游累积，并在测试阶段转化为返工、修 bug、改需求或重切方案。
- Changed: `PROJECT_SPEC.md` 2.1 明确工作流通过显性化和契约化阶段产出，减少遗漏和返工，提高 Agent 产出的准确率和整体效率。

## 3. Product Impact（产品影响）

| 受影响产物（Affected Artifact） | 影响（Impact） |
|---|---|
| `PROJECT_SPEC.md` | 补强“当前现状与要解决的问题”中使用阶段化工作流的动机说明。 |
| `README.md` | 不影响。README 面向安装和日常使用入口，本次不新增对外能力或用户操作。 |
| `packages/sdlc-harness/README.md` | 不影响。本次不改变 package public capability。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| CLI / validators / migrations | 无技术行为变化。 | high |
| Workflow skills / policies / templates | 无规则或模板变化。 | high |
| Package assets / source sync | 无需同步；`PROJECT_SPEC.md` 不在 package source mappings 中。 | high |
| Tests | 无需新增测试；运行 RFC gate 和现有回归入口即可。 | high |

## 5. Acceptance Criteria

- [x] `PROJECT_SPEC.md` 2.1 补充阶段工作量客观存在的原因。
- [x] `PROJECT_SPEC.md` 2.1 说明缺少工作流程会导致输入、执行、输出遗漏并累积偏差。
- [x] `PROJECT_SPEC.md` 2.1 说明工作流如何减少返工并提高准确率和效率。

## 6. Regression Requirements（回归要求）

- [x] `make validate-plan`
- [x] `make work-products-overview`
- [x] `make validate-rfc`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.work_products/07_test/TEST_REPORT.md`, `.work_products/07_test/harness_consumer_lab.md`
- Superseded test docs: none
- Retained test docs: `.work_products/07_test/TEST_REPORT.md`, `.work_products/07_test/harness_consumer_lab.md`
- Reason: 本 RFC 只是产品规格文案澄清，不替换测试策略、测试报告或当前测试事实源。

## 8. Status

- Status: APPLIED
