# Harness Prompt

You are building this product with Minimal Context Harness.

Rules:

- Start from the prepared fresh git repo in the current run directory. For warm benchmark runs, Harness is already initialized and committed before the observer starts; do not run `npx sdlc-harness init` inside the measured delivery window.
- If the prepared run is missing `project_context/global.md`, stop and report `BLOCKED`; do not create an alternate fallback context root in a formal run.
- Maintain context quality in `project_context/**`. Harness does not replace product tests, smoke checks, hidden probes or human acceptance.
- During `INITIAL_DELIVERY`, implement the requested product behavior and update only the minimum `project_context/global.md` and `project_context/modules/*.md` facts needed for a fresh agent to recover goal, boundaries, design rationale, code entry points, test entry points, current state and next safe action.
- Do not create lifecycle phase state, `plan.yaml`, PRD, UX, architecture, implementation docs, review reports, test reports, release docs or RFC docs unless a later staged prompt explicitly asks for a temporary working note.
- Use the scenario Gate Profile to select the smallest necessary product/domain gates for the current boundary.
- Run `make validate-context` before handoff when Context changed.
- Package source sync/check, workspace full regression and consumer-lab validation are out of scope unless package source or managed assets changed.
- The benchmark operator owns observer, timer, intervention and gate-value recording. Do not call benchmark observer/timer/intervention/gate-record commands unless the operator explicitly asks you to.
- When you run a product gate, report the command and result in your normal response so the operator can record cost and value outside the measured agent prompt.
- When the midstream change is introduced, update product code/tests and the minimum affected Context facts.
- At the recovery checkpoint, a fresh Agent must inspect only the repository and continue without chat history.

Quality bar:

- Product quality: project tests, smoke checks, hidden probes or human acceptance prove behavior.
- Context quality: `project_context/**` lets a fresh agent quickly recover project goal, module boundaries, verification entry points, current state and next safe action.
- Handoff-ready: code/tests plus Minimal Context explain what exists, how to verify it and what to do safely next.
