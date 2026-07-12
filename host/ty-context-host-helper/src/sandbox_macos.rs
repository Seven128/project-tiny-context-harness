use crate::{HostError, HostResult, sandbox::SandboxPolicy};
use std::{fs, path::Path, process::Command};

pub fn run(policy: &SandboxPolicy, command: &[String], launcher: &Path) -> HostResult<()> {
    let profile_path =
        std::env::temp_dir().join(format!("ty-context-seatbelt-{}.sb", uuid::Uuid::new_v4()));
    let executable = fs::canonicalize(&policy.executable)
        .map_err(|error| HostError::io(&policy.executable, error))?;
    let profile = profile(policy, &executable);
    fs::write(&profile_path, profile).map_err(|error| HostError::io(&profile_path, error))?;
    let mut process = Command::new(launcher);
    process
        .arg("-f")
        .arg(&profile_path)
        .arg(&executable)
        .args(&command[1..])
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

fn profile(policy: &SandboxPolicy, executable: &Path) -> String {
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
    for system in ["/System", "/usr/lib", "/bin", "/usr/bin"] {
        profile.push_str(&format!(
            "(allow file-read* file-map-executable (subpath {}))\n",
            seatbelt(system)
        ));
    }
    for executable in crate::sandbox_io::path_variants(executable) {
        profile.push_str(&format!(
            "(allow file-read* file-map-executable (literal {}))\n",
            seatbelt(&executable.to_string_lossy())
        ));
    }
    for path in &policy.read_paths {
        for variant in crate::sandbox_io::path_variants(path) {
            profile.push_str(&format!(
                "(allow file-read* (subpath {}))\n",
                seatbelt(&variant.to_string_lossy())
            ));
            if policy.allow_child_process {
                profile.push_str(&format!(
                    "(allow file-map-executable (subpath {}))\n",
                    seatbelt(&variant.to_string_lossy())
                ));
            }
        }
    }
    for path in &policy.write_paths {
        for variant in crate::sandbox_io::path_variants(path) {
            profile.push_str(&format!(
                "(allow file-read* file-write* (subpath {}))\n",
                seatbelt(&variant.to_string_lossy())
            ));
            if policy.allow_child_process {
                profile.push_str(&format!(
                    "(allow file-map-executable (subpath {}))\n",
                    seatbelt(&variant.to_string_lossy())
                ));
            }
        }
    }
    profile
}
fn seatbelt(value: &str) -> String {
    format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn profile_maps_only_the_declared_executable_without_child_capability() {
        let policy = SandboxPolicy {
            schema_version: "ty-context-host-sandbox-v1".into(),
            process_kind: "oracle".into(),
            isolation_group: None,
            node_preload: None,
            preserve_symlinks_main: false,
            executable: "/sealed/node".into(),
            cwd: "/sealed/read".into(),
            read_paths: vec!["/sealed/read".into()],
            write_paths: vec!["/sealed/write".into()],
            protocol_output: Some("/sealed/write/protocol.json".into()),
            diagnostic_output: Some("/sealed/write/diagnostic.txt".into()),
            timeout_ms: 1_000,
            network: "none".into(),
            allow_child_process: false,
            allow_worker: false,
            allow_addons: false,
            process_limit: 1,
        };
        let executable = policy.executable.clone();
        let text = profile(&policy, &executable);
        assert!(text.contains("file-map-executable (literal \"/sealed/node\")"));
        assert!(!text.contains("file-map-executable (subpath \"/sealed/read\")"));
    }

    #[test]
    fn profile_covers_private_aliases_for_macos_temporary_paths() {
        let policy = SandboxPolicy {
            schema_version: "ty-context-host-sandbox-v1".into(),
            process_kind: "command".into(),
            isolation_group: None,
            node_preload: None,
            preserve_symlinks_main: false,
            executable: "/var/folders/example/read/node".into(),
            cwd: "/var/folders/example/read".into(),
            read_paths: vec!["/var/folders/example/read".into()],
            write_paths: vec!["/var/folders/example/write".into()],
            protocol_output: None,
            diagnostic_output: None,
            timeout_ms: 1_000,
            network: "none".into(),
            allow_child_process: false,
            allow_worker: false,
            allow_addons: false,
            process_limit: 1,
        };
        let executable = "/private/var/folders/example/read/node".into();
        let text = profile(&policy, &executable);
        assert!(
            text.contains(
                "file-map-executable (literal \"/private/var/folders/example/read/node\")"
            )
        );
        assert!(text.contains("file-read* (subpath \"/private/var/folders/example/read\")"));
        assert!(text.contains("file-write* (subpath \"/private/var/folders/example/write\")"));
    }
}
