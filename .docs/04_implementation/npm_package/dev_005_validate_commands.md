# DEV-005 TypeScript validators Implementation Doc

## 1. 关联信息

- Task ID: `DEV-005`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: pending

## 2. 本次实现范围

- 新增（Added）:
  - TypeScript validator runtime for `validate-harness`, `validate-current`, `validate-pm`, `validate-design`, `validate-dev`, and `validate-checkpoint`.
  - CLI aliases such as `sdlc-harness validate-harness` in addition to `sdlc-harness validate validate-harness`.
  - Node test coverage for validator success cases.
- 修改（Changed）:
  - `packages/sdlc-harness/source-mappings.yaml` no longer copies Python `tools/**` into package assets.
  - Removed `packages/sdlc-harness/assets/validators/**` Python assets from the package canonical asset set.
- 未覆盖（Not covered）:
  - TypeScript validators are intentionally structural first-pass validators; future iterations can expand parity with every Python edge case.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/src/lib/validators.ts` | Node-only validator runtime | `runValidator` |
| `packages/sdlc-harness/src/commands/validate.ts` | CLI adapter | `validate` |
| `packages/sdlc-harness/src/commands/index.ts` | Direct validate command aliases | `validate-harness`、`validate-current`、`validate-pm` |
| `packages/sdlc-harness/source-mappings.yaml` | Package source mappings | removed `tools -> assets/validators` mapping |
| `tests/sdlc-harness/validators.test.mjs` | Focused validator tests | `runValidator` |

## 4. 核心数据流

```txt
sdlc-harness validate-harness
-> runValidator(projectRoot, gate)
-> read project files with Node fs/yaml
-> return info/errors
-> CLI sets exitCode on errors
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: validators check required files, PRD sections, design sections, task status/gate result, and checkpoint presence.
- 核心分支（Core branches）:
  - `validate-current` dispatches by `current_phase`.
  - `validate-dev` fails while open tasks remain and verifies done task implementation docs.
  - `validate-checkpoint` only requires checkpoint files when task state requires them.
- 异常处理（Error handling）: unknown validators return an error report; CLI exits non-zero when errors exist.
- 边界兜底（Boundary fallback）: missing YAML files are treated as empty objects and surfaced as validation errors.
- 性能或并发注意事项（Performance or concurrency notes）: validators run synchronously from the CLI perspective and avoid Python subprocess dependencies.

## 6. 与技术方案的偏移

- This completes the Node-only runtime direction for published npm package validation. Python validators remain in the reference workspace for now, but are no longer copied into package canonical assets.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build plus package command tests | PASS |
| `sdlc-harness validate-*` | Node validator runtime for harness, PM, design, checkpoint | PASS |
| `sdlc-harness package check-source` | Package canonical source drift | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-005 changed file boundaries | PASS |
| `make validate-checkpoint` | DEV-005 checkpoint completeness | PASS |
| `make lint` | Current project lint gate placeholder | PASS |
| `make test-current-domain` | Current task focused gate placeholder | PASS |

## 8. 后续维护注意事项

- Future iterations can deepen TypeScript validator parity and eventually remove duplicated Python validators from the reference workspace.
- Any future source mapping change must be followed by `sdlc-harness package sync-source` and `sdlc-harness package check-source`.
