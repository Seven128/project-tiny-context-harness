# DEV-003 upgrade/migrations Implementation Doc

## 1. 关联信息

- Task ID: `DEV-003`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: pending

## 2. 本次实现范围

- 新增（Added）:
  - `runMigrations` for config normalization, state task shape migration, and memory file creation.
  - `runUpgrade`, which runs migrations, then `sync`, then `doctor`.
  - Node test coverage for upgrade preserving and migrating project state structure.
- 修改（Changed）:
  - `sdlc-harness upgrade` command now calls real upgrade logic.
- 未覆盖（Not covered）:
  - No versioned multi-step migration chain yet; current schema version is `1`.
  - No package source drift check yet; DEV-004 covers that.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/src/lib/migrations.ts` | State/config migration engine | `runMigrations`、`CURRENT_SCHEMA_VERSION` |
| `packages/sdlc-harness/src/lib/upgrade.ts` | Upgrade orchestration | `runUpgrade` |
| `packages/sdlc-harness/src/commands/upgrade.ts` | CLI adapter | `upgrade` |
| `tests/sdlc-harness/upgrade.test.mjs` | Focused upgrade test | `runUpgrade` |

## 4. 核心数据流

```txt
sdlc-harness upgrade
-> runMigrations
-> runSync
-> runDoctor
-> report blockers or success
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: Upgrade uses existing config/state readers and doctor after migration.
- 核心分支（Core branches）:
  - Missing config is skipped by migration and reported later by doctor.
  - `tasks.yaml` gets missing `current_phase`, `current_task_id`, and `tasks` structure without replacing task values.
  - Missing `memory.md` is created with a short protocol note.
- 异常处理（Error handling）: Upgrade throws if sync reports blockers or doctor reports errors.
- 边界兜底（Boundary fallback）: State migrations add missing structure but preserve concrete project state values.
- 性能或并发注意事项（Performance or concurrency notes）: Migration and sync run sequentially.

## 6. 与技术方案的偏移

- 暂无。实现保持 `upgrade` 自动执行 `sync` 的 P0 约束。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build plus init/sync/doctor/upgrade tests | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-003 changed file boundaries | PASS |
| `make validate-checkpoint` | DEV-003 checkpoint completeness | PASS |
| `make lint` | Current project lint gate placeholder | PASS |
| `make test-current-domain` | Current task focused gate placeholder | PASS |

## 8. 后续维护注意事项

- DEV-004 should ensure package canonical assets do not drift from this self-hosting source workspace.
- Future schema versions should add explicit migration records to `migrations`.
