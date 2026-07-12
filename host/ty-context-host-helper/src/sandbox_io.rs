use crate::{HostError, HostResult, sandbox::SandboxPolicy};
#[cfg(unix)]
use std::process::{Command, Stdio};
use std::{
    fs::{self, File, OpenOptions},
    io::{Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
};

const PROTOCOL_LIMIT: u64 = 16 * 1024 * 1024;
const DIAGNOSTIC_LIMIT: u64 = 2 * 1024 * 1024;

pub struct PreparedOutputs {
    protocol: Option<(PathBuf, File)>,
    diagnostic: Option<(PathBuf, File)>,
}
impl PreparedOutputs {
    pub fn cleanup(&self) {
        for value in [&self.protocol, &self.diagnostic].into_iter().flatten() {
            let _ = fs::remove_file(&value.0);
        }
    }
}

pub fn prepare(policy: &SandboxPolicy) -> HostResult<PreparedOutputs> {
    let mut outputs = PreparedOutputs {
        protocol: None,
        diagnostic: None,
    };
    if let (Some(protocol), Some(diagnostic)) = (&policy.protocol_output, &policy.diagnostic_output)
    {
        outputs.protocol = Some((protocol.clone(), create_output(protocol)?));
        match create_output(diagnostic) {
            Ok(file) => outputs.diagnostic = Some((diagnostic.clone(), file)),
            Err(error) => {
                outputs.cleanup();
                return Err(error);
            }
        }
    }
    Ok(outputs)
}

pub fn publish(outputs: &mut PreparedOutputs, require_protocol: bool) -> HostResult<()> {
    if let Some((path, file)) = &mut outputs.protocol {
        let bytes = read_bounded(file, path, PROTOCOL_LIMIT)?;
        if require_protocol && bytes.is_empty() {
            return Err(HostError::Sandbox("oracle_protocol_missing".into()));
        }
        std::io::stdout()
            .write_all(&bytes)
            .map_err(|error| HostError::io("stdout", error))?;
    }
    if let Some((path, file)) = &mut outputs.diagnostic {
        let bytes = read_bounded(file, path, DIAGNOSTIC_LIMIT)?;
        std::io::stderr()
            .write_all(&bytes)
            .map_err(|error| HostError::io("stderr", error))?;
    }
    Ok(())
}

#[cfg(unix)]
pub fn isolate_oracle_diagnostics(process: &mut Command, policy: &SandboxPolicy) -> HostResult<()> {
    if policy.process_kind != "oracle" {
        return Ok(());
    }
    let Some(path) = &policy.diagnostic_output else {
        return Ok(());
    };
    let stdout = OpenOptions::new()
        .append(true)
        .open(path)
        .map_err(|error| HostError::io(path, error))?;
    let stderr = stdout
        .try_clone()
        .map_err(|error| HostError::io(path, error))?;
    process
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr));
    Ok(())
}

pub fn validate_output(output: &Path, write_paths: &[PathBuf]) -> HostResult<()> {
    if !output.is_absolute() || output.exists() || output.file_name().is_none() {
        return Err(HostError::Sandbox("policy_output_invalid".into()));
    }
    let parent = output
        .parent()
        .ok_or_else(|| HostError::Sandbox("policy_output_invalid".into()))?;
    let canonical_parent =
        fs::canonicalize(parent).map_err(|error| HostError::io(parent, error))?;
    if !same_path(parent, &canonical_parent) {
        return Err(HostError::Sandbox("policy_output_noncanonical".into()));
    }
    let inside = write_paths.iter().any(|root| {
        fs::canonicalize(root)
            .map(|canonical_root| path_inside(&canonical_root, &canonical_parent))
            .unwrap_or(false)
    });
    if !inside {
        return Err(HostError::Sandbox(
            "policy_output_outside_write_root".into(),
        ));
    }
    Ok(())
}

pub fn path_inside(root: &Path, candidate: &Path) -> bool {
    #[cfg(windows)]
    {
        let root = normalized_windows_path(root);
        let candidate = normalized_windows_path(candidate);
        candidate == root || candidate.starts_with(&format!("{root}\\"))
    }
    #[cfg(not(windows))]
    {
        candidate == root || candidate.starts_with(root)
    }
}
pub fn same_path(left: &Path, right: &Path) -> bool {
    #[cfg(windows)]
    {
        normalized_windows_path(left) == normalized_windows_path(right)
    }
    #[cfg(not(windows))]
    {
        left == right
    }
}

fn create_output(path: &Path) -> HostResult<File> {
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|error| HostError::io(path, error))?;
    file.sync_all()
        .map_err(|error| HostError::io(path, error))?;
    Ok(file)
}
fn read_bounded(file: &mut File, path: &Path, limit: u64) -> HostResult<Vec<u8>> {
    let size = file
        .metadata()
        .map_err(|error| HostError::io(path, error))?
        .len();
    if size > limit {
        return Err(HostError::Sandbox("sandbox_output_limit_exceeded".into()));
    }
    file.seek(SeekFrom::Start(0))
        .map_err(|error| HostError::io(path, error))?;
    let mut bytes = Vec::with_capacity(size as usize);
    file.take(limit + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| HostError::io(path, error))?;
    if bytes.len() as u64 > limit {
        return Err(HostError::Sandbox("sandbox_output_limit_exceeded".into()));
    }
    Ok(bytes)
}
#[cfg(windows)]
fn normalized_windows_path(value: &Path) -> String {
    value
        .to_string_lossy()
        .trim_start_matches(r"\\?\")
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_lowercase()
}
