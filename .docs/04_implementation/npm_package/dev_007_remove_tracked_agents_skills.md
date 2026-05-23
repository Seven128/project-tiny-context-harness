# DEV-007 Remove Tracked Agents Skills Implementation Doc

## 1. 关联信息

- Task ID: `DEV-007`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `.docs/rfc/RFC_001_unify_harness_directory_model.md`
- Linked commit: pending

## 2. 本次实现范围

- 新增（Added）:
  - `.gitignore` rule for `.agents/skills/` as a generated compatibility view.
  - DEV-007 checkpoint for the gate failure and >5 file change trigger.
- 修改（Changed）:
  - Removed tracked `.agents/skills/**/SKILL.md` files from the repository.
  - Python local gates now validate Skill files under `.harness/agents/skills/**`.
  - Node `validate-harness` no longer requires `.agents/skills/**`.
  - README and AGENTS now describe `.agents/skills/**` as generated and not a source authoring path.
  - Package `AGENTS_CORE.md` was regenerated from the updated `AGENTS.md`.
- 未覆盖（Not covered）:
  - `sdlc-harness sync` still supports generating `.agents/skills/**` for Agent clients that require that compatibility path.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `.gitignore` | Ignores generated compatibility Skill view | `.agents/skills/` |
| `.harness/agents/skills/**/SKILL.md` | Canonical tracked Skill source | phase Skill files |
| `tools/validate_harness.py` | Local Python Harness scaffold validator | canonical Skill path checks |
| `tools/validate_prompt_language.py` | Local prompt language validator | canonical Skill and template checks |
| `packages/sdlc-harness/src/lib/validators.ts` | Node package validator runtime | `validateHarness` |
| `tests/sdlc-harness/validators.test.mjs` | Regression for Node validator without `.agents/skills` | `runValidator` |

## 4. 核心数据流

```txt
tracked source
-> .harness/agents/skills/** + .harness/managed/**
-> validators read canonical .harness paths
-> optional sdlc-harness sync
-> local ignored .agents/skills/** compatibility view
```

## 5. 关键实现逻辑

- 输入校验（Input validation）:
  - Local Python validators no longer use `.agents/skills/**` as a required path.
  - Node `validate-harness` passes in a fixture without `.agents/skills/**`.
- 核心分支（Core branches）:
  - Source authoring and validation use `.harness/agents/skills/**`.
  - Compatibility output remains supported by `sdlc-harness sync`.
- 异常处理（Error handling）:
  - If an Agent client needs `.agents/skills/**`, running `sdlc-harness sync` regenerates it from package assets.
- 边界兜底（Boundary fallback）:
  - The deleted `.agents/skills/**` files still exist canonically under `.harness/agents/skills/**`.
- 性能或并发注意事项（Performance or concurrency notes）:
  - No runtime concurrency changes.

## 6. 与技术方案的偏移

- This tightens RFC_001 semantics: `.agents/skills/**` remains a generated compatibility view but is no longer tracked in the source workspace.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build and package tests | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package source drift after AGENTS update | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | Node validator without tracked `.agents/skills` | PASS |
| `make validate-harness` | Local Python Harness checks using canonical Skill path | PASS |
| `make validate-current` | Sprint exit gate with all tasks closed | PASS |

## 8. 后续维护注意事项

- Do not edit or commit `.agents/skills/**`; edit `.harness/agents/skills/**` instead.
- If an Agent environment requires `.agents/skills/**`, regenerate it with `sdlc-harness sync`.
