use crate::{
    HostError, HostResult,
    transport::{PeerIdentity, ProcessIdentity},
};
use std::collections::HashSet;

pub fn peer(stream: &std::os::unix::net::UnixStream) -> HostResult<PeerIdentity> {
    use std::os::fd::AsRawFd;
    let mut credential = libc::ucred {
        pid: 0,
        uid: 0,
        gid: 0,
    };
    let mut length = std::mem::size_of::<libc::ucred>() as libc::socklen_t;
    if unsafe {
        libc::getsockopt(
            stream.as_raw_fd(),
            libc::SOL_SOCKET,
            libc::SO_PEERCRED,
            (&mut credential as *mut libc::ucred).cast(),
            &mut length,
        )
    } != 0
        || credential.pid <= 0
    {
        return Err(HostError::Permission("peer_credentials".into()));
    }
    let process_id = credential.pid as u32;
    let executable_path = std::fs::read_link(format!("/proc/{process_id}/exe"))
        .map_err(|error| HostError::io("peer_executable", error))?;
    let bytes = std::fs::read(format!("/proc/{process_id}/cmdline"))
        .map_err(|error| HostError::io("peer_command", error))?;
    let command_line = bytes
        .split(|value| *value == 0)
        .filter(|value| !value.is_empty())
        .map(|value| {
            String::from_utf8(value.to_vec())
                .map_err(|_| HostError::Permission("peer_command_utf8".into()))
        })
        .collect::<HostResult<Vec<_>>>()?;
    if command_line.is_empty() {
        return Err(HostError::Permission("peer_command_empty".into()));
    }
    Ok(PeerIdentity {
        process_id,
        user_id: Some(credential.uid),
        group_id: Some(credential.gid),
        executable_path,
        command_line,
        ancestors: ancestors(process_id)?,
    })
}

fn ancestors(process_id: u32) -> HostResult<Vec<ProcessIdentity>> {
    let mut result = Vec::new();
    let mut current = process_id;
    let mut seen = HashSet::new();
    for _ in 0..16 {
        let stat = std::fs::read_to_string(format!("/proc/{current}/stat"))
            .map_err(|error| HostError::io("peer_ancestor_stat", error))?;
        let end = stat
            .rfind(')')
            .ok_or_else(|| HostError::Permission("peer_ancestor_stat".into()))?;
        let parent = stat[end + 1..]
            .split_whitespace()
            .nth(1)
            .and_then(|value| value.parse::<u32>().ok())
            .ok_or_else(|| HostError::Permission("peer_ancestor_parent".into()))?;
        if parent == 0 || parent == current || !seen.insert(parent) {
            break;
        }
        let executable_path = match std::fs::read_link(format!("/proc/{parent}/exe")) {
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
