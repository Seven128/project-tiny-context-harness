# ADR 002: Fact Sources, Memory and Overviews

Status: Accepted

## Context

不同阶段的产物容易分散在不同位置：产品文档可能在 Web AI、Notion、飞书、Confluence 或 Google Docs 中生成；技术方案可能在 IDE Agent 对话里生成；开发过程发生在 coding agent 中；Review 准则可能是临时 skill；测试策略可能靠人工补充。

这种分散会带来切换成本和理解成本。Agent 进入新阶段时，无法天然继承上一阶段的产物、边界、取舍和未解决问题，需要重新读取、总结和对齐。需求变化后，受影响的通常不是单个代码点，而是 PRD、技术方案、接口契约、任务计划、实现代码、测试用例、Review 结论和实现文档组成的一整条链。

RAG 能减少一次性塞进上下文的内容，但固定 chunk 和余弦召回存在信息损失。对 README 这类说明文档，RAG 损失通常可以接受；对需求边界、否定约束、接口契约、测试矩阵、RFC 影响范围等执行约束，不能只依赖 RAG。

## Options

- 依赖对话上下文、长文档和搜索来恢复所有阶段事实。
- 把所有信息长期塞进 `memory.md`。
- 使用 `.docs/**` 语义切片和 `.docs/INDEX.md` 作为事实源，`overview.md` 只做 generated 浏览视图，`memory.md` 只做短摘要和导航。

## Decision

阶段产物统一进入可寻址、可引用、可版本化的项目事实源。Markdown slices 和 `.docs/INDEX.md` 是事实源；`.docs/<stage>/overview.md` 由 `tools/build_doc_overviews.py` 生成，只用于人类浏览和阶段交接。

`<harnessRoot>/state/memory.md` 不承担完整决策记录。memory 回答“下次进入项目要先记住什么、去哪里找”，只保存跨阶段高频事实、约束摘要和到 `.docs/**` 正式事实源的链接。如果 memory 条目需要解释取舍、备选方案或长期后果，应提升为 `.docs/05_decisions/` ADR 或对应 `.docs/**` slice，memory 只保留一行摘要和链接。

## Rationale

每个阶段都需要留下对应产物。阶段产物不是为了堆文档，而是项目上下文的一部分：它记录该阶段已经确认的事实、边界、路径、用例、结果、风险和未决问题，并成为后续阶段继续工作的前提。

`.docs/` 采用粗粒度语义切片：小到足以被稳定检索和引用，大到保持一个完整语义单元，不按固定 token 或段落机械切。`overview.md` 把阶段 Markdown slices 合成总览，方便人类浏览，但需求引用、Review、测试和变更影响分析仍应引用原始 Markdown slice。

## Consequences

- 任意 `.docs/<stage>/**/*.md` 新增、修改、拆分、合并或废弃后，运行 `make docs-overview`。
- 不手写或局部编辑 `overview.md`。
- `.docs/05_decisions/` 只保存 durable decision；当前操作说明仍留 README、skills、templates 或 implementation doc。
- `memory.md` 可以索引 ADR，但不能成为 ADR 正文镜像。

## Source Trace

- `PROJECT_SPEC.md#2.2`: 阶段产物分散，跨阶段衔接存在切换成本和理解成本。
- `PROJECT_SPEC.md#3.3`: 事实源与派生产物。
- `PROJECT_SPEC.md#6.1`: 为什么要语义切片。
- `PROJECT_SPEC.md#6.2`: 各阶段切片责任、ADR 和 memory 边界。
- `PROJECT_SPEC.md#6.3`: overview.md。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [.docs/INDEX.md](../INDEX.md)
- [.codex/state/memory.md](../../.codex/state/memory.md)
