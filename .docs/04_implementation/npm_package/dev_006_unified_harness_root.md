# DEV-006 Unified Harness Root Implementation Doc

## 1. 关联信息

- Task ID: `DEV-006`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `.docs/rfc/RFC_001_unify_harness_directory_model.md`
- Linked commit: `eb778fd`

## 2. 本次实现范围

- 新增（Added）:
  - `.harness/agents/skills/**` as the workspace canonical Skill source.
  - `.harness/managed/templates/**`、`.harness/managed/policies/**` and `.harness/managed/make/sdlc-harness.mk` as package-managed workspace assets.
  - Migration coverage for old `.agents/skills`、`.harness/templates`、`.harness/policies` and `.harness/make` config paths.
- 修改（Changed）:
  - Package default config, sync engine, source mappings, and Node validators now target the `.harness` canonical layout.
  - `sdlc-harness sync` materializes both `.harness/agents/skills/**` and `.agents/skills/**`.
  - README explains `.harness` as canonical root and `.agents` as compatibility view.
  - Package tests cover new sync output, source sync mappings, validator requirements, and config migration.
- 未覆盖（Not covered）:
  - Current Python local gate scripts still read legacy `.harness/policies/**` and `.harness/templates/**`; these legacy mirrors remain in this workspace for transition compatibility.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `.harness/config.yaml` | Current workspace package sync config | `managed_files`, `local_overrides` |
| `.harness/agents/skills/**/SKILL.md` | Canonical workspace Skill source | phase Skill files |
| `.harness/managed/templates/**` | Canonical package-managed templates | PRD/RFC/checkpoint/implementation templates |
| `.harness/managed/policies/**` | Canonical package-managed policies | `phase_contracts`, `gates`, `allowed_paths`, `risk_matrix` |
| `packages/sdlc-harness/src/lib/config.ts` | Default package config | `defaultConfig` |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | Materializes package assets into projects | `runSync`, `syncManagedFile` |
| `packages/sdlc-harness/src/lib/migrations.ts` | Upgrades old project config layouts | `migrateConfig`, `migrateManagedFiles` |
| `packages/sdlc-harness/src/lib/validators.ts` | Node validation runtime | `validateHarness` |
| `packages/sdlc-harness/source-mappings.yaml` | Source workspace to package asset mapping | `.harness/agents`, `.harness/managed` sources |
| `tests/sdlc-harness/*.test.mjs` | Regression coverage for package behavior | sync/init/doctor, upgrade, validators, package source |

## 4. 核心数据流

```txt
harness source workspace
-> .harness/agents/skills + .harness/managed/*
-> sdlc-harness package sync-source
-> packages/sdlc-harness/assets/*
-> sdlc-harness sync
-> project .harness canonical files + .agents compatibility view
-> validate-harness / doctor
```

## 5. 关键实现逻辑

- 输入校验（Input validation）:
  - Node `validate-harness` requires `.harness/agents/skills`、`.harness/managed/templates` and `.harness/managed/policies`; DEV-007 removes `.agents/skills` from required tracked workspace state.
  - `package check-source` reads package mappings from `.harness/agents/skills` and `.harness/managed/**`.
- 核心分支（Core branches）:
  - `syncManagedFile` writes canonical Skill assets to `.harness/agents/skills`.
  - The same Skill assets are also written to `.agents/skills` for compatibility with Agent startup conventions.
  - Legacy config paths are still recognized by `syncManagedFile` so older config files do not immediately break.
  - `migrateManagedFiles` rewrites old config paths to the new canonical layout during `upgrade`.
- 异常处理（Error handling）:
  - Missing package asset directories are reported as skipped sync entries, preserving existing behavior.
  - Config migration deduplicates managed paths so old `.agents/skills` does not create duplicate entries.
- 边界兜底（Boundary fallback）:
  - Legacy `.harness/templates/**` and `.harness/policies/**` remain in the source workspace for current Python gates.
  - New npm package behavior does not rely on Python validators.
- 性能或并发注意事项（Performance or concurrency notes）:
  - Sync remains file-copy based and deterministic; no concurrent writes were introduced.

## 6. 与技术方案的偏移

- RFC_001 planned `.harness/managed/**` as canonical package-managed layout. The implementation applies that to npm package source mappings, sync, migrations, and Node validators.
- Full removal of legacy `.harness/templates/**` and `.harness/policies/**` is intentionally deferred because current local Python gates still depend on those paths.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build and all package tests | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Source workspace to package assets drift check | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | Node validator for new canonical layout | PASS |
| `make validate-harness` | Local Harness scaffold, prompt language, checkpoint, and doc overview gates | PASS |
| `make validate-checkpoint` | DEV-006 checkpoint completeness after >5 file change trigger | PASS |

## 8. 后续维护注意事项

- Future work can migrate local Python gate scripts to `.harness/managed/**` and then archive legacy `.harness/templates/**` / `.harness/policies/**`.
- When Skill, template, policy, Makefile, workflow, or AGENTS source changes, run `sdlc-harness package sync-source` and `package check-source`.
- Keep `.agents/skills/**` generated from `.harness/agents/skills/**`; do not treat `.agents` as the source of truth.
