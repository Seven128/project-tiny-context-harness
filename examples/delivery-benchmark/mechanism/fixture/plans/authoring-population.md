# Invoice Population Audit Delivery

<!-- ty-source-item:start key=population-result kind=outcome_result -->
Every eligible invoice is represented in the audit observation.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=population-requirement kind=requirement -->
The observed invoice id set equals the eligible invoice id set after declared exclusions.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=population-risk kind=risk_fact fact=full_population_operation outcome=invoice-population -->
The delivery makes a claim about the full eligible invoice population.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=population-acceptance kind=acceptance -->
The population oracle reports eligible ids inv-1 and inv-2, observed ids inv-1 and inv-2, and no excluded items.
<!-- ty-source-item:end -->
