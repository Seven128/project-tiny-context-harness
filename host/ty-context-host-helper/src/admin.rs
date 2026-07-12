use crate::{HostError, HostResult};
use std::path::Path;
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AdminCommand {
    Status,
    Close,
    RecoverJournal,
    RotateKey,
    Gc,
}
impl AdminCommand {
    pub fn parse(value: &str) -> HostResult<Self> {
        match value {
            "status" => Ok(Self::Status),
            "close" => Ok(Self::Close),
            "recover-journal" => Ok(Self::RecoverJournal),
            "rotate-key" => Ok(Self::RotateKey),
            "gc" => Ok(Self::Gc),
            _ => Err(HostError::Usage("admin command".into())),
        }
    }
    pub fn mutates(self) -> bool {
        self != Self::Status
    }
}
pub fn require_local_presence(
    command: AdminCommand,
    is_admin: bool,
    interactive: bool,
    registry_ids_match: bool,
    token_present: bool,
    reason: &str,
) -> HostResult<()> {
    if !command.mutates() {
        return Ok(());
    }
    if !is_admin
        || !interactive
        || !registry_ids_match
        || !token_present
        || reason.trim().is_empty()
    {
        return Err(HostError::Permission("admin_local_presence".into()));
    }
    Ok(())
}

#[cfg(unix)]
pub fn current_process_is_admin() -> bool {
    (unsafe { libc::geteuid() }) == 0
}

#[cfg(windows)]
pub fn current_process_is_admin() -> bool {
    (unsafe { windows_sys::Win32::UI::Shell::IsUserAnAdmin() }) != 0
}

pub fn managed_paths_secure(
    managed_dir: &Path,
    state_root: &Path,
    requirements_file: &Path,
    node_path: &Path,
    sandbox_launcher_path: &Path,
    installer_ui_path: &Path,
    codex_launcher_path: &Path,
    test_namespace: bool,
) -> HostResult<bool> {
    if test_namespace {
        return Ok(true);
    }
    Ok(service_identity_secure()?
        && public_tree_secure(managed_dir)?
        && public_path_secure(requirements_file)?
        && public_path_secure(node_path)?
        && public_path_secure(sandbox_launcher_path)?
        && public_path_secure(installer_ui_path)?
        && public_path_secure(codex_launcher_path)?
        && private_path_secure(state_root)?)
}

fn public_tree_secure(root: &Path) -> HostResult<bool> {
    fn visit(path: &Path, depth: usize, entries: &mut usize) -> HostResult<bool> {
        *entries += 1;
        if depth > 8 || *entries > 256 {
            return Ok(false);
        }
        let metadata =
            std::fs::symlink_metadata(path).map_err(|error| HostError::io(path, error))?;
        if metadata.file_type().is_symlink() || !public_path_secure(path)? {
            return Ok(false);
        }
        if metadata.is_dir() {
            for entry in std::fs::read_dir(path).map_err(|error| HostError::io(path, error))? {
                let child = entry.map_err(|error| HostError::io(path, error))?.path();
                if !visit(&child, depth + 1, entries)? {
                    return Ok(false);
                }
            }
        }
        Ok(true)
    }
    let mut entries = 0;
    visit(root, 0, &mut entries)
}

#[cfg(unix)]
fn service_identity_secure() -> HostResult<bool> {
    Ok(unsafe { libc::geteuid() } == 0)
}
#[cfg(unix)]
fn public_path_secure(path: &Path) -> HostResult<bool> {
    unix_mode_secure(path, 0o022)
}
#[cfg(unix)]
fn private_path_secure(path: &Path) -> HostResult<bool> {
    unix_mode_secure(path, 0o077)
}
#[cfg(unix)]
fn unix_mode_secure(path: &Path, forbidden: u32) -> HostResult<bool> {
    use std::os::unix::fs::MetadataExt;
    let metadata = std::fs::metadata(path).map_err(|error| HostError::io(path, error))?;
    Ok(metadata.uid() == 0 && metadata.mode() & forbidden == 0)
}

