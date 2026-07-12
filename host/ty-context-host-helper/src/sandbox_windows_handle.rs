use crate::{HostError, HostResult, sandbox::SandboxPolicy};
use std::{ffi::OsStr, fs, os::windows::ffi::OsStrExt};
use windows_sys::Win32::{
    Foundation::{CloseHandle, HANDLE, LocalFree},
    Security::{Isolation::GetAppContainerFolderPath, PSID},
    System::Com::CoTaskMemFree,
};

pub struct OwnedHandle(pub HANDLE);
impl Drop for OwnedHandle {
    fn drop(&mut self) {
        if !self.0.is_null() {
            unsafe { CloseHandle(self.0) };
        }
    }
}

pub struct LoopbackGuard {
    sid: Option<String>,
}
impl LoopbackGuard {
    pub fn apply(policy: &SandboxPolicy, sid: PSID) -> HostResult<Self> {
        if policy.network != "loopback" {
            return Ok(Self { sid: None });
        }
        let text = sid_text(sid)?;
        if !loopback_command("-a", &text) {
            return Err(HostError::Sandbox("sandbox_loopback_policy".into()));
        }
        Ok(Self { sid: Some(text) })
    }
}
impl Drop for LoopbackGuard {
    fn drop(&mut self) {
        if let Some(sid) = &self.sid {
            let _ = loopback_command("-d", sid);
        }
    }
}

pub fn appcontainer_temp(sid: PSID) -> HostResult<std::path::PathBuf> {
    let sid = wide(sid_text(sid)?);
    let mut value = std::ptr::null_mut();
    let hr = unsafe { GetAppContainerFolderPath(sid.as_ptr(), &mut value) };
    if hr < 0 || value.is_null() {
        return Err(HostError::Sandbox(format!(
            "sandbox_appcontainer_folder:{hr:#x}"
        )));
    }
    let mut length = 0usize;
    while unsafe { *value.add(length) } != 0 {
        length += 1;
    }
    let local = std::path::PathBuf::from(String::from_utf16_lossy(unsafe {
        std::slice::from_raw_parts(value, length)
    }));
    unsafe { CoTaskMemFree(value.cast()) };
    let package_root = local
        .parent()
        .ok_or_else(|| HostError::Sandbox("sandbox_appcontainer_folder_parent".into()))?;
    let temp = package_root.join("AC").join("Temp");
    fs::create_dir_all(&temp).map_err(|error| HostError::io(&temp, error))?;
    Ok(temp)
}
pub fn wide(value: impl AsRef<OsStr>) -> Vec<u16> {
    value
        .as_ref()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}
pub fn last(code: &str) -> HostError {
    HostError::Sandbox(format!(
        "{code}_win32_{}",
        std::io::Error::last_os_error().raw_os_error().unwrap_or(-1)
    ))
}
pub fn open_reparse(path: &std::path::Path) -> HostResult<OwnedHandle> {
    use windows_sys::Win32::{
        Foundation::INVALID_HANDLE_VALUE,
        Storage::FileSystem::{
            CreateFileW, FILE_FLAG_BACKUP_SEMANTICS, FILE_FLAG_OPEN_REPARSE_POINT,
            FILE_SHARE_DELETE, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING, READ_CONTROL,
            WRITE_DAC,
        },
    };
    let name = wide(path.as_os_str());
    let raw = unsafe {
        CreateFileW(
            name.as_ptr(),
            READ_CONTROL | WRITE_DAC,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            std::ptr::null(),
            OPEN_EXISTING,
            FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_BACKUP_SEMANTICS,
            std::ptr::null_mut(),
        )
    };
    if raw == INVALID_HANDLE_VALUE {
        Err(last("sandbox_reparse_open"))
    } else {
        Ok(OwnedHandle(raw))
    }
}
fn sid_text(sid: PSID) -> HostResult<String> {
    use windows_sys::Win32::Security::Authorization::ConvertSidToStringSidW;
    let mut value = std::ptr::null_mut();
    if unsafe { ConvertSidToStringSidW(sid, &mut value) } == 0 {
        return Err(last("sandbox_sid_string"));
    }
    let mut length = 0usize;
    while unsafe { *value.add(length) } != 0 {
        length += 1;
    }
    let text = String::from_utf16(unsafe { std::slice::from_raw_parts(value, length) })
        .map_err(|_| HostError::Sandbox("sandbox_sid_string_utf16".into()))?;
    unsafe { LocalFree(value.cast()) };
    Ok(text)
}
fn loopback_command(action: &str, sid: &str) -> bool {
    let executable = std::env::var_os("SystemRoot")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::path::PathBuf::from(r"C:\Windows"))
        .join("System32/CheckNetIsolation.exe");
    std::process::Command::new(executable)
        .args(["LoopbackExempt", action, &format!("-p={sid}")])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .is_ok_and(|status| status.success())
}
