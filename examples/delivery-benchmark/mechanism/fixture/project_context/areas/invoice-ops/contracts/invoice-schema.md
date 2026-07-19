---
context_role: contract
read_policy: on-demand
---
# Invoice Schema Contract

## Current Canonical Field

- `region` is the current canonical tax-location field in the initial fixture.
- Compatibility changes must state which field becomes canonical, which aliases remain accepted, and which field appears in stored/output objects.

## Error Contract

- Invalid input returns `{ ok: false, errorCode: <stable-code> }` rather than throwing an implementation stack.

## Change Rule

- A field rename is a durable API/Schema change and requires updates to this owning Context, code, tests, UI projection, and public fixture README.
