# Main Verification Context

## Critical Paths

- Label suggestion behavior: `npm test`
- Context recovery surface: `npm run validate-context`

## Expected Signals

- Label-routing tests include an advisory-only payload case.
- Context validation checks the sample recovery files without storing execution results in Context.

## Known Dead Ends

- Inspecting README alone does not prove the no-write boundary; check `project_context/architecture.md` and the advisory-only test.

