use crate::{HostError, HostResult, rpc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ServiceConfig {
    pub schema_version: String,
    pub state_root: PathBuf,
    pub endpoint: String,
    pub managed_dir: PathBuf,
    pub requirements_file: PathBuf,
    pub node_path: PathBuf,
    pub node_sha256: String,
    pub helper_path: PathBuf,
    pub sandbox_launcher_path: PathBuf,
    pub sandbox_launcher_sha256: String,
    pub admin_path: PathBuf,
    pub admin_sha256: String,
    pub installer_ui_path: PathBuf,
    pub installer_ui_sha256: String,
    pub codex_launcher_path: PathBuf,
    pub codex_launcher_sha256: String,
    pub cli_path: PathBuf,
    pub cli_sha256: String,
    pub cli_worker_path: PathBuf,
    pub cli_worker_sha256: String,
    pub cli_runtime_manifest: CliRuntimeManifest,
    pub cli_runtime_manifest_sha256: String,
    pub hook_path: PathBuf,
    pub hook_sha256: String,
    pub worker_path: PathBuf,
    pub worker_sha256: String,
    pub attestation_public_key_path: PathBuf,
    pub managed_policy_sha256: String,
    pub release_manifest_sha256: String,
    pub test_namespace: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct CliRuntimeManifest {
    pub schema_version: String,
    pub files: Vec<CliRuntimeFile>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct CliRuntimeFile {
    pub path: PathBuf,
    pub sha256: String,
    pub size: u64,
}

pub fn validate(config: &ServiceConfig) -> HostResult<()> {
    if config.schema_version != "ty-context-host-service-config-v1" {
        return Err(HostError::Configuration("config_schema".into()));
    }
    for (path, expected) in [
        (&config.node_path, &config.node_sha256),
        (
            &config.sandbox_launcher_path,
            &config.sandbox_launcher_sha256,
        ),
        (&config.admin_path, &config.admin_sha256),
        (&config.installer_ui_path, &config.installer_ui_sha256),
        (&config.codex_launcher_path, &config.codex_launcher_sha256),
        (&config.cli_path, &config.cli_sha256),
        (&config.cli_worker_path, &config.cli_worker_sha256),
        (&config.hook_path, &config.hook_sha256),
        (&config.worker_path, &config.worker_sha256),
    ] {
        if file_hash(path)? != *expected {
            return Err(HostError::Configuration("managed_identity".into()));
        }
    }
    crate::sandbox_launcher::validate(
        config.sandbox_launcher_path.clone(),
        config.sandbox_launcher_sha256.clone(),
    )?;
    verify_cli_runtime(config)?;
    let current = std::env::current_exe().map_err(|error| HostError::io("current_exe", error))?;
    if !same_path(&current, &config.helper_path) {
        return Err(HostError::Configuration("helper_identity".into()));
    }
    Ok(())
}

pub(crate) fn file_hash(path: &Path) -> HostResult<String> {
    Ok(hex::encode(Sha256::digest(
        fs::read(path).map_err(|error| HostError::io(path, error))?,
    )))
}
pub(crate) fn same_path(left: &Path, right: &Path) -> bool {
    let (Ok(left), Ok(right)) = (fs::canonicalize(left), fs::canonicalize(right)) else {
        return false;
    };
    if cfg!(windows) {
        left.to_string_lossy()
            .eq_ignore_ascii_case(&right.to_string_lossy())
    } else {
        left == right
    }
}

fn verify_cli_runtime(config: &ServiceConfig) -> HostResult<()> {
    if config.cli_runtime_manifest.schema_version != "ty-context-host-cli-runtime-manifest-v1"
        || config.cli_runtime_manifest.files.is_empty()
        || config.cli_runtime_manifest.files.len() > 20_000
    {
        return Err(HostError::Configuration("cli_runtime_manifest".into()));
    }
    let value = serde_json::to_value(&config.cli_runtime_manifest)
        .map_err(|error| HostError::Internal(format!("cli_runtime_manifest:{error}")))?;
    if hex::encode(Sha256::digest(rpc::canonical_bytes(&value)?))
        != config.cli_runtime_manifest_sha256
    {
        return Err(HostError::Configuration(
            "cli_runtime_manifest_identity".into(),
        ));
    }
    let mut total = 0u64;
    let mut worker = false;
    let mut cli = false;
    for item in &config.cli_runtime_manifest.files {
        let metadata =
            fs::symlink_metadata(&item.path).map_err(|error| HostError::io(&item.path, error))?;
        if metadata.file_type().is_symlink()
            || !metadata.is_file()
            || metadata.len() != item.size
            || file_hash(&item.path)? != item.sha256
        {
            return Err(HostError::Configuration("cli_runtime_file_identity".into()));
        }
        total = total.saturating_add(item.size);
        worker |= same_path(&item.path, &config.cli_worker_path);
        cli |= same_path(&item.path, &config.cli_path);
    }
    if total > 512 * 1024 * 1024 || !worker || !cli {
        return Err(HostError::Configuration(
            "cli_runtime_manifest_coverage".into(),
        ));
    }
    Ok(())
}
