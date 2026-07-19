# Structured JSON Invoice Total Delivery

<!-- ty-source-item:start key=invoice-total-result kind=outcome_result -->
A created invoice exposes a deterministic total in structured machine output.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=invoice-total-requirement kind=requirement -->
Creating an invoice with subtotal 100 and tax rate 0.10 produces total 110.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=invoice-total-obligation kind=technical_obligation -->
The invoice total is calculated through the billing money-policy owner rather than duplicated in the oracle.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=invoice-total-acceptance kind=acceptance -->
The structured oracle reports result true and total 110 for the declared invoice scenario.
<!-- ty-source-item:end -->
