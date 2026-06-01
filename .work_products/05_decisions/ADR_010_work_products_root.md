# ADR 010: Workflow Work Products Root

Status: Accepted

## Context

AI SDLC Harness 早期把阶段产物放在 `.docs/**`。这个名字适合 Markdown PRD、技术方案、Review 和测试报告，但 UI/UX 阶段引入后，阶段产物不再只有文档：体验设计可能包含截图、mock、导出素材、视觉参考、证据索引和 runbook。继续使用 `.docs` 会让 Agent 和用户误以为只有 Markdown 文档才是可交接事实源，也会把 durable design materials 和 ignored local artifacts 混在一起。

同时，`.artifacts/**` 已经用于 benchmark raw output、临时运行目录、长日志和其它可再生成或不适合长期跟踪的本地产物。它不应该升级为 workflow source of truth。

## Options

- 保持 `.docs/**`，只在 UI/UX 阶段约定 assets 子目录。
- 新增 `.artifacts/**` 作为 UI/UX 物料根目录。
- 将 canonical workflow output root 重命名为 `.work_products/**`，保留 `.artifacts/**` 为 ignored temporary artifacts。

## Decision

将 durable、可版本化、可交接的 workflow 阶段产物根目录从 `.docs/**` 重命名为 `.work_products/**`。

`.work_products/**` 是 canonical fact source root，包含 Markdown slices、UI/UX 设计物料、截图、mock、证据索引和 runbook。UI/UX 非 Markdown 物料放在 `.work_products/02_experience/assets/<capability>/...`，并从对应 UX slice 引用。Google `DESIGN.md` 保留在项目根目录，因为该 spec 期望根级事实源。

Task schema 同步改名：

- `docs` -> `work_products`
- `result_docs` -> `result_work_products`
- `implementation_doc` -> `implementation_work_product`

命令同步改名：

- `make docs-overview` -> `make work-products-overview`
- `make validate-doc-overviews` -> `make validate-work-products-overviews`

不保留旧 Make target alias。兼容路径只通过 `sdlc-harness upgrade` migration 处理：旧项目的 `.docs/**` 会迁移到 `.work_products/**`，并重写 state、plan、draft plan、memory 和 work product 文件中的旧路径与 task field names。若 `.docs` 和 `.work_products` 同时存在且 `.docs` 有用户内容，upgrade 阻断并要求人工合并。

## Rationale

`.work_products` 比 `.docs` 更准确地表达“阶段交接事实源”：它既能容纳 Markdown 文档，也能容纳设计素材、截图和 evidence index。这个名字让后续 Agent 明确知道这些内容是 workflow contract 的一部分，而不是临时附件。

`.artifacts` 继续作为 ignored temporary root，可以承载 raw transcript、临时项目、benchmark run dirs 和长日志，避免把不可长期维护的输出误纳入事实源。

这次选择是 breaking workflow/package change，不做双路径兼容，是为了避免 validators、skills、templates 和 task schema 长期同时解释 `.docs` 与 `.work_products`，产生新的漂移面。升级迁移负责一次性桥接旧项目。

## Consequences

- Fresh `init` 创建 `.work_products/**`，不创建 `.docs/**`。
- Validators、skills、templates、Makefile、README、package README、PROJECT_SPEC 和 package assets 只描述 `.work_products/**` 和新 task fields。
- `validate-uiux` 接受 `.work_products/02_experience/**` Markdown UX slices，并检查 UX slice 中引用的 `.work_products/02_experience/assets/**` 物料存在。
- Package `upgrade` 需要迁移旧 root、旧 task fields 和旧 overview command references。
- 旧自动化中直接调用 `make docs-overview` 或引用 `docs.*` task fields 的脚本必须升级。

## Source Trace

- User plan: "Rename Workflow Artifacts From `.docs` To `.work_products`".
- `PROJECT_SPEC.md#3`: canonical fact source and generated overview model.
- `README.md`: public package capability and migration behavior.
- `packages/sdlc-harness/src/lib/migrations.ts`: upgrade migration.
- `tools/build_work_product_overviews.py`: overview builder.

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [README.md](../../README.md)
- [package README](../../packages/sdlc-harness/README.md)
- [.work_products/INDEX.md](../INDEX.md)
