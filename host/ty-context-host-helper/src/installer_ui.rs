use crate::{HostError, HostResult, admin, admin_presence, service::ServiceConfig};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{BufRead, IsTerminal, Write},
    path::{Path, PathBuf},
};

pub fn run(args: Vec<String>) -> HostResult<()> {
    if args.first().map(String::as_str) != Some("presence") {
        return Err(HostError::Usage("installer-ui command".into()));
    }
    let config_path = option(&args, "--config")?;
    let registry_id = text_option(&args, "--registry-id")?;
    if !valid_registry_id(&registry_id) {
        return Err(HostError::Usage("installer-ui registry ID".into()));
    }
    let config: ServiceConfig = serde_json::from_slice(
        &fs::read(&config_path).map_err(|error| HostError::io(&config_path, error))?,
    )
    .map_err(|error| HostError::Configuration(format!("config_json:{error}")))?;
    verify_binary(&config)?;
    if !admin::current_process_is_admin()
        || !std::io::stdin().is_terminal()
        || !std::io::stdout().is_terminal()
    {
        return Err(HostError::Permission("installer_local_presence".into()));
    }
    let phrase = format!("APPROVE LOCAL PRESENCE {registry_id}");
    let entered = prompt(&format!(
        "This token authorizes one administrative operation for registry {registry_id}.\nType exactly: {phrase}\n> "
    ))?;
    if entered != phrase {
        return Err(HostError::Permission("installer_local_presence".into()));
    }
    let token = admin_presence::issue(&config.state_root, 2 * 60_000)?;
    writeln!(
        std::io::stdout().lock(),
        "One-time local-presence token (expires in 2 minutes):\n{token}"
    )
    .map_err(|error| HostError::io("stdout", error))
}

fn verify_binary(config: &ServiceConfig) -> HostResult<()> {
    let current = std::env::current_exe().map_err(|error| HostError::io("current_exe", error))?;
    if !same_path(&current, &config.installer_ui_path)
        || hash(&current)? != config.installer_ui_sha256
    {
        return Err(HostError::Configuration("installer_ui_identity".into()));
    }
    Ok(())
}
fn prompt(label: &str) -> HostResult<String> {
    let mut output = std::io::stdout().lock();
    output
        .write_all(label.as_bytes())
        .and_then(|()| output.flush())
        .map_err(|error| HostError::io("stdout", error))?;
    let mut value = String::new();
    std::io::stdin()
        .lock()
        .read_line(&mut value)
        .map_err(|error| HostError::io("stdin", error))?;
    if value.len() > 4096 {
        return Err(HostError::Usage("installer-ui input".into()));
    }
    Ok(value.trim().to_owned())
}
fn option(args: &[String], key: &str) -> HostResult<PathBuf> {
    let index = args
        .iter()
        .position(|value| value == key)
        .ok_or_else(|| HostError::Usage(format!("missing {key}")))?;
    args.get(index + 1)
        .map(PathBuf::from)
        .ok_or_else(|| HostError::Usage(format!("missing value for {key}")))
}
fn text_option(args: &[String], key: &str) -> HostResult<String> {
    let value = option(args, key)?.to_string_lossy().into_owned();
    (!value.is_empty())
        .then_some(value)
        .ok_or_else(|| HostError::Usage(format!("missing value for {key}")))
}
fn valid_registry_id(value: &str) -> bool {
    (1..=128).contains(&value.len())
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"._:-".contains(&byte))
}
fn hash(path: &Path) -> HostResult<String> {
    Ok(hex::encode(Sha256::digest(
        fs::read(path).map_err(|error| HostError::io(path, error))?,
    )))
}
fn same_path(left: &Path, right: &Path) -> bool {
    crate::service_config::same_path(left, right)
}
