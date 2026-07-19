# Evidence Design Reference

Read this only while designing or repairing Contract Checks and proof.

## General Proof Rules

- Every Outcome has at least one executable Check and one non-Result atomic Claim.
- Required proof surfaces are non-empty, unique and all-of. Claim-bearing Assertions use explicit comparable Observations and expected values.
- `truthy`/`falsy` are diagnostic-only. `exists` proves only implementation-structure obligations. Missing or type-incomparable Observation never proves a Claim; negative proof uses an explicit value such as `equals: false`.
- Claim and Population proof is emitted only after the entire Check passes. Exit failure, missing artifact, failed population, failed Assertion or invalid Counterfactual yields no Claim proof.
- Verification inputs include entrypoints, helpers, fixtures/config, package scripts and lockfiles and cannot overlap implementation carriers.
- Runners receive the minimum environment whitelist plus only declared environment requirements. Never expose actual secret values in findings.

## Runner And Observation Identity

Evidence adapter is derived from runner kind. Only Playwright may prove `ui_browser`; structured runners prove non-browser surfaces. Raw Execution identity binds frozen runner identity and canonical declared Environment Requirements, not actual values.

Across all Checks sharing a Raw Execution, one Claim-bearing Observation belongs to one Assertion. Shared setup may execute once only when independent per-Check observations and artifacts remain unambiguous.

## Playwright

Claim-bearing Playwright proof is only `playwright.case.<ac-key>.passed equals true`. `[ac:<assertion-key>]` binds one declared AC per Test Instance; ordinary tags are ignored and legacy `[<key>]` binds only a declared key.

Missing, skipped, flaky, unexpected, timed-out, interrupted, failed, multi-AC and duplicate-within-project cases fail closed. The same AC across distinct projects aggregates all-of. Aggregate status/count fields are diagnostic-only.

Standard frozen Playwright verifier content is trusted. Weak-observability Outcomes require same-Check AC/Claim sensitivity. A weak Playwright Counterfactual may accept exit one only when every unexpected instance is uniquely a designated executed AC failure and there are no root, unbound, extra, missing, skipped, flaky, timeout, interruption, artifact, population, environment or other evidence failures. Ordinary Baseline Checks require exit zero.

## Visual UI Evidence

- Use Playwright for every declared `ui_browser` visual AC and bind each independently falsifiable AC to its own `[ac:<assertion-key>]` Test Instance. A broad screenshot or one passing page case does not silently prove separate viewport, theme, state, content-stress, layout or accessibility claims.
- Make the test environment deterministic enough for its claim: freeze the relevant browser/project, viewport, theme/mode, locale/timezone, font loading, fixtures/data and animation/motion policy in declared verifier inputs or configuration.
- Any reviewed screenshot baseline that affects pass/fail must exist for the accepting Compile and be included in `verification_inputs`. Generated screenshots, diffs and reports are Artifacts and review material; they are not editable acceptance authority. Creating or replacing a baseline after Authority Lock is verifier-material revision and must never be silently auto-updated to make a failure pass.
- Screenshot comparison proves only the named visual similarity claim. Pair it with explicit DOM/layout/accessibility assertions when the Contract separately claims no overflow, action visibility, focus behavior, target size, semantic state, reduced motion or other observable behavior.
- Run checks against production components or real product routes. A detached kit/mock harness is acceptable only when the Contract explicitly makes that artifact the product surface; otherwise it cannot substitute for the production carrier.
- Keep subjective visual quality and approval external. A new visual direction or baseline that needs human judgment remains an explicit external confirmation even when all machine checks pass.

## Structured Evidence And Sensitivity

Every claim-bearing `structured_json_v2` Check needs same-Check Claim-related Counterfactual sensitivity unless the Claim is covered by that same Check's Population proof; weak observability removes that Population exemption. Artifacts and another Check never substitute for sensitivity.

Outcome Counterfactual V2 names an Outcome `binding_key`; Global Counterfactual V2 resolves an Outcome-owned `binding_ref`. A Counterfactual mutates only a proven subset of implementation carriers, never Source, Context, runners or verification inputs, and accepts only designated `assertion_value_mismatch` findings.

An `existing` mutation target must exist at Preflight/Compile. A `planned` target may be absent until implementation but must exist at Final Gate; once created, its changes stale targeted Progress. Population V2 proves exact eligible = observed + valid exclusions by entity id.

Artifacts remain review material. They do not prove Claim sensitivity by themselves.
