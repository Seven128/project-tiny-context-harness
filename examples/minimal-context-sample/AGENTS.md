# Minimal Context Sample Agent Notes

Scope: this file demonstrates what a consumer repository might give to coding agents. It applies only inside this sample directory, not to the Project Tiny Context Harness source workspace.

## Fact Sources

- Project context: `project_context/global.md`
- Architecture context: `project_context/architecture.md`
- Context graph: `project_context/context.toml`
- Area context: `project_context/areas/main.md`
- Verification paths: `project_context/areas/main/verification.md`

## Work Rule

Read the relevant Context before changing sample code. If a change creates a durable product, architecture or validation fact, update `project_context/**`.

## Verification

- `npm test`
- `npm run validate-context`

