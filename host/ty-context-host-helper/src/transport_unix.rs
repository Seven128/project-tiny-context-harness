use crate::{
    HostError, HostResult,
    transport::{Handler, PeerIdentity, stopped},
};
use std::{
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
        os::unix::{fs::PermissionsExt, net::UnixListener},
        path::Path,
    };
    let path = Path::new(endpoint);
    if path.exists() {
        std::fs::remove_file(path).map_err(|error| HostError::io(path, error))?;
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| HostError::io(parent, error))?;
    }
    let listener = UnixListener::bind(path).map_err(|error| HostError::io(path, error))?;
    let socket_mode = if cfg!(target_os = "macos") {
        0o666
    } else {
        0o660
    };
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(socket_mode))
        .map_err(|error| HostError::io(path, error))?;
    listener
        .set_nonblocking(stop.is_some())
        .map_err(|error| HostError::io(path, error))?;
    if let Some(signal) = ready.take() {
        signal();
    }
    loop {
        if stopped(&stop) {
            return Ok(());
        }
        match listener.accept() {
            Ok((stream, _)) => {
                let peer = peer(&stream)?;
                let current = handler.clone();
                thread::spawn(move || current(Box::new(stream), peer));
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(std::time::Duration::from_millis(25))
            }
            Err(error) => return Err(HostError::io(path, error)),
        }
    }
}

#[cfg(target_os = "linux")]
fn peer(stream: &std::os::unix::net::UnixStream) -> HostResult<PeerIdentity> {
    crate::transport_linux::peer(stream)
}
#[cfg(target_os = "macos")]
fn peer(stream: &std::os::unix::net::UnixStream) -> HostResult<PeerIdentity> {
    crate::transport_macos::peer(stream)
}
