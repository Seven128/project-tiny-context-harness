---
name: context_uiux_design
description: Use when the user explicitly asks for 设计稿, 重做设计, UI/UX 设计方案, UI 设计师, UX 设计师, 视觉设计方案, 视觉专家, 交互设计方案, 界面设计方案, 页面设计方案, 原型设计, 线框图方案, 视觉规范, 设计系统方案, DESIGN.md, Impeccable review, UX designer, UI designer, frontend redesign, visual polish, or design system spec in a Minimal Context Harness project. Do not trigger for ordinary UI implementation, CSS tweaks, bug fixes, or generic mentions of 设计, design, or user experience.
---

# Context UIUX Design

## 目标

帮助 agent 把界面、交互和视觉设计结论沉淀成可恢复的 Minimal Context 和 `DESIGN.md`。

## 工作方式

1. 先读取 `project_context/global.md` 和 `project_context/context.toml`，按 default area、triggers、read_when 选择相关 context。
2. 如果项目存在 `DESIGN.md`，先读取它；如果用户要求视觉体系、设计稿或界面风格，按 Google `@google/design.md` 的 DESIGN.md 格式创建或更新根目录 `DESIGN.md`。
3. 整理或生成：用户流程、页面/组件清单、关键状态、交互反馈、响应式边界、a11y 要求、视觉约束和设计 token。
4. 界面职责、流程归属和长期交互契约以 `project_context/**` 为准；`DESIGN.md` 负责视觉 token 和视觉 rationale；代码、截图和搜索结果只说明当前实现状态。Context 决定“应该是什么”，代码和截图揭示“现在是什么”，代码不能静默重定义 Context。
5. 设计或实现前先判断是否改变长期事实；如果改变页面职责、流程边界、交互契约、状态语义、可访问性约束或设计验证入口，先更新相关 `project_context/**`/`DESIGN.md`，再让实现按这些事实对齐。
6. 普通 UI bug、局部 CSS 修复或探索性 spike 可先改代码；一旦形成长期交互或视觉结论，继续对齐或交付前必须回写 Context 或 `DESIGN.md`。不要把 Context 机械补成代码改动摘要。
7. 如果二者冲突，显式标记为实现漂移、缺失工作或 Context 过期。
8. 如果涉及已有 UI，优先结合代码入口、运行截图或用户提供的参考图来描述差异。
9. 当任务涉及设计稿、重做设计、视觉方案、设计系统、visual polish、frontend redesign 或 frontend styling，且存在可扫描的 UI 代码、页面文件、构建产物目录或本地/远程 URL 时，默认运行 `npx impeccable detect <target>`；实现前可用于识别既有视觉问题，实现后或交付前用于审查结果。没有可扫描目标、命令不可用或扫描失败时，说明原因并继续。
10. 需要长期沉淀时：
   - 项目级体验原则和屏幕清单写入 `global.md`。
   - 模块级 screen contract、state、interaction 和视觉约束写入对应 area / subdomain Context。
   - 颜色、字体、间距、圆角、组件视觉 token 和视觉 rationale 写入 `DESIGN.md`。
   - 新 UI context unit 可新增 `project_context/areas/<unit>.md`，并更新 `global.md#Context Index`；复杂项目同时更新 `project_context/context.toml`。
   - 如果 `upgrade` 自动把深层 `.md` 注册成 area，但语义上更像 foundation / contract / archive，后续应显式调整 manifest role；不要依赖自动迁移判断语义。
11. Context 只能声明设计验收入口或 smoke 入口，不能伪造“已验证通过”。

## 视觉质量校准

