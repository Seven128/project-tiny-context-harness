pub mod admin;
pub mod admin_presence;
pub mod admin_runtime;
pub mod attestation;
pub mod cache;
pub mod durable_file;
pub mod error;
pub mod hook_smoke;
pub mod identity;
pub mod installer_ui;
pub mod journal;
pub mod registry;
pub mod registry_admin;
mod registry_admin_gc;
pub mod registry_admin_journal;
mod registry_integrity;
pub mod rpc;
pub mod sandbox;
mod sandbox_io;
mod sandbox_launcher;
#[cfg(all(unix, not(target_os = "macos")))]
mod sandbox_linux;
#[cfg(target_os = "macos")]
mod sandbox_macos;
#[cfg(windows)]
mod sandbox_windows;
#[cfg(windows)]
mod sandbox_windows_acl;
#[cfg(windows)]
mod sandbox_windows_desktop;
#[cfg(windows)]
mod sandbox_windows_handle;
#[cfg(windows)]
mod sandbox_windows_network;
#[cfg(windows)]
mod sandbox_windows_paths;
#[cfg(windows)]
mod sandbox_windows_stdio;
pub mod secret;
pub mod service;
pub mod service_config;
mod service_health;
mod service_hook;
pub mod transport;
#[cfg(target_os = "linux")]
mod transport_linux;
#[cfg(target_os = "macos")]
mod transport_macos;
#[cfg(unix)]
mod transport_unix;
#[cfg(windows)]
mod transport_windows;
#[cfg(windows)]
mod windows_service;
pub mod worker;

pub use error::{HostError, HostResult};
