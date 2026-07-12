use crate::{HostError, HostResult, sandbox::SandboxPolicy};
use std::{fs, path::Path, process::Command};

pub fn run(policy: &SandboxPolicy, command: &[String], launcher: &Path) -> HostResult<()> {
    let profile_path =
        std::env::temp_dir().join(format!("ty-context-seatbelt-{}.sb", uuid::Uuid::new_v4()));
    let mut profile = String::from(
        "(version 1)\n(deny default)\n(allow process-exec)\n(allow sysctl-read)\n(allow mach-lookup)\n",
    );
    if policy.network == "loopback" {
        profile.push_str("(deny network*)\n(allow network-inbound (local ip \"localhost:*\"))\n(allow network-outbound (remote ip \"localhost:*\"))\n");
    } else {
        profile.push_str("(deny network*)\n");
    }
    if !policy.allow_child_process {
        profile.push_str("(deny process-fork)\n");
    }
    for system in ["/System", "/usr/lib", "/dev/null"] {
        profile.push_str(&format!(
            "(allow file-read* (subpath {}))\n",
            seatbelt(system)
        ));
    }
    for path in &policy.read_paths {
        profile.push_str(&format!(
            "(allow file-read* (subpath {}))\n",
            seatbelt(&path.to_string_lossy())
        ));
    }
    for path in &policy.write_paths {
        profile.push_str(&format!(
            "(allow file-read* file-write* (subpath {}))\n",
            seatbelt(&path.to_string_lossy())
        ));
    }
    fs::write(&profile_path, profile).map_err(|error| HostError::io(&profile_path, error))?;
    let mut process = Command::new(launcher);
    process
        .arg("-f")
        .arg(&profile_path)
        .args(command)
        .current_dir(&policy.cwd);
    if let Some(value) = &policy.protocol_output {
        process.env("TY_CONTEXT_ORACLE_PROTOCOL_FILE", value);
    }
    if let Some(value) = &policy.diagnostic_output {
        process.env("TY_CONTEXT_ORACLE_DIAGNOSTIC_FILE", value);
    }
    if let Some(value) = crate::sandbox::command_node_options(policy) {
        process.env("NODE_OPTIONS", value);
    }
    crate::sandbox_io::isolate_oracle_diagnostics(&mut process, policy)?;
    let status = process.status();
    let _ = fs::remove_file(&profile_path);
    let status = status.map_err(|error| HostError::io("sandbox-exec", error))?;
    if status.success() {
        Ok(())
    } else {
        Err(HostError::Sandbox(format!(
            "sandbox_child_exit:{}",
            status.code().unwrap_or(1)
        )))
    }
}
fn seatbelt(value: &str) -> String {
    format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
}
