use crate::{
    HostError, HostResult,
    transport::{Handler, PeerIdentity, ProcessIdentity, debug, stopped},
};
use std::{
    fs::File,
    sync::{Arc, atomic::AtomicBool},
    thread,
};

pub fn serve(
    endpoint: &str,
    handler: Handler,
    stop: Option<Arc<AtomicBool>>,
    mut ready: Option<Box<dyn FnOnce() + Send>>,
) -> HostResult<()> {
    use std::{
        ffi::OsStr,
        os::windows::{ffi::OsStrExt, io::FromRawHandle},
    };
    use windows_sys::Win32::{
        Foundation::{
            CloseHandle, ERROR_PIPE_CONNECTED, GetLastError, INVALID_HANDLE_VALUE, LocalFree,
        },
        Security::{
            Authorization::{
                ConvertStringSecurityDescriptorToSecurityDescriptorW, SDDL_REVISION_1,
            },
            PSECURITY_DESCRIPTOR, SECURITY_ATTRIBUTES,
        },
        Storage::FileSystem::{FILE_FLAG_FIRST_PIPE_INSTANCE, PIPE_ACCESS_DUPLEX},
        System::Pipes::{
            ConnectNamedPipe, CreateNamedPipeW, GetNamedPipeClientProcessId, PIPE_READMODE_BYTE,
            PIPE_REJECT_REMOTE_CLIENTS, PIPE_TYPE_BYTE, PIPE_UNLIMITED_INSTANCES, PIPE_WAIT,
        },
    };
    let wide: Vec<u16> = OsStr::new(endpoint)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let mut first = true;
    loop {
        if stopped(&stop) {
            return Ok(());
        }
        let mode = PIPE_ACCESS_DUPLEX
            | if first {
                FILE_FLAG_FIRST_PIPE_INSTANCE
            } else {
                0
            };
        first = false;
        let mut descriptor: PSECURITY_DESCRIPTOR = std::ptr::null_mut();
        let sddl: Vec<u16> = OsStr::new("D:P(A;;GA;;;SY)(A;;GA;;;BA)(A;;GRGW;;;AU)")
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        if unsafe {
            ConvertStringSecurityDescriptorToSecurityDescriptorW(
                sddl.as_ptr(),
                SDDL_REVISION_1,
                &mut descriptor,
                std::ptr::null_mut(),
            )
        } == 0
        {
            return Err(HostError::io(
                "pipe_security",
                std::io::Error::last_os_error(),
            ));
        }
        let attributes = SECURITY_ATTRIBUTES {
            nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
            lpSecurityDescriptor: descriptor,
            bInheritHandle: 0,
        };
        let handle = unsafe {
            CreateNamedPipeW(
                wide.as_ptr(),
                mode,
                PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
                PIPE_UNLIMITED_INSTANCES,
                1024 * 1024 + 4,
                1024 * 1024 + 4,
                0,
                &attributes,
            )
        };
        unsafe { LocalFree(descriptor) };
        if handle == INVALID_HANDLE_VALUE {
            return Err(HostError::io(endpoint, std::io::Error::last_os_error()));
        }
        if let Some(signal) = ready.take() {
            signal();
        }
        let connected = unsafe { ConnectNamedPipe(handle, std::ptr::null_mut()) };
        if connected == 0 && unsafe { GetLastError() } != ERROR_PIPE_CONNECTED {
            unsafe { CloseHandle(handle) };
            return Err(HostError::io(endpoint, std::io::Error::last_os_error()));
        }
        if stopped(&stop) {
            unsafe { CloseHandle(handle) };
            return Ok(());
        }
        let mut process_id = 0u32;
        if unsafe { GetNamedPipeClientProcessId(handle, &mut process_id) } == 0 {
            unsafe { CloseHandle(handle) };
            continue;
        }
        let peer = match peer(process_id) {
            Ok(value) => value,
            Err(error) => {
                debug(format_args!(
                    "peer identity for {process_id} failed: {error}"
                ));
                unsafe { CloseHandle(handle) };
                continue;
            }
        };
        let file = unsafe { File::from_raw_handle(handle as _) };
        let current = handler.clone();
        thread::spawn(move || current(Box::new(file), peer));
    }
}

fn peer(process_id: u32) -> HostResult<PeerIdentity> {
    let (executable_path, command_line) = process_details(process_id)?;
    Ok(PeerIdentity {
        process_id,
        executable_path,
        command_line,
        ancestors: ancestors(process_id)?,
    })
}

