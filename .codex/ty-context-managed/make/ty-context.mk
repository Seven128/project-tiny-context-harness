PYTHON ?= python3
TY_CONTEXT ?= $(if $(wildcard packages/ty-context/dist/cli.js),node packages/ty-context/dist/cli.js,npx --yes --package project-tiny-context-harness@latest ty-context)
TY_CONTEXT_MODULARITY_SCOPE = $(if $(TY_CONTEXT_MODULARITY_BASE),--base $(TY_CONTEXT_MODULARITY_BASE),--touched)

.PHONY: help ty-context-doctor ty-context-sync ty-context-upgrade ty-context-check-modularity validate-context validate-code-modularity validate-harness lint test-current-domain test-all build

help:
	@echo "Minimal Context Harness commands"
	@echo "  make ty-context-doctor         Diagnose Harness root, core package and schema version"
	@echo "  make ty-context-sync           Refresh managed assets; refuses when upgrade migrations are pending"
	@echo "  make ty-context-upgrade        Run safe upgrade migrations, sync managed assets and doctor"
	@echo "  make ty-context-check-modularity  Warn on oversized touched handwritten source files"
	@echo "  make validate-context    Check whether project_context/** supports context recovery"
	@echo "  make validate-code-modularity  Fail on oversized touched handwritten source files"
	@echo "  make validate-harness    Run validate-context and validate-code-modularity"
	@echo "  make test-all            Run the project regression suite after replacing this placeholder"

ty-context-doctor:
	$(TY_CONTEXT) doctor

ty-context-sync:
	$(TY_CONTEXT) sync

ty-context-upgrade:
	$(TY_CONTEXT) upgrade

ty-context-check-modularity:
	$(TY_CONTEXT) check-modularity $(TY_CONTEXT_MODULARITY_SCOPE)

validate-context:
	$(TY_CONTEXT) validate-context

validate-code-modularity:
	$(TY_CONTEXT) check-modularity $(TY_CONTEXT_MODULARITY_SCOPE) --fail-on-warning

validate-harness: validate-context validate-code-modularity

lint:
	@echo "No project lint command configured yet. Replace this target with your stack-specific lint command."

test-current-domain:
	@echo "No domain test command configured yet. Replace this target with focused tests for the current change."

test-all:
	@echo "No full test command configured yet. Replace this target with the project regression suite."

build:
	@echo "No build command configured yet. Replace this target with the project build/package command."
