PYTHON ?= python3
SDLC_HARNESS ?= $(if $(wildcard packages/sdlc-harness/dist/cli.js),node packages/sdlc-harness/dist/cli.js,npx --no-install sdlc-harness)

.PHONY: help validate-context validate-harness lint test-current-domain test-all build

help:
	@echo "Minimal Context Harness commands"
	@echo "  make validate-context    校验 project_context/** 是否足够支持上下文恢复"
	@echo "  make validate-harness    兼容别名，等价 validate-context"
	@echo "  make test-all            运行项目自己的完整测试入口（请按项目替换）"

validate-context:
	$(SDLC_HARNESS) validate-context

validate-harness: validate-context

lint:
	@echo "No project lint command configured yet. Replace this target with your stack-specific lint command."

test-current-domain:
	@echo "No domain test command configured yet. Replace this target with focused tests for the current change."

test-all:
	@echo "No full test command configured yet. Replace this target with the project regression suite."

build:
	@echo "No build command configured yet. Replace this target with the project build/package command."
