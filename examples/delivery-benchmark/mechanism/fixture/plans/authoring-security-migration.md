# Protected Invoice Export Migration

<!-- ty-source-item:start key=protected-export-result kind=outcome_result -->
Authorized actors can export migrated invoice audit records while unauthorized actors receive no data.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=protected-export-requirement kind=requirement -->
Audit records are migrated to include the acting user and retain invoice identity and status.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=protected-export-permission kind=technical_obligation -->
The export boundary requires invoice:export and returns a structured denial without invoice data.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=protected-export-persistent kind=risk_fact fact=persistent_data_change outcome=protected-export -->
The audit record shape is persistent data.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=protected-export-migration kind=risk_fact fact=data_migration outcome=protected-export -->
Existing audit records require a reversible migration.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=protected-export-security kind=risk_fact fact=permission_boundary_change outcome=protected-export -->
The invoice export permission boundary changes.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=protected-export-acceptance kind=acceptance -->
The security oracle proves permission denial, migration application, and rollback verification.
<!-- ty-source-item:end -->
