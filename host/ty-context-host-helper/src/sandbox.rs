use crate::{HostError, HostResult, rpc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};

#[derive(Clone, Debug, Serialize)]
pub struct SandboxCapabilities {
    pub platform: &'static str,
    pub node_permission: bool,
    pub os_boundary: bool,
    pub adapter: &'static str,
    pub network_boundary: bool,
    pub child_process_boundary: bool,
    pub node_permission_flags_sha256: String,
    pub launcher_path: String,
    pub launcher_sha256: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct SandboxPolicy {
    pub schema_version: String,
    #[serde(default = "oracle_process_kind")]
    pub process_kind: String,
    #[serde(default)]
    pub isolation_group: Option<String>,
    #[serde(default)]
    pub node_preload: Option<PathBuf>,
    pub executable: PathBuf,
    pub cwd: PathBuf,
    pub read_paths: Vec<PathBuf>,
    pub write_paths: Vec<PathBuf>,
    pub protocol_output: Option<PathBuf>,
    pub diagnostic_output: Option<PathBuf>,
    pub timeout_ms: u32,
    pub network: String,
    pub allow_child_process: bool,
    #[serde(default)]
    pub allow_worker: bool,
    #[serde(default)]
    pub allow_addons: bool,
    #[serde(default = "single_process")]
    pub process_limit: u32,
}

pub fn detect(
    node: &Path,
    launcher_path: &Path,
    launcher_sha256: &str,
) -> HostResult<SandboxCapabilities> {
    let launcher =
        crate::sandbox_launcher::validate(launcher_path.to_path_buf(), launcher_sha256.to_owned())?;
    let output = Command::new(node)
        .arg("--help")
        .output()
        .map_err(|error| HostError::io(node, error))?;
    let help = String::from_utf8_lossy(&output.stdout);
    let flags = ["--permission", "--allow-fs-read", "--allow-fs-write"];
    let node_permission = flags.iter().all(|flag| help.contains(flag));
    if !node_permission {
        return Err(HostError::Sandbox("node_permission_flags".into()));
    }
    Ok(SandboxCapabilities {
        platform: std::env::consts::OS,
        node_permission,
        os_boundary: crate::sandbox_launcher::capability(&launcher),
        adapter: adapter(),
        network_boundary: crate::sandbox_launcher::capability(&launcher),
        child_process_boundary: crate::sandbox_launcher::capability(&launcher),
        node_permission_flags_sha256: hex::encode(Sha256::digest(flags.join("\0"))),
        launcher_path: launcher.path.to_string_lossy().into_owned(),
        launcher_sha256: launcher.sha256,
    })
}

pub fn launch(args: Vec<String>) -> HostResult<()> {
    let launcher = crate::sandbox_launcher::from_args(&args)?;
    #[cfg(windows)]
    let _ = &launcher;
    let separator = args
        .iter()
        .position(|value| value == "--")
        .ok_or_else(|| HostError::Usage("sandbox requires --policy <file> -- <command>".into()))?;
    let policy_index = args
        .iter()
        .position(|value| value == "--policy")
        .ok_or_else(|| HostError::Usage("sandbox requires --policy".into()))?;
    let policy_path = args
        .get(policy_index + 1)
        .map(PathBuf::from)
        .ok_or_else(|| HostError::Usage("sandbox policy path".into()))?;
    let command = args.get(separator + 1..).unwrap_or_default();
    if command.is_empty() {
        return Err(HostError::Usage("sandbox command".into()));
    }
    let policy = read_policy(&policy_path)?;
    validate_policy(&policy, command)?;
    let mut outputs = crate::sandbox_io::prepare(&policy)?;
    #[cfg(windows)]
    let run_result = crate::sandbox_windows::run(&policy, command);
    #[cfg(all(unix, not(target_os = "macos")))]
    let run_result = crate::sandbox_linux::run(&policy, command, &launcher.path);
    #[cfg(target_os = "macos")]
    let run_result = crate::sandbox_macos::run(&policy, command, &launcher.path);
    let publish_result = crate::sandbox_io::publish(&mut outputs, run_result.is_ok());
    outputs.cleanup();
    match (run_result, publish_result) {
        (Ok(()), Ok(())) => Ok(()),
        (Err(error), _) => Err(error),
        (Ok(()), Err(error)) => Err(error),
    }
}

fn read_policy(path: &Path) -> HostResult<SandboxPolicy> {
    let bytes = fs::read(path).map_err(|error| HostError::io(path, error))?;
    if bytes.len() > 1024 * 1024 {
        return Err(HostError::Sandbox("policy_too_large".into()));
    }
    let value: Value = serde_json::from_slice(&bytes)
        .map_err(|error| HostError::Sandbox(format!("policy_json:{error}")))?;
    if rpc::canonical_bytes(&value)? != bytes {
        return Err(HostError::Sandbox("policy_noncanonical".into()));
    }
    serde_json::from_value(value)
        .map_err(|error| HostError::Sandbox(format!("policy_schema:{error}")))
}

fn validate_policy(policy: &SandboxPolicy, command: &[String]) -> HostResult<()> {
    let oracle = policy.process_kind == "oracle";
    let command_kind = policy.process_kind == "command";
    let isolation_group_valid = policy.isolation_group.as_ref().is_none_or(|value| {
        value.len() == 64
            && value
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    });
    if policy.schema_version != "ty-context-host-sandbox-v1"
        || (!oracle && !command_kind)
        || !isolation_group_valid
        || (oracle && policy.node_preload.is_some())
        || !matches!(policy.network.as_str(), "none" | "loopback")
        || (oracle
            && (policy.network != "none"
                || policy.allow_child_process
                || policy.allow_worker
                || policy.allow_addons
                || policy.process_limit != 1))
        || (command_kind
            && policy.allow_child_process
            && !(2..=128).contains(&policy.process_limit))
        || (command_kind && !policy.allow_child_process && policy.process_limit != 1)
        || !(1..=21_600_000).contains(&policy.timeout_ms)
    {
        return Err(HostError::Sandbox("policy_values".into()));
    }
    let executable = fs::canonicalize(&policy.executable)
        .map_err(|error| HostError::io(&policy.executable, error))?;
    let command_executable =
        fs::canonicalize(&command[0]).map_err(|error| HostError::io(&command[0], error))?;
    if executable != command_executable
        || (oracle && !command.iter().any(|value| value == "--permission"))
        || (oracle
            && command.iter().any(|value| {
                matches!(
                    value.as_str(),
                    "--allow-child-process" | "--allow-worker" | "--allow-addons"
                )
            }))
    {
        return Err(HostError::Sandbox("command_policy_mismatch".into()));
    }
    for path in std::iter::once(&policy.cwd)
        .chain(policy.read_paths.iter())
        .chain(policy.write_paths.iter())
    {
        if !path.is_absolute() || !path.exists() {
            return Err(HostError::Sandbox("policy_path_invalid".into()));
        }
        let canonical = fs::canonicalize(path).map_err(|error| HostError::io(path, error))?;
        if !crate::sandbox_io::same_path(path, &canonical) {
            return Err(HostError::Sandbox("policy_path_noncanonical".into()));
        }
    }
    if let Some(preload) = &policy.node_preload {
        let metadata =
            fs::symlink_metadata(preload).map_err(|error| HostError::io(preload, error))?;
        if !preload.is_absolute()
            || !metadata.is_file()
            || metadata.file_type().is_symlink()
            || !policy
                .read_paths
                .iter()
                .any(|root| crate::sandbox_io::path_inside(root, preload))
        {
            return Err(HostError::Sandbox("policy_node_preload_invalid".into()));
        }
        let canonical = fs::canonicalize(preload).map_err(|error| HostError::io(preload, error))?;
        if !crate::sandbox_io::same_path(preload, &canonical) {
            return Err(HostError::Sandbox(
                "policy_node_preload_noncanonical".into(),
            ));
        }
    }
    match (&policy.protocol_output, &policy.diagnostic_output) {
        (None, None) => {}
        (Some(protocol), Some(diagnostic)) => {
            if crate::sandbox_io::same_path(protocol, diagnostic) {
                return Err(HostError::Sandbox("policy_output_collision".into()));
            }
            crate::sandbox_io::validate_output(protocol, &policy.write_paths)?;
            crate::sandbox_io::validate_output(diagnostic, &policy.write_paths)?;
        }
        _ => return Err(HostError::Sandbox("policy_output_pair_required".into())),
    }
    Ok(())
}

fn oracle_process_kind() -> String {
    "oracle".into()
}
fn single_process() -> u32 {
    1
}

pub(crate) fn command_node_options(policy: &SandboxPolicy) -> Option<String> {
    if policy.process_kind != "command" {
        return None;
    }
    let mut options = String::from("--permission --preserve-symlinks --preserve-symlinks-main");
    for path in policy.read_paths.iter().chain(policy.write_paths.iter()) {
        options.push_str(&format!(" --allow-fs-read={}", node_option_path(path)));
    }
    for path in &policy.write_paths {
        options.push_str(&format!(" --allow-fs-write={}", node_option_path(path)));
    }
    if policy.allow_child_process {
        options.push_str(" --allow-child-process");
    }
    if policy.allow_worker {
        options.push_str(" --allow-worker");
    }
    if policy.allow_addons {
        options.push_str(" --allow-addons");
    }
    if let Some(preload) = &policy.node_preload {
        options.push_str(&format!(" --require={}", node_option_path(preload)));
    }
    Some(options)
}

pub(crate) fn node_option_path(path: &Path) -> String {
    serde_json::to_string(&path.to_string_lossy())
        .unwrap_or_else(|_| format!("\"{}\"", path.display()))
}

fn adapter() -> &'static str {
    if cfg!(windows) {
        "appcontainer"
    } else if cfg!(target_os = "macos") {
        "seatbelt"
    } else {
        "bubblewrap"
    }
}
