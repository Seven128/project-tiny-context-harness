PYTHON ?= python3
SDLC_HARNESS ?= $(if $(wildcard packages/sdlc-harness/dist/cli.js),node packages/sdlc-harness/dist/cli.js,npx --yes --package project-tiny-context-harness@latest sdlc-harness)

.PHONY: help sdlc-doctor sdlc-sync sdlc-upgrade sdlc-check-modularity validate-context validate-harness lint test-current-domain test-all build

help:
	@echo "Minimal Context Harness commands"
	@echo "  make sdlc-doctor         Diagnose Harness root, core package and schema version"
	@echo "  make sdlc-sync           Refresh managed assets; refuses when upgrade migrations are pending"
	@echo "  make sdlc-upgrade        Run safe upgrade migrations, sync managed assets and doctor"
	@echo "  make sdlc-check-modularity  Warn on oversized touched handwritten source files"
	@echo "  make validate-context    Check whether project_context/** supports context recovery"
	@echo "  make validate-harness    Compatibility alias for validate-context"
	@echo "  make test-all            Run the project regression suite after replacing this placeholder"

sdlc-doctor:
	$(SDLC_HARNESS) doctor

sdlc-sync:
	$(SDLC_HARNESS) sync

sdlc-upgrade:
	$(SDLC_HARNESS) upgrade

sdlc-check-modularity:
	$(SDLC_HARNESS) check-modularity --touched

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
