# Paid Invoice UI Delivery

<!-- ty-source-item:start key=paid-invoice-result kind=outcome_result -->
A paid invoice is visibly presented on the invoice board.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=paid-invoice-requirement kind=requirement -->
The paid invoice row exposes its identifier, paid status, and total in the browser UI.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=paid-invoice-critical kind=risk_fact fact=critical_user_path outcome=paid-invoice-ui -->
The paid-invoice board is a critical user path.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=paid-invoice-weak kind=risk_fact fact=weak_observability outcome=paid-invoice-ui -->
The browser-visible state is weakly observable without a real browser assertion.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=paid-invoice-acceptance kind=acceptance -->
The Playwright case paid-invoice-visible executes and passes for the paid invoice.
<!-- ty-source-item:end -->
