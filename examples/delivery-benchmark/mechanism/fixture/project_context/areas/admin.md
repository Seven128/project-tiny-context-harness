---
context_role: area
---
# Area Context: Admin

## Responsibility

- Own audit export and its permission boundary.

## Contract

- Export requires the `invoice:export` permission.
- Denial is structured and exports no invoice data.
- Successful export records the acting user and exported invoice identities.

## Code Entry Points

- `src/admin/auditExport.mjs`
- `tests/authoring/security-oracle.mjs`

## Verification

- Security-oriented work requires negative permission proof as well as the successful export path.
