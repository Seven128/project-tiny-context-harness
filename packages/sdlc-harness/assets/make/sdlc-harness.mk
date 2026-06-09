PYTHON ?= python3
SDLC_HARNESS ?= $(if $(wildcard packages/sdlc-harness/dist/cli.js),node packages/sdlc-harness/dist/cli.js,npx --yes --package project-tiny-context-harness@latest sdlc-harness)

.PHONY: help sdlc-doctor sdlc-sync sdlc-upgrade validate-context validate-harness lint test-current-domain test-all build

help:
	@echo "Minimal Context Harness commands"
	@echo "  make sdlc-doctor         诊断 Harness root、core package 和 schema version"
	@echo "  make sdlc-sync           刷新 managed guidance、Context template、默认 Skill 和工具"
	@echo "  make sdlc-upgrade        执行安全升级迁移并刷新 managed assets"
	@echo "  make validate-context    校验 project_context/** 是否足够支持上下文恢复"
	@echo "  make validate-harness    兼容别名，等价 validate-context"
	@echo "  make test-all            运行项目自己的完整测试入口（请按项目替换）"

sdlc-doctor:
	$(SDLC_HARNESS) doctor

sdlc-sync:
	$(SDLC_HARNESS) sync

sdlc-upgrade:
	$(SDLC_HARNESS) upgrade

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
