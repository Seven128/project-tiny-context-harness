# Receipt Delivery With External Confirmation

<!-- ty-source-item:start key=receipt-result kind=outcome_result -->
A paid invoice creates a locally verified receipt-delivery request.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=receipt-requirement kind=requirement -->
The deterministic mock provider accepts exactly one receipt request for the paid invoice.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=receipt-critical kind=risk_fact fact=critical_user_path outcome=receipt-delivery -->
Receipt delivery is a critical user path.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=receipt-weak kind=risk_fact fact=weak_observability outcome=receipt-delivery -->
Local mock acceptance cannot observe live provider delivery.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=receipt-live-confirmation kind=external_confirmation -->
A named operator must confirm one live receipt-provider delivery using approved credentials without automatic retries.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=receipt-acceptance kind=acceptance -->
The local oracle reports mock delivery true and live delivery pending external confirmation.
<!-- ty-source-item:end -->
