use crate::{
    HostError, HostResult, admin,
    hook_smoke::Scenario,
    rpc::{self, Request},
    sandbox,
    service::Service,
    service_config::file_hash,
    service_hook::needs_work_stop_result,
};
use serde_json::{Value, json};
use std::{
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

impl Service {
    pub(crate) fn health(&self, request: &Request) -> HostResult<Value> {
        let repository = Path::new(&request.repository_hint);
        let (heartbeat, active, reservation) =
            self.registry.health_state_for_repository(repository)?;
        let expected_thread = request.params.get("thread_id").and_then(Value::as_str);
        let fresh = heartbeat.as_ref().is_some_and(|value| {
            unix_ms().saturating_sub(value["observed_at_unix_ms"].as_u64().unwrap_or(0) as u128)
                <= 10 * 60_000
                && value["process_id"].as_u64().is_some_and(|pid| pid > 0)
                && expected_thread.is_none_or(|thread| value["thread_id"].as_str() == Some(thread))
        });
        let capabilities = sandbox::detect(
            &self.config.node_path,
            &self.config.sandbox_launcher_path,
            &self.config.sandbox_launcher_sha256,
        )?;
        let current =
            std::env::current_exe().map_err(|error| HostError::io("current_exe", error))?;
        let identities = json!({
            "requirements":file_hash(&self.config.requirements_file)?,"helper":file_hash(&current)?,"admin":file_hash(&self.config.admin_path)?,"installer_ui":file_hash(&self.config.installer_ui_path)?,
            "codex_launcher":file_hash(&self.config.codex_launcher_path)?,"hook":file_hash(&self.config.hook_path)?,"worker":file_hash(&self.config.worker_path)?,
            "node":file_hash(&self.config.node_path)?,"sandbox_launcher":file_hash(&self.config.sandbox_launcher_path)?,"cli":file_hash(&self.config.cli_path)?,"cli_worker":file_hash(&self.config.cli_worker_path)?,
            "cli_runtime":self.config.cli_runtime_manifest_sha256,"service_config":file_hash(&self.config_path)?
        });
        let no_active = self
            .hook_smokes
            .run(&self.config, repository, Scenario::NoActive)
            .unwrap_or(Value::Null);
        let synthetic = self
            .hook_smokes
            .run(&self.config, repository, Scenario::SyntheticActive)
            .unwrap_or(Value::Null);
        let stop_smoke = json!({"no_active_noop":no_active==json!({}),"synthetic_active_block":synthetic==needs_work_stop_result()});
        Ok(json!({
            "schema_version":"ty-context-host-health-v1","protocol":rpc::PROTOCOL,"service_version":env!("CARGO_PKG_VERSION"),"key_id":self.registry.key_id(),
            "managed_policy_sha256":self.config.managed_policy_sha256,"release_manifest_sha256":self.config.release_manifest_sha256,"identities":identities,
            "heartbeat_fresh":fresh,"heartbeat":heartbeat,"registry_available":true,"active_present":active.is_some(),"reservation_present":reservation.is_some(),
            "journal_records":self.registry.verify_journal()?,"durability_probe":self.registry.durability_probe()?,
            "managed_paths_secure":admin::managed_paths_secure(&self.config.managed_dir,&self.config.state_root,&self.config.requirements_file,&self.config.node_path,&self.config.sandbox_launcher_path,&self.config.installer_ui_path,&self.config.codex_launcher_path,self.config.test_namespace)?,
            "sandbox":capabilities,"secret_provider":crate::secret::provider_name(),"stop_smoke":stop_smoke,"test_namespace":self.config.test_namespace
        }))
    }
}

fn unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}
