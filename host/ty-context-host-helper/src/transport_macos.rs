use crate::{
    HostError, HostResult,
    transport::{PeerIdentity, ProcessIdentity},
};
use std::{collections::HashSet, path::PathBuf};

unsafe extern "C" {
    fn proc_pidpath(pid: i32, buffer: *mut core::ffi::c_void, buffersize: u32) -> i32;
    fn proc_pidinfo(
        pid: i32,
        flavor: i32,
        arg: u64,
        buffer: *mut core::ffi::c_void,
        buffersize: i32,
    ) -> i32;
}

pub fn peer(stream: &std::os::unix::net::UnixStream) -> HostResult<PeerIdentity> {
    use std::os::fd::AsRawFd;
    let mut process_id = 0i32;
    let mut length = std::mem::size_of::<i32>() as libc::socklen_t;
    if unsafe {
        libc::getsockopt(
            stream.as_raw_fd(),
            0,
            2,
            (&mut process_id as *mut i32).cast(),
            &mut length,
        )
    } != 0
        || process_id <= 0
    {
        return Err(HostError::Permission("peer_credentials".into()));
    }
    let executable_path = process_path(process_id)?;
    let command_line = command_line(process_id)?;
    Ok(PeerIdentity {
        process_id: process_id as u32,
        executable_path,
        command_line,
        ancestors: ancestors(process_id)?,
    })
}

fn process_path(pid: i32) -> HostResult<PathBuf> {
    let mut buffer = vec![0u8; 4096];
    let count = unsafe { proc_pidpath(pid, buffer.as_mut_ptr().cast(), buffer.len() as u32) };
    if count <= 0 {
        return Err(HostError::Permission("peer_executable".into()));
    }
    buffer.truncate(count as usize);
    Ok(PathBuf::from(String::from_utf8(buffer).map_err(|_| {
        HostError::Permission("peer_executable_utf8".into())
    })?))
}

fn ancestors(process_id: i32) -> HostResult<Vec<ProcessIdentity>> {
    let mut result = Vec::new();
    let mut current = process_id;
    let mut seen = HashSet::new();
    for _ in 0..16 {
        let mut info = [0u8; 256];
        let count =
            unsafe { proc_pidinfo(current, 3, 0, info.as_mut_ptr().cast(), info.len() as i32) };
        if count < 20 {
            break;
        }
        let parent = i32::from_ne_bytes(
            info[16..20]
                .try_into()
                .map_err(|_| HostError::Permission("peer_ancestor_parent".into()))?,
        );
        if parent <= 0 || parent == current || !seen.insert(parent) {
            break;
        }
        let executable_path = match process_path(parent) {
            Ok(value) => value,
            Err(_) => break,
        };
        result.push(ProcessIdentity {
            process_id: parent as u32,
            executable_path,
        });
        current = parent;
    }
    Ok(result)
}

fn command_line(process_id: i32) -> HostResult<Vec<String>> {
    let mut mib = [1, 49, process_id];
    let mut size = 0usize;
    if unsafe {
        libc::sysctl(
            mib.as_mut_ptr(),
            3,
            std::ptr::null_mut(),
            &mut size,
            std::ptr::null_mut(),
            0,
        )
    } != 0
        || size < 4
        || size > 1024 * 1024
    {
        return Err(HostError::Permission("peer_command_size".into()));
    }
    let mut bytes = vec![0u8; size];
    if unsafe {
        libc::sysctl(
            mib.as_mut_ptr(),
            3,
            bytes.as_mut_ptr().cast(),
            &mut size,
            std::ptr::null_mut(),
            0,
        )
    } != 0
    {
        return Err(HostError::Permission("peer_command".into()));
    }
    bytes.truncate(size);
    let argc = i32::from_ne_bytes(
        bytes[..4]
            .try_into()
            .map_err(|_| HostError::Permission("peer_command".into()))?,
    );
    let mut fields = bytes[4..]
        .split(|value| *value == 0)
        .filter(|value| !value.is_empty());
    let _exec = fields.next();
    let result = fields
        .take(argc.max(0) as usize)
        .map(|value| {
            String::from_utf8(value.to_vec())
                .map_err(|_| HostError::Permission("peer_command_utf8".into()))
        })
        .collect::<HostResult<Vec<_>>>()?;
    if result.is_empty() {
        Err(HostError::Permission("peer_command_empty".into()))
    } else {
        Ok(result)
    }
}
