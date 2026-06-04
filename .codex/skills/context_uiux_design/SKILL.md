---
name: context_uiux_design
description: Use when the user asks for 设计稿, UI/UX, uiux, UIUX, UI 设计, UX 设计, 交互设计, 界面设计, 页面设计, 视觉设计, 原型, 线框图, 视觉规范, 组件状态, 响应式设计, 用户体验, wireframe, mockup, design system, DESIGN.md, screen design, interaction design, visual design, responsive design, or frontend handoff in a Minimal Context Harness project. Do not trigger for ordinary coding, bug fixing, local CSS tweaks, or generic mentions of design.
---

# Context UIUX Design

## 目标

帮助 agent 把界面、交互和视觉设计结论沉淀成可恢复的 Minimal Context 和 `DESIGN.md`。

## 工作方式

1. 先读取 `project_context/global.md` 和相关 `project_context/modules/*.md`。
2. 如果项目存在 `DESIGN.md`，先读取它；如果用户要求视觉体系、设计稿或界面风格，按 Google `@google/design.md` 的 DESIGN.md 格式创建或更新根目录 `DESIGN.md`。
3. 整理或生成：用户流程、页面/组件清单、关键状态、交互反馈、响应式边界、a11y 要求、视觉约束和设计 token。
4. 如果涉及已有 UI，优先结合代码入口、运行截图或用户提供的参考图来描述差异。
5. 需要长期沉淀时：
   - 项目级体验原则和屏幕清单写入 `global.md`。
   - 模块级 screen contract、state、interaction 和视觉约束写入对应 module Context。
   - 颜色、字体、间距、圆角、组件视觉 token 和视觉 rationale 写入 `DESIGN.md`。
   - 新 UI 模块可新增 `project_context/modules/<module>.md`，并更新 `global.md#Module Index`。
6. Context 只能声明设计验收入口或 smoke 入口，不能伪造“已验证通过”。

## 输出边界

- 不默认创建 `.work_products/**`、UI/UX 独立文档、handoff matrix、review/test/release 文档。
- 不要求 lifecycle phase、plan task、phase gate 或阶段 Skill。
- 如果用户明确要求独立设计稿、mock 或页面说明，可以临时生成；长期事实仍要提炼回 `project_context/**` 和 `DESIGN.md`。
- `DESIGN.md` 是视觉设计系统事实源；项目流程、模块契约和下一步动作仍以 `project_context/**` 为准。
- 如果用户只是要求实现页面、修复 UI bug、局部改 CSS 或换一个颜色，不需要触发本 Skill；只有需要设计方向、界面方案、视觉体系、交互规则或长期设计事实沉淀时才使用。

## DESIGN.md 使用规则

- 使用 Google `@google/design.md` 格式：YAML front matter 存 tokens，Markdown body 存设计理由。
- 优先包含 `name`、`colors`、`typography`、`spacing`、`rounded` 和必要 `components` token。
- Markdown section 顺序优先为：`Overview`、`Colors`、`Typography`、`Layout`、`Elevation & Depth`、`Shapes`、`Components`、`Do's and Don'ts`。
- 写入或修改后，如本地可用，运行 `npx @google/design.md lint DESIGN.md` 检查结构；不要把 lint 结果写成“已通过”除非本轮真实执行。
- 需要给工程消费 token 时，可用 `npx @google/design.md export --format css-tailwind DESIGN.md` 或 `json-tailwind` 生成临时输出。

## 建议沉淀位置

- `global.md#UX / Screen Brief`：全局体验原则、主要屏幕、跨模块流程。
- `modules/*.md#User / System Contract`：页面、组件、状态、交互和数据展示契约。
- `modules/*.md#Key Constraints`：responsive、a11y、品牌/视觉边界、加载/空态/错误态约束。
- `modules/*.md#Test Entry Points`：UI smoke、截图验收、可访问性检查或项目自己的测试入口。
- `DESIGN.md`：视觉 identity、design tokens、组件视觉规则和 do/don't。
