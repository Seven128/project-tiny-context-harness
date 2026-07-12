use crate::{HostError, HostResult};
use sha2::{Digest, Sha256};
use std::{fs, path::PathBuf, process::Command};

#[derive(Clone, Debug)]
pub struct SandboxLauncher {
    pub path: PathBuf,
    pub sha256: String,
}

pub fn system_default() -> HostResult<SandboxLauncher> {
    let candidate = if cfg!(windows) {
        std::env::current_exe().map_err(|error| HostError::io("current_exe", error))?
    } else if cfg!(target_os = "macos") {
        PathBuf::from("/usr/bin/sandbox-exec")
    } else {
        ["/usr/bin/bwrap", "/bin/bwrap"]
            .into_iter()
            .map(PathBuf::from)
            .find(|path| path.is_file())
            .ok_or_else(|| HostError::Sandbox("bubblewrap_missing".into()))?
    };
    let canonical =
        fs::canonicalize(&candidate).map_err(|error| HostError::io(&candidate, error))?;
    let sha256 = hex::encode(Sha256::digest(
        fs::read(&canonical).map_err(|error| HostError::io(&canonical, error))?,
    ));
    validate(canonical, sha256)
}

pub fn from_args(args: &[String]) -> HostResult<SandboxLauncher> {
    match (
        option(args, "--launcher")?,
        option(args, "--launcher-sha256")?,
    ) {
        (None, None) => system_default(),
        (Some(path), Some(sha256)) => validate(PathBuf::from(path), sha256.to_owned()),
        _ => Err(HostError::Usage(
            "sandbox launcher path and hash must be supplied together".into(),
        )),
    }
}

pub fn validate(path: PathBuf, sha256: String) -> HostResult<SandboxLauncher> {
    if sha256.len() != 64
        || !sha256
            .bytes()
            .all(|value| value.is_ascii_digit() || (b'a'..=b'f').contains(&value))
    {
        return Err(HostError::Sandbox("launcher_hash_invalid".into()));
    }
    let metadata = fs::symlink_metadata(&path).map_err(|error| HostError::io(&path, error))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(HostError::Sandbox("launcher_path_invalid".into()));
    }
    let canonical = fs::canonicalize(&path).map_err(|error| HostError::io(&path, error))?;
    if !crate::sandbox_io::same_path(&path, &canonical) {
        return Err(HostError::Sandbox("launcher_path_noncanonical".into()));
    }
    let actual = hex::encode(Sha256::digest(
        fs::read(&canonical).map_err(|error| HostError::io(&canonical, error))?,
    ));
    if actual != sha256 {
        return Err(HostError::Sandbox("launcher_identity_changed".into()));
    }
    assert_platform_launcher(&canonical)?;
    Ok(SandboxLauncher {
        path: canonical,
        sha256,
    })
}

pub fn capability(launcher: &SandboxLauncher) -> bool {
    if cfg!(windows) {
        true
    } else if cfg!(target_os = "macos") {
        Command::new(&launcher.path).arg("-h").output().is_ok()
    } else {
        Command::new(&launcher.path)
            .arg("--version")
            .output()
            .is_ok()
    }
}

fn assert_platform_launcher(path: &std::path::Path) -> HostResult<()> {
    if cfg!(windows) {
        let current =
            std::env::current_exe().map_err(|error| HostError::io("current_exe", error))?;
        if !crate::service_config::same_path(path, &current) {
            return Err(HostError::Sandbox("launcher_not_helper".into()));
        }
    } else if cfg!(target_os = "macos") {
        if path != std::path::Path::new("/usr/bin/sandbox-exec") {
            return Err(HostError::Sandbox("launcher_not_seatbelt".into()));
        }
    } else if path.file_name().and_then(|value| value.to_str()) != Some("bwrap") {
        return Err(HostError::Sandbox("launcher_not_bubblewrap".into()));
    }
    Ok(())
}

fn option<'a>(args: &'a [String], key: &str) -> HostResult<Option<&'a str>> {
    let Some(index) = args.iter().position(|value| value == key) else {
        return Ok(None);
    };
    args.get(index + 1)
        .map(|value| Some(value.as_str()))
        .ok_or_else(|| HostError::Usage(format!("sandbox requires value for {key}")))
}

#[cfg(all(test, unix, not(target_os = "macos")))]
mod tests {
    use super::*;
    use std::os::unix::fs::symlink;

    #[test]
    fn rejects_a_launcher_reached_through_a_symlinked_parent() {
        let root = std::env::temp_dir().join(format!("tyc-launcher-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&root).unwrap();
        let real = root.join("real");
        std::fs::create_dir(&real).unwrap();
        let canonical = real.join("bwrap");
        std::fs::copy(std::env::current_exe().unwrap(), &canonical).unwrap();
        symlink(&real, root.join("bin")).unwrap();
        let candidate = root.join("bin").join("bwrap");
        let hash = hex::encode(Sha256::digest(std::fs::read(&canonical).unwrap()));
        let error = validate(candidate, hash).unwrap_err();
        assert!(matches!(error, HostError::Sandbox(code) if code == "launcher_path_noncanonical"));
        std::fs::remove_dir_all(root).unwrap();
    }
}
