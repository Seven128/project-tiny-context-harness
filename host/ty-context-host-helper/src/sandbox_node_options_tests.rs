use crate::sandbox::{SandboxPolicy, command_node_options};
use std::path::PathBuf;

#[test]
fn child_main_symlink_identity_is_tool_scoped() {
    let package_script = command_node_options(&policy(false)).expect("command options");
    assert!(package_script.contains("--permission --preserve-symlinks"));
    assert!(!package_script.contains("--preserve-symlinks-main"));

    let project_binary = command_node_options(&policy(true)).expect("command options");
    assert!(project_binary.contains("--preserve-symlinks-main"));
}

fn policy(preserve_symlinks_main: bool) -> SandboxPolicy {
    SandboxPolicy {
        schema_version: "ty-context-host-sandbox-v1".into(),
        process_kind: "command".into(),
        isolation_group: None,
        node_preload: None,
        preserve_symlinks_main,
        executable: PathBuf::from("/node"),
        cwd: PathBuf::from("/workspace"),
        read_paths: vec![PathBuf::from("/workspace")],
        write_paths: vec![PathBuf::from("/artifacts")],
        protocol_output: None,
        diagnostic_output: None,
        timeout_ms: 1_000,
        network: "none".into(),
        allow_child_process: true,
        allow_worker: true,
        allow_addons: true,
        process_limit: 8,
    }
}
