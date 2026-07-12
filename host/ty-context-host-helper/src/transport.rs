use crate::HostResult;
use std::{
    io::{Read, Write},
    path::PathBuf,
    sync::{Arc, atomic::AtomicBool},
};

#[derive(Clone, Debug)]
pub struct ProcessIdentity {
    pub process_id: u32,
    pub executable_path: PathBuf,
}

#[derive(Clone, Debug)]
pub struct PeerIdentity {
    pub process_id: u32,
    pub executable_path: PathBuf,
    pub command_line: Vec<String>,
    pub ancestors: Vec<ProcessIdentity>,
}

pub trait HostStream: Read + Write + Send {}
impl<T: Read + Write + Send> HostStream for T {}
pub type Handler = Arc<dyn Fn(Box<dyn HostStream>, PeerIdentity) + Send + Sync>;

pub(crate) fn stopped(stop: &Option<Arc<AtomicBool>>) -> bool {
    stop.as_ref()
        .is_some_and(|value| value.load(std::sync::atomic::Ordering::Acquire))
}
#[cfg(windows)]
pub(crate) fn debug(args: std::fmt::Arguments<'_>) {
    if std::env::var_os("TY_CONTEXT_HOST_MAINTAINER_DEBUG").as_deref()
        == Some(std::ffi::OsStr::new("1"))
    {
        eprintln!("{args}");
    }
}

pub fn serve(endpoint: &str, handler: Handler) -> HostResult<()> {
    serve_controlled(endpoint, handler, None, None)
}

#[cfg(windows)]
pub fn serve_controlled(
    endpoint: &str,
    handler: Handler,
    stop: Option<Arc<AtomicBool>>,
    ready: Option<Box<dyn FnOnce() + Send>>,
) -> HostResult<()> {
    crate::transport_windows::serve(endpoint, handler, stop, ready)
}

#[cfg(unix)]
pub fn serve_controlled(
    endpoint: &str,
    handler: Handler,
    stop: Option<Arc<AtomicBool>>,
    ready: Option<Box<dyn FnOnce() + Send>>,
) -> HostResult<()> {
    crate::transport_unix::serve(endpoint, handler, stop, ready)
}
