use crate::{
    HostError, HostResult,
    admin::{self, AdminCommand},
    admin_presence,
    registry_admin::AdminRegistry,
    service::ServiceConfig,
};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{BufRead, IsTerminal, Write},
    path::{Path, PathBuf},
};

pub fn run(args: Vec<String>) -> HostResult<()> {
    let command = args
        .first()
        .ok_or_else(|| HostError::Usage("admin command".into()))
        .and_then(|value| AdminCommand::parse(value))?;
    let config_path = option(&args, "--config")?;
    let config: ServiceConfig = serde_json::from_slice(
        &fs::read(&config_path).map_err(|error| HostError::io(&config_path, error))?,
    )
    .map_err(|error| HostError::Configuration(format!("config_json:{error}")))?;
    if config.schema_version != "ty-context-host-service-config-v1" {
        return Err(HostError::Configuration("config_schema".into()));
    }
    verify_binary(&config)?;
    let mut registry = AdminRegistry::open(&config.state_root)?;
    if command == AdminCommand::Status {
        return write_json(registry.status()?);
    }
    let interactive = std::io::stdin().is_terminal() && std::io::stdout().is_terminal();
    admin::require_local_presence(
        command,
        admin::current_process_is_admin(),
        interactive,
        true,
        true,
        "preflight",
    )?;
    let expected = text_option(&args, "--registry-id")?;
    let first = prompt("Type the exact registry ID (1/2): ")?;
    let second = prompt("Type the exact registry ID (2/2): ")?;
    let token = prompt("One-time installer local-presence token: ")?;
    let reason = prompt("Administrative reason: ")?;
    admin::require_local_presence(
        command,
        true,
        true,
        first == expected && second == expected,
        !token.is_empty(),
        &reason,
    )?;
    admin_presence::consume(&config.state_root, &token)?;
    let name = command_name(command);
    registry.audit(name, &expected, &reason, "attempted")?;
    let outcome = match command {
        AdminCommand::Close => registry.close(&expected, &reason),
        AdminCommand::RecoverJournal => registry.recover_journal(&expected),
        AdminCommand::RotateKey => {
            registry.rotate_key(&expected, &config.attestation_public_key_path)
        }
        AdminCommand::Gc => registry.gc(&expected),
        AdminCommand::Status => unreachable!(),
    };
    match outcome {
        Ok(value) => {
            registry.audit(name, &expected, &reason, "succeeded")?;
            write_json(value)
        }
        Err(error) => {
            let _ = registry.audit(name, &expected, &reason, "failed");
            Err(error)
        }
    }
}

fn verify_binary(config: &ServiceConfig) -> HostResult<()> {
    let current = std::env::current_exe().map_err(|error| HostError::io("current_exe", error))?;
    if !same_path(&current, &config.admin_path) || hash(&current)? != config.admin_sha256 {
        return Err(HostError::Configuration("admin_identity".into()));
    }
    Ok(())
}
fn prompt(label: &str) -> HostResult<String> {
    let mut output = std::io::stdout().lock();
    output
        .write_all(label.as_bytes())
        .map_err(|error| HostError::io("stdout", error))?;
    output
        .flush()
        .map_err(|error| HostError::io("stdout", error))?;
    let mut value = String::new();
    std::io::stdin()
        .lock()
        .read_line(&mut value)
        .map_err(|error| HostError::io("stdin", error))?;
    let value = value.trim().to_owned();
    if value.len() > 4096 {
        return Err(HostError::Usage("admin input".into()));
    }
    Ok(value)
}
fn write_json(value: serde_json::Value) -> HostResult<()> {
    let mut output = std::io::stdout().lock();
    output
        .write_all(&crate::rpc::canonical_bytes(&value)?)
        .map_err(|error| HostError::io("stdout", error))?;
    output
        .write_all(b"\n")
        .map_err(|error| HostError::io("stdout", error))
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
    if value.is_empty() {
        Err(HostError::Usage(format!("missing value for {key}")))
    } else {
        Ok(value)
    }
}
fn hash(path: &Path) -> HostResult<String> {
    Ok(hex::encode(Sha256::digest(
        fs::read(path).map_err(|error| HostError::io(path, error))?,
    )))
}
fn same_path(left: &Path, right: &Path) -> bool {
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
fn command_name(command: AdminCommand) -> &'static str {
    match command {
        AdminCommand::Status => "status",
        AdminCommand::Close => "close",
        AdminCommand::RecoverJournal => "recover-journal",
        AdminCommand::RotateKey => "rotate-key",
        AdminCommand::Gc => "gc",
    }
}
