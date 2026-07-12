use crate::{
    HostResult,
    sandbox::SandboxPolicy,
    sandbox_windows_handle::{OwnedHandle, last},
};
use std::{fs, path::Path};

pub fn quote(value: &str) -> String {
    if !value.is_empty() && !value.chars().any(|c| c.is_whitespace() || c == '"') {
        return value.into();
    }
    let mut out = String::from("\"");
    let mut slashes = 0;
    for c in value.chars() {
        if c == '\\' {
            slashes += 1;
        } else {
            if c == '"' {
                out.push_str(&"\\".repeat(slashes * 2 + 1));
            } else {
                out.push_str(&"\\".repeat(slashes));
            }
            slashes = 0;
            out.push(c);
        }
    }
    out.push_str(&"\\".repeat(slashes * 2));
    out.push('"');
    out
}

pub struct OutputEnvironmentGuard {
    protocol: Option<std::ffi::OsString>,
    diagnostic: Option<std::ffi::OsString>,
    temp: Option<std::ffi::OsString>,
    tmp: Option<std::ffi::OsString>,
    node_options: Option<std::ffi::OsString>,
}
impl OutputEnvironmentGuard {
    pub fn apply(policy: &SandboxPolicy, app_temp: &Path) -> Self {
        const PROTOCOL: &str = "TY_CONTEXT_ORACLE_PROTOCOL_FILE";
        const DIAGNOSTIC: &str = "TY_CONTEXT_ORACLE_DIAGNOSTIC_FILE";
        let guard = Self {
            protocol: std::env::var_os(PROTOCOL),
            diagnostic: std::env::var_os(DIAGNOSTIC),
            temp: std::env::var_os("TEMP"),
            tmp: std::env::var_os("TMP"),
            node_options: std::env::var_os("NODE_OPTIONS"),
        };
        set(PROTOCOL, policy.protocol_output.as_deref());
        set(DIAGNOSTIC, policy.diagnostic_output.as_deref());
        if policy.process_kind == "command" {
            let command_temp =
                declared_command_temp(policy).unwrap_or_else(|| app_temp.to_path_buf());
            set("TEMP", Some(&command_temp));
            set("TMP", Some(&command_temp));
            let mut options = crate::sandbox::command_node_options(policy)
                .expect("command process has Node permission options");
            let app_temp_option = crate::sandbox::node_option_path(app_temp);
            options.push_str(&format!(
                " --allow-fs-read={app_temp_option} --allow-fs-write={app_temp_option}"
            ));
            unsafe { std::env::set_var("NODE_OPTIONS", options) };
        }
        guard
    }
}
impl Drop for OutputEnvironmentGuard {
    fn drop(&mut self) {
        set(
            "TY_CONTEXT_ORACLE_PROTOCOL_FILE",
            self.protocol.as_deref().map(Path::new),
        );
        set(
            "TY_CONTEXT_ORACLE_DIAGNOSTIC_FILE",
            self.diagnostic.as_deref().map(Path::new),
        );
        set("TEMP", self.temp.as_deref().map(Path::new));
        set("TMP", self.tmp.as_deref().map(Path::new));
        if let Some(value) = &self.node_options {
            unsafe { std::env::set_var("NODE_OPTIONS", value) }
        } else {
            unsafe { std::env::remove_var("NODE_OPTIONS") }
        }
    }
}

pub struct InheritedStdio {
    pub input: OwnedHandle,
    pub output: OwnedHandle,
    pub error: OwnedHandle,
}
impl InheritedStdio {
    pub fn create() -> HostResult<Self> {
        use windows_sys::Win32::System::Console::{
            STD_ERROR_HANDLE, STD_INPUT_HANDLE, STD_OUTPUT_HANDLE,
        };
        Ok(Self {
            input: duplicate_standard(STD_INPUT_HANDLE)?,
            output: duplicate_standard(STD_OUTPUT_HANDLE)?,
            error: duplicate_standard(STD_ERROR_HANDLE)?,
        })
    }
}
fn declared_command_temp(policy: &SandboxPolicy) -> Option<std::path::PathBuf> {
    let requested = std::env::var_os("TY_CONTEXT_TEMP_DIR").map(std::path::PathBuf::from)?;
    let canonical = fs::canonicalize(&requested).ok()?;
    policy
        .write_paths
        .iter()
        .any(|root| crate::sandbox_io::path_inside(root, &canonical))
        .then_some(canonical)
}
fn set(name: &str, value: Option<&Path>) {
    if let Some(value) = value {
        unsafe { std::env::set_var(name, value) }
    } else {
        unsafe { std::env::remove_var(name) }
    }
}
fn duplicate_standard(which: u32) -> HostResult<OwnedHandle> {
    use windows_sys::Win32::{
        Foundation::{DUPLICATE_SAME_ACCESS, DuplicateHandle, INVALID_HANDLE_VALUE},
        System::{Console::GetStdHandle, Threading::GetCurrentProcess},
    };
    let source = unsafe { GetStdHandle(which) };
    if source.is_null() || source == INVALID_HANDLE_VALUE {
        return Err(last("sandbox_standard_handle"));
    }
    let mut target = std::ptr::null_mut();
    let process = unsafe { GetCurrentProcess() };
    if unsafe {
        DuplicateHandle(
            process,
            source,
            process,
            &mut target,
            0,
            1,
            DUPLICATE_SAME_ACCESS,
        )
    } == 0
    {
        return Err(last("sandbox_duplicate_handle"));
    }
    Ok(OwnedHandle(target))
}