#[cfg(windows)]
fn service_identity_secure() -> HostResult<bool> {
    use windows_sys::Win32::{
        Foundation::{CloseHandle, HANDLE},
        Security::{
            GetTokenInformation, IsWellKnownSid, TOKEN_QUERY, TOKEN_USER, TokenUser,
            WinLocalSystemSid,
        },
        System::Threading::{GetCurrentProcess, OpenProcessToken},
    };
    let mut token: HANDLE = std::ptr::null_mut();
    if unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) } == 0 {
        return Err(HostError::io(
            "OpenProcessToken",
            std::io::Error::last_os_error(),
        ));
    }
    let mut needed = 0u32;
    unsafe { GetTokenInformation(token, TokenUser, std::ptr::null_mut(), 0, &mut needed) };
    let mut bytes = vec![0u8; needed as usize];
    let ok = unsafe {
        GetTokenInformation(
            token,
            TokenUser,
            bytes.as_mut_ptr().cast(),
            needed,
            &mut needed,
        )
    };
    unsafe { CloseHandle(token) };
    if ok == 0 {
        return Err(HostError::io(
            "GetTokenInformation",
            std::io::Error::last_os_error(),
        ));
    }
    let user = unsafe { &*(bytes.as_ptr().cast::<TOKEN_USER>()) };
    Ok(unsafe { IsWellKnownSid(user.User.Sid, WinLocalSystemSid) } != 0)
}
#[cfg(windows)]
fn public_path_secure(path: &Path) -> HostResult<bool> {
    windows_acl_secure(path, false)
}
#[cfg(windows)]
fn private_path_secure(path: &Path) -> HostResult<bool> {
    windows_acl_secure(path, true)
}
#[cfg(windows)]
fn windows_acl_secure(path: &Path, private: bool) -> HostResult<bool> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::{
        Foundation::LocalFree,
        Security::Authorization::{GetNamedSecurityInfoW, SE_FILE_OBJECT},
        Security::{
            ACCESS_ALLOWED_ACE, ACL, ACL_SIZE_INFORMATION, AclSizeInformation,
            DACL_SECURITY_INFORMATION, GetAce, GetAclInformation, IsWellKnownSid,
            OWNER_SECURITY_INFORMATION, PSECURITY_DESCRIPTOR, PSID, WinAuthenticatedUserSid,
            WinBuiltinAdministratorsSid, WinBuiltinUsersSid, WinLocalSystemSid, WinWorldSid,
        },
        Storage::FileSystem::{
            DELETE, FILE_GENERIC_READ, FILE_GENERIC_WRITE, WRITE_DAC, WRITE_OWNER,
        },
    };
    let wide: Vec<u16> = path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let mut owner: PSID = std::ptr::null_mut();
    let mut dacl: *mut ACL = std::ptr::null_mut();
    let mut descriptor: PSECURITY_DESCRIPTOR = std::ptr::null_mut();
    let status = unsafe {
        GetNamedSecurityInfoW(
            wide.as_ptr(),
            SE_FILE_OBJECT,
            OWNER_SECURITY_INFORMATION | DACL_SECURITY_INFORMATION,
            &mut owner,
            std::ptr::null_mut(),
            &mut dacl,
            std::ptr::null_mut(),
            &mut descriptor,
        )
    };
    if status != 0 {
        return Err(HostError::io(
            path,
            std::io::Error::from_raw_os_error(status as i32),
        ));
    }
    let owner_secure = !owner.is_null()
        && unsafe {
            IsWellKnownSid(owner, WinLocalSystemSid) != 0
                || IsWellKnownSid(owner, WinBuiltinAdministratorsSid) != 0
        };
    let mut secure = owner_secure && !dacl.is_null();
    if secure {
        let mut info: ACL_SIZE_INFORMATION = unsafe { std::mem::zeroed() };
        if unsafe {
            GetAclInformation(
                dacl,
                (&mut info as *mut ACL_SIZE_INFORMATION).cast(),
                std::mem::size_of::<ACL_SIZE_INFORMATION>() as u32,
                AclSizeInformation,
            )
        } == 0
        {
            secure = false;
        } else {
            let dangerous = FILE_GENERIC_WRITE
                | DELETE
                | WRITE_DAC
                | WRITE_OWNER
                | if private { FILE_GENERIC_READ } else { 0 };
            for index in 0..info.AceCount {
                let mut raw = std::ptr::null_mut();
                if unsafe { GetAce(dacl, index, &mut raw) } == 0 {
                    secure = false;
                    break;
                }
                let ace = unsafe { &*(raw.cast::<ACCESS_ALLOWED_ACE>()) };
                if ace.Header.AceType != 0 {
                    continue;
                }
                let sid = (&ace.SidStart as *const u32).cast_mut().cast();
                let untrusted = unsafe {
                    IsWellKnownSid(sid, WinWorldSid) != 0
                        || IsWellKnownSid(sid, WinAuthenticatedUserSid) != 0
                        || IsWellKnownSid(sid, WinBuiltinUsersSid) != 0
                };
                if untrusted && ace.Mask & dangerous != 0 {
                    secure = false;
                    break;
                }
            }
        }
    }
    if !descriptor.is_null() {
        unsafe { LocalFree(descriptor) };
    }
    Ok(secure)
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;

    #[test]
    fn managed_tree_rejects_a_writable_child() {
        if unsafe { libc::geteuid() } != 0 {
            return;
        }
        let root = std::env::temp_dir().join(format!("tyc-managed-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&root).unwrap();
        let child = root.join("long-task-hook.mjs");
        std::fs::write(&child, "export {};\n").unwrap();
        std::fs::set_permissions(&root, std::fs::Permissions::from_mode(0o755)).unwrap();
        std::fs::set_permissions(&child, std::fs::Permissions::from_mode(0o644)).unwrap();
        assert!(public_tree_secure(&root).unwrap());
        std::fs::set_permissions(&child, std::fs::Permissions::from_mode(0o666)).unwrap();
        assert!(!public_tree_secure(&root).unwrap());
        std::fs::remove_dir_all(root).unwrap();
    }
}
