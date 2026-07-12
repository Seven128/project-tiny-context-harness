use crate::{HostError, HostResult, sandbox::SandboxPolicy};
use std::{
    fs::{self, OpenOptions},
    io::{Seek, SeekFrom, Write},
    os::fd::AsRawFd,
    os::unix::process::ExitStatusExt,
    path::Path,
    process::Command,
};

pub fn run(policy: &SandboxPolicy, command: &[String], bwrap: &Path) -> HostResult<()> {
    let seccomp_path =
        std::env::temp_dir().join(format!("ty-context-seccomp-{}.bpf", uuid::Uuid::new_v4()));
    let mut seccomp = OpenOptions::new()
        .write(true)
        .read(true)
        .create_new(true)
        .open(&seccomp_path)
        .map_err(|error| HostError::io(&seccomp_path, error))?;
    seccomp
        .write_all(&seccomp_program())
        .map_err(|error| HostError::io(&seccomp_path, error))?;
    seccomp
        .sync_all()
        .map_err(|error| HostError::io(&seccomp_path, error))?;
    seccomp
        .seek(SeekFrom::Start(0))
        .map_err(|error| HostError::io(&seccomp_path, error))?;
    let fd = seccomp.as_raw_fd();
    if unsafe { libc::fcntl(fd, libc::F_SETFD, 0) } != 0 {
        return Err(HostError::io("seccomp_fd", std::io::Error::last_os_error()));
    }
    let mut args = vec![
        "--die-with-parent".into(),
        "--new-session".into(),
        "--unshare-all".into(),
        "--unshare-net".into(),
        "--cap-drop".into(),
        "ALL".into(),
        "--proc".into(),
        "/proc".into(),
        "--dev".into(),
        "/dev".into(),
        "--tmpfs".into(),
        "/tmp".into(),
    ];
    for system in ["/usr", "/lib", "/lib64", "/bin", "/etc/ld.so.cache"] {
        if Path::new(system).exists() {
            bind(&mut args, "--ro-bind", Path::new(system));
        }
    }
    for path in &policy.read_paths {
        bind(&mut args, "--ro-bind", path);
    }
    for path in &policy.write_paths {
        bind(&mut args, "--bind", path);
    }
    args.extend(["--chdir".into(), policy.cwd.to_string_lossy().into_owned()]);
    if let Some(value) = &policy.protocol_output {
        args.extend([
            "--setenv".into(),
            "TY_CONTEXT_ORACLE_PROTOCOL_FILE".into(),
            value.to_string_lossy().into_owned(),
        ]);
    }
    if let Some(value) = &policy.diagnostic_output {
        args.extend([
            "--setenv".into(),
            "TY_CONTEXT_ORACLE_DIAGNOSTIC_FILE".into(),
            value.to_string_lossy().into_owned(),
        ]);
    }
    if let Some(value) = crate::sandbox::command_node_options(policy) {
        args.extend(["--setenv".into(), "NODE_OPTIONS".into(), value]);
    }
    args.extend(["--seccomp".into(), fd.to_string(), "--".into()]);
    args.extend(command.iter().cloned());
    let mut process = Command::new(bwrap);
    process.args(args);
    crate::sandbox_io::isolate_oracle_diagnostics(&mut process, policy)?;
    let status = process
        .status()
        .map_err(|error| HostError::io("bwrap", error));
    let _ = fs::remove_file(&seccomp_path);
    let status = status?;
    if status.success() {
        Ok(())
    } else {
        Err(HostError::Sandbox(format!(
            "sandbox_child_exit:{}",
            status
                .code()
                .unwrap_or_else(|| 128 + status.signal().unwrap_or(0))
        )))
    }
}

fn bind(args: &mut Vec<String>, mode: &str, path: &Path) {
    let value = path.to_string_lossy().into_owned();
    args.extend([mode.into(), value.clone(), value]);
}
fn seccomp_program() -> Vec<u8> {
    const LD_W_ABS: u16 = 0x20;
    const JMP_JEQ_K: u16 = 0x15;
    const RET_K: u16 = 0x06;
    const ALLOW: u32 = 0x7fff0000;
    const ERRNO_EPERM: u32 = 0x00050001;
    const KILL: u32 = 0x80000000;
    let arch = if cfg!(target_arch = "x86_64") {
        0xc000003e
    } else if cfg!(target_arch = "aarch64") {
        0xc00000b7
    } else {
        0
    };
    let denied: &[i64] = &[
        libc::SYS_ptrace,
        libc::SYS_mount,
        libc::SYS_umount2,
        libc::SYS_pivot_root,
        libc::SYS_kexec_load,
        libc::SYS_bpf,
        libc::SYS_userfaultfd,
        libc::SYS_open_by_handle_at,
        libc::SYS_process_vm_readv,
        libc::SYS_process_vm_writev,
    ];
    let mut rows = vec![
        (LD_W_ABS, 0, 0, 4),
        (JMP_JEQ_K, 1, 0, arch),
        (RET_K, 0, 0, KILL),
        (LD_W_ABS, 0, 0, 0),
    ];
    for syscall in denied {
        rows.push((JMP_JEQ_K, 0, 1, *syscall as u32));
        rows.push((RET_K, 0, 0, ERRNO_EPERM));
    }
    rows.push((RET_K, 0, 0, ALLOW));
    let mut bytes = Vec::with_capacity(rows.len() * 8);
    for (code, jt, jf, k) in rows {
        bytes.extend(code.to_ne_bytes());
        bytes.push(jt);
        bytes.push(jf);
        bytes.extend(k.to_ne_bytes());
    }
    bytes
}
