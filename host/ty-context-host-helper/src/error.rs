use std::{io, path::PathBuf};
use thiserror::Error;

pub type HostResult<T> = Result<T, HostError>;

#[derive(Debug, Error)]
pub enum HostError {
    #[error("usage:{0}")]
    Usage(String),
    #[error("host_io:{path}:{source}")]
    Io {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("host_rpc_frame_invalid:{0}")]
    RpcFrame(String),
    #[error("host_rpc_request_invalid:{0}")]
    RpcRequest(String),
    #[error("host_registry_integrity_failure:{0}")]
    Integrity(String),
    #[error("host_configuration_invalid:{0}")]
    Configuration(String),
    #[error("host_permission_denied:{0}")]
    Permission(String),
    #[error("sandbox_capability_unavailable:{0}")]
    Sandbox(String),
    #[error("host_internal_error:{0}")]
    Internal(String),
    #[error("host_worker_error:{0}")]
    Worker(String),
}

impl HostError {
    pub fn io(path: impl Into<PathBuf>, source: io::Error) -> Self {
        Self::Io {
            path: path.into(),
            source,
        }
    }
    pub fn public_code(&self) -> &str {
        match self {
            Self::Usage(_) => "host_usage_invalid",
            Self::Io { .. } => "host_io_failure",
            Self::RpcFrame(_) => "host_rpc_frame_invalid",
            Self::RpcRequest(_) => "host_rpc_request_invalid",
            Self::Integrity(_) => "host_registry_integrity_failure",
            Self::Configuration(_) => "host_completion_gate_unavailable",
            Self::Permission(_) => "host_peer_not_authorized",
            Self::Sandbox(_) => "sandbox_capability_unavailable",
            Self::Internal(_) => "host_internal_error",
            Self::Worker(code) => code,
        }
    }
    pub fn public_detail_code(&self) -> Option<&str> {
        let detail = match self {
            Self::Sandbox(detail) => detail.split(':').next(),
            _ => None,
        }?;
        if !detail.is_empty()
            && detail
                .bytes()
                .all(|value| value.is_ascii_alphanumeric() || value == b'_')
        {
            Some(detail)
        } else {
            None
        }
    }
}
