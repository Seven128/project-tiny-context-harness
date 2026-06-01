# ADR 007: UI/UX Design Stage and DESIGN.md Fact Source

Status: Accepted

## Context

原有阶段链路从 `REQUIREMENT_GATHERING` 直接进入 `ARCHITECTING`。这让 PRD 里的用户目标和验收标准可以进入技术方案，但视觉 UI、页面状态、交互行为、响应式、a11y 和设计 token 往往没有独立事实源。后续 Agent 在架构、开发、Review 或测试阶段容易临场补设计，导致体验口径漂移、实现偏离、Review 缺少对照基准、TESTING 重新设计 UI。

Google 开源的 `DESIGN.md` 提供了 agent-readable 设计系统格式，适合保存 colors、typography、spacing、components 等视觉系统事实。但它主要描述视觉系统，不覆盖完整用户旅程、screen contract、状态矩阵和测试种子，因此不能单独替代 UX 交接文档。

## Options

- 继续把 UI/UX 设计作为 `ARCHITECTING` 的一个小节。
- 只引入根目录 `DESIGN.md`，不新增阶段。
- 新增 `UI_UX_DESIGNING` 阶段，并把 `.work_products/02_experience/**` 作为体验事实源；视觉 UI 项目再强制 `DESIGN.md`。

## Decision

新增 `UI_UX_DESIGNING` 阶段，插入正常流转 `REQUIREMENT_GATHERING -> UI_UX_DESIGNING -> ARCHITECTING`。该阶段由 `pjsdlc_uiux_design` 负责，出口 gate 是 `make validate-uiux` / `npx sdlc-harness validate-uiux`。

阶段产物拆成两层：

- `.work_products/02_experience/<capability>.md` 是体验事实源，记录 PRD refs、Requirement IDs、Applicability、user journeys、IA/routes/screens、screen contracts、component interaction contracts、responsive/a11y acceptance、handoff matrix、open questions 和 out of scope。
- `DESIGN.md` 是 visual UI 项目的视觉设计系统事实源，采用 Google `@google/design.md` 格式。CLI/API/non-visual 项目可以在 UX slice 中声明 `Applicability: cli_or_api_experience` 或 `Applicability: not_applicable`，不强制生成 `DESIGN.md`。

`ARCHITECTING` 可以在进入 `SPRINTING` 前通过 `ARCHITECTING -> UI_UX_DESIGNING` return edge 补体验事实。进入 `SPRINTING` 后发现 UX contract、screen state、handoff matrix 或 `DESIGN.md` 需要变化，按 RFC workflow 处理；RFC 完成后通过 `RFC_RECALIBRATION -> UI_UX_DESIGNING` resume edge 回到体验设计阶段。后开发阶段直接回 `SPRINTING` 只表示实现偏离既有体验和技术方案。

## Rationale

UI/UX 阶段独立出来，是为了让体验设计成为后续阶段可引用、可校验、可变更影响分析的事实源，而不是把页面状态和视觉系统埋在 PRD 或技术方案里。`.work_products/02_experience/**` 覆盖用户旅程、screen state 和交接矩阵；`DESIGN.md` 覆盖视觉 token 和组件设计系统。两者组合后，架构可以从 screen contracts 派生 UI task 和 browser scenarios，开发可以按 `work_products.uiux` / `work_products.design_system` 实现，Review 和 TESTING 可以基于相同 contract 检查一致性。

这个设计保持轻量 declarative 边界：phase graph 只新增阶段节点和少量 return edge；validator 只检查必要产物、引用和 `DESIGN.md` linter error；不引入 Figma/Stitch 设计稿生成器、UI 运行时执行器或重型设计图 schema。

## Consequences

- `phase_contracts.yaml`、`allowed_paths.yaml`、`gates.yaml`、Skill、templates、validators、README 和 package assets 都需要包含 `UI_UX_DESIGNING`。
- `validate-design` 会把 UI/frontend draft task 缺少 `work_products.uiux` 或 `work_products.design_system` 作为 gate error。
- `SPRINTING`、`REVIEWING`、`TESTING` 和 `RFC_RECALIBRATION` 都必须把 `.work_products/02_experience/**` 和可选 `DESIGN.md` 纳入输入或影响分析。
- `DESIGN.md` linter error 阻断 visual UI gate；warning 先报告，不默认阻断。
- 非 visual UI 项目必须显式声明 Applicability，避免为 CLI/API 项目制造无意义设计系统文件。

## Source Trace

- User plan: "UI/UX Design Stage For AI SDLC Harness".
- `PROJECT_SPEC.md#5`: 生命周期与阶段契约。
- `.codex/pjsdlc_managed/policies/phase_contracts.yaml`: canonical phase graph.
- `.codex/pjsdlc_managed/templates/UI_UX_DESIGN_TEMPLATE.md`: UX slice template.
- `.codex/skills/pjsdlc_uiux_design/SKILL.md`: stage Skill.

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [README.md](../../README.md)
- [package README](../../packages/sdlc-harness/README.md)
- [UI/UX Skill](../../.codex/skills/pjsdlc_uiux_design/SKILL.md)
- [UI/UX Template](../../.codex/pjsdlc_managed/templates/UI_UX_DESIGN_TEMPLATE.md)
