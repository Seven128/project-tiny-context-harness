# Midstream Change

After initial implementation starts, change the input contract:

- Rename input field `region` to `jurisdiction`.
- Keep `region` as a deprecated alias for backward compatibility.
- Output `auditTrail` must use the term `jurisdiction`, not `region`.
- Tests and fixtures must cover both `jurisdiction` and deprecated `region`.
- Documentation must explain the alias and deprecation.

Expected impact areas: parser, types/schema, fixtures, tests, documentation, audit output.