fn process_details(process_id: u32) -> HostResult<(std::path::PathBuf, Vec<String>)> {
    use windows_sys::{
        Wdk::System::Threading::{NtQueryInformationProcess, ProcessCommandLineInformation},
        Win32::{
            Foundation::{LocalFree, UNICODE_STRING},
            UI::Shell::CommandLineToArgvW,
        },
    };
    let process = ProcessHandle::open(process_id)?;
    let executable_path = process.image()?;
    let mut needed = 0u32;
    unsafe {
        NtQueryInformationProcess(
            process.0,
            ProcessCommandLineInformation,
            std::ptr::null_mut(),
            0,
            &mut needed,
        )
    };
    if needed < std::mem::size_of::<UNICODE_STRING>() as u32 || needed > 1024 * 1024 {
        return Err(HostError::Permission("peer_command_size".into()));
    }
    let mut bytes = vec![0u8; needed as usize];
    let status = unsafe {
        NtQueryInformationProcess(
            process.0,
            ProcessCommandLineInformation,
            bytes.as_mut_ptr().cast(),
            needed,
            &mut needed,
        )
    };
    if status < 0 {
        return Err(HostError::Permission("peer_command".into()));
    }
    let command = unsafe { &*bytes.as_ptr().cast::<UNICODE_STRING>() };
    if command.Buffer.is_null() || command.Length == 0 || command.Length % 2 != 0 {
        return Err(HostError::Permission("peer_command_value".into()));
    }
    let words = unsafe { std::slice::from_raw_parts(command.Buffer, command.Length as usize / 2) };
    let mut wide = words.to_vec();
    wide.push(0);
    let mut count = 0i32;
    let argv = unsafe { CommandLineToArgvW(wide.as_ptr(), &mut count) };
    if argv.is_null() || !(1..=256).contains(&count) {
        return Err(HostError::Permission("peer_command_argv".into()));
    }
    let mut result = Vec::with_capacity(count as usize);
    for index in 0..count as usize {
        let pointer = unsafe { *argv.add(index) };
        if pointer.is_null() {
            unsafe { LocalFree(argv.cast()) };
            return Err(HostError::Permission("peer_command_argv".into()));
        }
        let mut length = 0usize;
        while unsafe { *pointer.add(length) } != 0 {
            length += 1;
            if length > 32768 {
                unsafe { LocalFree(argv.cast()) };
                return Err(HostError::Permission("peer_command_argv".into()));
            }
        }
        result.push(
            String::from_utf16(unsafe { std::slice::from_raw_parts(pointer, length) })
                .map_err(|_| HostError::Permission("peer_command_utf16".into()))?,
        );
    }
    unsafe { LocalFree(argv.cast()) };
    Ok((executable_path, result))
}

fn ancestors(process_id: u32) -> HostResult<Vec<ProcessIdentity>> {
    use std::collections::{HashMap, HashSet};
    use windows_sys::Win32::{
        Foundation::{CloseHandle, INVALID_HANDLE_VALUE},
        System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, PROCESSENTRY32W, Process32FirstW, Process32NextW,
            TH32CS_SNAPPROCESS,
        },
    };
    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) };
    if snapshot == INVALID_HANDLE_VALUE {
        return Err(HostError::Permission("peer_ancestry_snapshot".into()));
    }
    let mut parents = HashMap::new();
    let mut entry: PROCESSENTRY32W = unsafe { std::mem::zeroed() };
    entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
    let mut ok = unsafe { Process32FirstW(snapshot, &mut entry) };
    while ok != 0 {
        parents.insert(entry.th32ProcessID, entry.th32ParentProcessID);
        ok = unsafe { Process32NextW(snapshot, &mut entry) }
    }
    unsafe { CloseHandle(snapshot) };
    let mut result = Vec::new();
    let mut current = process_id;
    let mut seen = HashSet::new();
    for _ in 0..16 {
        let Some(parent) = parents.get(&current).copied() else {
            break;
        };
        if parent == 0 || parent == current || !seen.insert(parent) {
            break;
        }
        let process = match ProcessHandle::open(parent) {
            Ok(value) => value,
            Err(_) => break,
        };
        let executable_path = match process.image() {
            Ok(value) => value,
            Err(_) => break,
        };
        result.push(ProcessIdentity {
            process_id: parent,
            executable_path,
        });
        current = parent;
    }
    Ok(result)
}

struct ProcessHandle(windows_sys::Win32::Foundation::HANDLE);
impl ProcessHandle {
    fn open(pid: u32) -> HostResult<Self> {
        use windows_sys::Win32::System::Threading::{
            OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
        };
        let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
        if handle.is_null() {
            Err(HostError::Permission("peer_open".into()))
        } else {
            Ok(Self(handle))
        }
    }
    fn image(&self) -> HostResult<std::path::PathBuf> {
        use windows_sys::Win32::System::Threading::QueryFullProcessImageNameW;
        let mut image = vec![0u16; 32768];
        let mut length = image.len() as u32;
        if unsafe { QueryFullProcessImageNameW(self.0, 0, image.as_mut_ptr(), &mut length) } == 0 {
            return Err(HostError::Permission("peer_image".into()));
        }
        image.truncate(length as usize);
        Ok(std::path::PathBuf::from(
            String::from_utf16(&image)
                .map_err(|_| HostError::Permission("peer_image_utf16".into()))?,
        ))
    }
}
impl Drop for ProcessHandle {
    fn drop(&mut self) {
        unsafe { windows_sys::Win32::Foundation::CloseHandle(self.0) };
    }
}
