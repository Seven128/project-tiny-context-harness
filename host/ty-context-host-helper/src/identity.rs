use crate::{HostError, HostResult, rpc::canonical_bytes};
use serde::{Deserialize, Serialize};
use serde_json::to_value;
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RepositoryIdentity {
    pub canonical_path: String,
    pub volume_or_device: String,
    pub root_file_id: String,
    pub birth_identity: String,
    pub git_common_dir_path: String,
    pub git_common_dir_volume_or_device: String,
    pub git_common_dir_file_id: String,
    pub git_object_format: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct WorkdirIdentity {
    pub canonical_path: String,
    pub volume_or_device: String,
    pub directory_file_id: String,
    pub birth_identity: String,
    pub repository_identity_hash: String,
}

pub fn repository(root: &Path) -> HostResult<(RepositoryIdentity, String)> {
    let canonical = fs::canonicalize(root).map_err(|error| HostError::io(root, error))?;
    let metadata = fs::metadata(&canonical).map_err(|error| HostError::io(&canonical, error))?;
    if !metadata.is_dir() {
        return Err(HostError::Configuration("repository_not_directory".into()));
    }
    let common_raw = git(&canonical, &["rev-parse", "--git-common-dir"])?;
    let common = fs::canonicalize(canonical.join(common_raw))
        .map_err(|error| HostError::io(canonical.join(".git"), error))?;
    let common_metadata = fs::metadata(&common).map_err(|error| HostError::io(&common, error))?;
    let (volume, file_id, birth) = file_identity(&canonical, &metadata)?;
    let (common_volume, common_file_id, _) = file_identity(&common, &common_metadata)?;
    let identity = RepositoryIdentity {
        canonical_path: display(&canonical),
        volume_or_device: volume,
        root_file_id: file_id,
        birth_identity: birth,
        git_common_dir_path: display(&common),
        git_common_dir_volume_or_device: common_volume,
        git_common_dir_file_id: common_file_id,
        git_object_format: git(&canonical, &["rev-parse", "--show-object-format"])?,
    };
    let hash = hash_identity(&identity)?;
    Ok((identity, hash))
}

pub fn workdir(root: &Path, task: &Path) -> HostResult<(WorkdirIdentity, String)> {
    let (repository, repository_hash) = repository(root)?;
    let canonical = fs::canonicalize(task).map_err(|error| HostError::io(task, error))?;
    let repository_path = PathBuf::from(&repository.canonical_path);
    if !canonical.starts_with(&repository_path) {
        return Err(HostError::Configuration(
            "workdir_outside_repository".into(),
        ));
    }
    let metadata = fs::metadata(&canonical).map_err(|error| HostError::io(&canonical, error))?;
    let (volume, file_id, birth) = file_identity(&canonical, &metadata)?;
    let identity = WorkdirIdentity {
        canonical_path: display(&canonical),
        volume_or_device: volume,
        directory_file_id: file_id,
        birth_identity: birth,
        repository_identity_hash: repository_hash,
    };
    let hash = hash_identity(&identity)?;
    Ok((identity, hash))
}

fn hash_identity<T: Serialize>(identity: &T) -> HostResult<String> {
    Ok(hex::encode(Sha256::digest(canonical_bytes(
        &to_value(identity).map_err(|error| HostError::Internal(error.to_string()))?,
    )?)))
}
fn git(root: &Path, args: &[&str]) -> HostResult<String> {
    let output = Command::new("git")
        .arg("-c")
        .arg(format!("safe.directory={}", display(root)))
        .args(args)
        .current_dir(root)
        .output()
        .map_err(|error| HostError::io("git", error))?;
    if !output.status.success() {
        return Err(HostError::Configuration(format!(
            "git_identity:{}",
            String::from_utf8_lossy(&output.stderr).trim()
        )));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
}
fn display(path: &Path) -> String {
    let mut value = path.to_string_lossy().into_owned();
    if cfg!(windows) {
        if let Some(rest) = value.strip_prefix(r"\\?\UNC\") {
            value = format!(r"\\{rest}");
        } else if let Some(rest) = value.strip_prefix(r"\\?\") {
            value = rest.to_owned();
        }
        value.to_lowercase()
    } else {
        value
    }
}

#[cfg(windows)]
fn file_identity(path: &Path, metadata: &fs::Metadata) -> HostResult<(String, String, String)> {
    use std::os::windows::ffi::OsStrExt;
    use std::os::windows::fs::MetadataExt;
    use windows_sys::Win32::{
        Foundation::{CloseHandle, INVALID_HANDLE_VALUE},
        Storage::FileSystem::{
            BY_HANDLE_FILE_INFORMATION, CreateFileW, FILE_FLAG_BACKUP_SEMANTICS,
            FILE_READ_ATTRIBUTES, FILE_SHARE_DELETE, FILE_SHARE_READ, FILE_SHARE_WRITE,
            GetFileInformationByHandle, OPEN_EXISTING,
        },
    };
    let wide: Vec<u16> = path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let handle = unsafe {
        CreateFileW(
            wide.as_ptr(),
            FILE_READ_ATTRIBUTES,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            std::ptr::null(),
            OPEN_EXISTING,
            FILE_FLAG_BACKUP_SEMANTICS,
            std::ptr::null_mut(),
        )
    };
    if handle == INVALID_HANDLE_VALUE {
        return Err(HostError::io(path, std::io::Error::last_os_error()));
    }
    let mut information: BY_HANDLE_FILE_INFORMATION = unsafe { std::mem::zeroed() };
    let ok = unsafe { GetFileInformationByHandle(handle, &mut information) };
    unsafe { CloseHandle(handle) };
    if ok == 0 {
        return Err(HostError::io(path, std::io::Error::last_os_error()));
    }
    let file_id = ((information.nFileIndexHigh as u64) << 32) | information.nFileIndexLow as u64;
    const WINDOWS_TO_UNIX_100NS: u64 = 116_444_736_000_000_000;
    let birth_time_ns = metadata
        .creation_time()
        .saturating_sub(WINDOWS_TO_UNIX_100NS)
        .saturating_mul(100);
    Ok((
        information.dwVolumeSerialNumber.to_string(),
        file_id.to_string(),
        birth_time_ns.to_string(),
    ))
}
#[cfg(target_os = "linux")]
fn file_identity(path: &Path, metadata: &fs::Metadata) -> HostResult<(String, String, String)> {
    use std::os::unix::{ffi::OsStrExt, fs::MetadataExt};
    let path = std::ffi::CString::new(path.as_os_str().as_bytes())
        .map_err(|_| HostError::Configuration("identity_path_nul".into()))?;
    let mut value: libc::statx = unsafe { std::mem::zeroed() };
    let result = unsafe {
        libc::statx(
            libc::AT_FDCWD,
            path.as_ptr(),
            libc::AT_SYMLINK_NOFOLLOW,
            libc::STATX_BTIME,
            &mut value,
        )
    };
    if result != 0 {
        return Err(HostError::io("statx", std::io::Error::last_os_error()));
    }
    let birth = if value.stx_mask & libc::STATX_BTIME != 0 {
        i128::from(value.stx_btime.tv_sec) * 1_000_000_000 + i128::from(value.stx_btime.tv_nsec)
    } else {
        0
    };
    Ok((
        metadata.dev().to_string(),
        metadata.ino().to_string(),
        birth.to_string(),
    ))
}
#[cfg(target_os = "macos")]
fn file_identity(_path: &Path, metadata: &fs::Metadata) -> HostResult<(String, String, String)> {
    use std::os::macos::fs::MetadataExt;
    let birth = i128::from(metadata.st_birthtime()) * 1_000_000_000
        + i128::from(metadata.st_birthtime_nsec());
    Ok((
        metadata.st_dev().to_string(),
        metadata.st_ino().to_string(),
        birth.to_string(),
    ))
}
#[cfg(all(unix, not(any(target_os = "linux", target_os = "macos"))))]
fn file_identity(_path: &Path, metadata: &fs::Metadata) -> HostResult<(String, String, String)> {
    use std::os::unix::fs::MetadataExt;
    Ok((
        metadata.dev().to_string(),
        metadata.ino().to_string(),
        "0".into(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn path_display_is_stable() {
        let current = fs::canonicalize(".").unwrap();
        assert_eq!(display(&current), display(&current));
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn root_uses_an_exact_safe_directory_for_a_user_owned_repository() {
        if unsafe { libc::geteuid() } != 0 {
            return;
        }
        let root = std::env::temp_dir().join(format!("tyc-safe-git-{}", uuid::Uuid::new_v4()));
        fs::create_dir(&root).unwrap();
        assert!(
            Command::new("git")
                .args(["init", "--quiet"])
                .current_dir(&root)
                .status()
                .unwrap()
                .success()
        );
        chown_tree(&root, 65_534, 65_534);
        let result = repository(&root);
        assert!(result.is_ok(), "{result:?}");
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(target_os = "linux")]
    fn chown_tree(path: &Path, uid: u32, gid: u32) {
        if path.is_dir() {
            for entry in fs::read_dir(path).unwrap() {
                chown_tree(&entry.unwrap().path(), uid, gid);
            }
        }
        use std::os::unix::ffi::OsStrExt;
        let raw = std::ffi::CString::new(path.as_os_str().as_bytes()).unwrap();
        assert_eq!(unsafe { libc::chown(raw.as_ptr(), uid, gid) }, 0);
    }
}
