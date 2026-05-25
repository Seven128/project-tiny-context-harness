# Package Release Flow Implementation Doc

## 1. 关联信息

- Domain: `npm_package`
- Module / subsystem / core flow: package release and registry smoke
- Updated by task: `DEV-033`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: `DEV-033` implementation commit

## 2. 当前实现范围

- 新增（Added）:
  - `agent-project-sdlc@0.1.3` release record.
  - Package release flow implementation fact slice.
- 修改（Changed）:
  - `packages/sdlc-harness/package.json` version bumped from `0.1.2` to `0.1.3`.
  - `package-lock.json` workspace package version updated to `0.1.3`.
- 未覆盖（Not covered）:
  - 不修改 runtime source；本次发布包内已有 DEV-032 workflow assets。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/package.json` | npm package manifest and publish version | `version`, `files`, `bin`, `scripts.prepack` |
| `package-lock.json` | workspace dependency lock | `packages/sdlc-harness.version` |
| `.docs/08_release/v0.1.3_npm_release.md` | release evidence and rollback plan | Build Artifacts, Smoke Test Result, Deployment Checklist |

## 4. 核心数据流

```txt
Version bump
-> package source drift check
-> tests and harness validation
-> npm pack dry run
-> npm publish
-> npm view registry verification
-> install published package in temp consumer
-> init + doctor smoke
-> git tag and push
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: 发布前确认 registry latest 是 `0.1.2`，本次使用下一个 patch version `0.1.3`。
- 核心分支（Core branches）: `npm publish --workspace agent-project-sdlc` 触发 workspace package 的 `prepack`，由 TypeScript build 生成 tarball 内的 `dist/**`。
- 异常处理（Error handling）: 如果 publish 前 gate 失败，不发布；如果 publish 后 smoke 失败，不能复用版本号，只能修复后发布下一个 patch。
- 边界兜底（Boundary fallback）: release doc 保留 rollback plan，消费者可临时固定上一稳定版本 `0.1.2`。
- 性能或并发注意事项（Performance or concurrency notes）: npm version 不可复用，发布动作必须串行执行。

## 6. 与技术方案的偏移

- 无 runtime 方案偏移；本次只执行 patch publish。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | build + Node test suite | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | source workspace 与 package canonical assets 一致 | PASS |
| `make validate-harness` | Harness scaffold、prompt language、doc overviews | PASS |
| `npm pack --dry-run --workspace agent-project-sdlc` | tarball contents and package metadata | PASS |
| `npm publish --workspace agent-project-sdlc` | publish to npm registry | PASS |
| `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json` | registry latest and integrity verification | PASS |
| Registry installed-consumer smoke | install published package, run init and doctor | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-033 changed files within allowed_paths | PASS |
| `git diff --check` | whitespace and patch hygiene | PASS |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-033` | `DEV-033` implementation commit | 发布 `agent-project-sdlc@0.1.3`，包含模块级 implementation doc 协议更新。 |

## 9. 后续维护注意事项

- 每次 npm publish 后必须从 registry 安装真实发布版本做 consumer smoke，不能只依赖本地 workspace。
- 如果 smoke 发现问题，下一次修复必须 bump 到新的 patch version。