- 先判断界面 register：品牌页、营销页、作品集等让设计承载表达；产品工具、后台、dashboard、表单等让设计服务任务。品牌界面可以更强烈地使用图像、色彩和编排；产品界面优先可扫读、稳定组件、熟悉交互和任务效率。
- 已有 UI 优先保持身份连续性：先找现有 token、组件库、全局 CSS、Tailwind config、截图或代表性页面；除非用户明确要求重设计，不要推翻已建立的字体、颜色、组件语言。
- 绿色地设计视觉体系时，先说明场景和色彩策略，再选 token：谁在什么环境下使用、界面应该 restrained / committed / full palette / drenched 到什么程度。不要按品类套默认审美。
- 做设计方案或视觉规范时，显式检查：文字对比度、65-75ch 正文行长、清晰字号层级、响应式边界、44px 触控目标、焦点态、hover/active/disabled/loading/error/success 状态、空态/错误态/长文本、reduced motion 和文本不溢出。
- 避免常见 AI 视觉反模式：嵌套卡片、无意义玻璃拟态、紫蓝渐变或渐变文字、灰字压在彩色背景上、默认米色/奶油色大背景、过度圆角、边框加大模糊阴影的幽灵卡片、每段一个圆角 icon tile、每节重复小号全大写 eyebrow 或 `01 / 02 / 03` 标记、bounce/elastic easing、空泛营销 buzzword。
- 视觉审查时先分清问题类型：a11y / responsive / theming / interaction / copy / performance / anti-pattern。把真正影响用户理解、操作或品牌信任的问题列为高优先级；少量纯审美偏好不要淹没关键问题。
- Harness 默认携带 Impeccable CLI 能力；做设计稿、重做设计、视觉设计方案、设计系统方案、frontend redesign、visual polish 或既有 UI 视觉审查时，默认尝试运行 `npx impeccable detect <target>` 作为辅助证据，不必等待用户点名。其输出只能作为设计缺陷线索，不是 Harness gate，也不能替代人工截图检查、项目测试或 `validate-context`。

## 输出边界

- 不默认创建 `.work_products/**`、UI/UX 独立文档、handoff matrix、review/test/release 文档。
- 不要求 lifecycle phase、plan task、phase gate 或阶段 Skill。
- 如果用户明确要求独立设计稿、mock 或页面说明，可以临时生成；长期事实仍要提炼回 `project_context/**` 和 `DESIGN.md`。
- `DESIGN.md` 是视觉设计系统事实源；项目流程、模块契约和下一步动作仍以 `project_context/**` 为准。
- 如果用户只是要求实现页面、修复 UI bug、局部改 CSS、换颜色，或只是泛泛提到“设计 / design / user experience”，不需要触发本 Skill；只有明确角色名或强相关产物名指向设计方向、界面方案、视觉体系、交互规则或长期设计事实沉淀时才使用。

## DESIGN.md 使用规则

- 使用 Google `@google/design.md` 格式：YAML front matter 存 tokens，Markdown body 存设计理由。
- 优先包含 `name`、`colors`、`typography`、`spacing`、`rounded` 和必要 `components` token。
- Markdown section 顺序优先为：`Overview`、`Colors`、`Typography`、`Layout`、`Elevation & Depth`、`Shapes`、`Components`、`Do's and Don'ts`。
- 写入或修改后，如本地可用，运行 `npx @google/design.md lint DESIGN.md` 检查结构；不要把 lint 结果写成“已通过”除非本轮真实执行。
- 需要给工程消费 token 时，可用 `npx @google/design.md export --format css-tailwind DESIGN.md` 或 `json-tailwind` 生成临时输出。

## 建议沉淀位置

- `global.md#UX / Screen Brief`：全局体验原则、主要屏幕、跨模块流程。
- `areas/*.md#User / System Contract`：页面、组件、状态、交互和数据展示契约。
- `areas/*.md#Key Constraints`：responsive、a11y、品牌/视觉边界、加载/空态/错误态约束。
- `areas/*.md#Test Entry Points`：UI smoke、截图验收、可访问性检查或项目自己的测试入口。
- `project_context/context.toml`：复杂项目的 area/context_unit、role、触发词、按需读取策略和可选边界规则。
- `DESIGN.md`：视觉 identity、design tokens、组件视觉规则和 do/don't。
