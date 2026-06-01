# Midstream Change

During TESTING, the board is found to sort SLA-risk tickets below normal tickets.

Bugfix route:

- If the technical plan already promised SLA-risk-first sorting, route to SPRINTING as `bugfix_implementation_gap`.
- If the technical plan did not specify sorting semantics, route to ARCHITECTING as `bugfix_replan`.

Final expected behavior: SLA-risk tickets appear first within their status column.
