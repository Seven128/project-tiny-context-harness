# DEV-030 README User Guide Split

## Summary

将原根 `README.md` 的长篇产品说明和设计取舍迁移为 `PROJECT_SPEC.md`，并新建轻量根 `README.md`。新的 README 面向 npm 包用户，说明 AI SDLC Harness 是什么、适用场景、安装方式、`init` / `init --adopt` / `sync` / `upgrade` / `doctor` 等命令，以及自然语言日常使用方式。

这个改动只调整文档入口，不改变 package runtime、sync/upgrade 行为、state schema 或 package assets。

## Changed Files

| 文件 | 变更 |
|---|---|
| `README.md` | 改写为用户视角的安装、接入、日常使用和命令指南。 |
| `PROJECT_SPEC.md` | 保存原 README 的完整项目规格说明，并更新标题、仓库结构和文档分层描述。 |
| `.docs/01_product/npm_package_distribution.md` | 新增 `PRD-NPM-024`，要求根 README 轻量化并把重型说明放入 `PROJECT_SPEC.md`。 |
| `.docs/03_tech_plan/harness_package_distribution.md` | 增加根文档分层技术说明。 |
| `.docs/INDEX.md` | 链接本 implementation doc。 |

## Behavior

- 访问仓库首页时，用户先看到 npm 包和 workflow 的使用指南。
- 维护者仍可通过 `PROJECT_SPEC.md` 查看完整设计背景、阶段契约、包化策略和历史取舍。
- `init --adopt` 仍可通过 `README.md` 判断已有项目，不需要代码变更。

## Verification

| Gate | Result |
|---|---|
| `python3 tools/validate_allowed_paths.py` | PASS，10 个 changed files 均在 DEV-030 allowed_paths 内。 |
| `make validate-harness` | PASS，Harness scaffold、prompt language 和 overview check 全部通过。 |
| `git diff --check` | PASS。 |
