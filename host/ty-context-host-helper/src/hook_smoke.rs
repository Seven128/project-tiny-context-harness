use crate::{HostError, HostResult, service::ServiceConfig};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use serde_json::{Value, json};
use std::{
    collections::HashMap,
    fs,
    io::{Read, Write},
    path::Path,
    process::{Command, Stdio},
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Scenario {
    NoActive,
    SyntheticActive,
}

#[derive(Default)]
pub struct HookSmokes {
    pending: Mutex<HashMap<String, (Scenario, Instant)>>,
}

impl HookSmokes {
    pub fn run(
        &self,
        config: &ServiceConfig,
        repository: &Path,
        scenario: Scenario,
    ) -> HostResult<Value> {
        let token = token()?;
        self.pending
            .lock()
            .map_err(|_| HostError::Internal("hook_smoke_lock".into()))?
            .insert(
                token.clone(),
                (scenario, Instant::now() + Duration::from_secs(15)),
            );
        let event = if scenario == Scenario::NoActive {
            "SessionStart"
        } else {
            "Stop"
        };
        let input = json!({
            "hook_event_name":event,
            "session_id":"host-health-smoke",
            "turn_id":format!("host-health-{}", uuid::Uuid::new_v4()),
            "cwd":repository,
            "source":if event == "SessionStart" { Value::String("startup".into()) } else { Value::Null },
            "stop_hook_active":scenario == Scenario::SyntheticActive,
            "last_assistant_message":if scenario == Scenario::SyntheticActive { Value::String("done".into()) } else { Value::Null }
        });
        let result = run_adapter(config, &token, &input);
        self.pending
            .lock()
            .map_err(|_| HostError::Internal("hook_smoke_lock".into()))?
            .remove(&token);
        result
    }

    pub fn consume(&self, token: &str) -> HostResult<Scenario> {
        let mut pending = self
            .pending
            .lock()
            .map_err(|_| HostError::Internal("hook_smoke_lock".into()))?;
        pending.retain(|_, (_, expiry)| *expiry > Instant::now());
        let (scenario, expiry) = pending
            .remove(token)
            .ok_or_else(|| HostError::Permission("hook_smoke_token".into()))?;
        if expiry <= Instant::now() {
            return Err(HostError::Permission("hook_smoke_expired".into()));
        }
        Ok(scenario)
    }
}

fn run_adapter(config: &ServiceConfig, token: &str, input: &Value) -> HostResult<Value> {
    let mut command = Command::new(&config.node_path);
    command
        .arg(&config.hook_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env("TY_CONTEXT_HOST_SMOKE_TOKEN", token);
    let mut child = command
        .spawn()
        .map_err(|error| HostError::io(&config.node_path, error))?;
    let bytes = crate::rpc::canonical_bytes(input)?;
    child
        .stdin
        .take()
        .ok_or_else(|| HostError::Internal("hook_smoke_stdin".into()))?
        .write_all(&bytes)
        .map_err(|error| HostError::io("hook_smoke_stdin", error))?;
    let deadline = Instant::now() + Duration::from_secs(15);
    loop {
        if let Some(status) = child
            .try_wait()
            .map_err(|error| HostError::io(&config.hook_path, error))?
        {
            let mut stdout = Vec::new();
            child
                .stdout
                .take()
                .ok_or_else(|| HostError::Internal("hook_smoke_stdout".into()))?
                .take(1024 * 1024 + 1)
                .read_to_end(&mut stdout)
                .map_err(|error| HostError::io("hook_smoke_stdout", error))?;
            if std::env::var_os("TY_CONTEXT_HOST_MAINTAINER_DEBUG").as_deref()
                == Some(std::ffi::OsStr::new("1"))
            {
                eprintln!(
                    "managed hook smoke exited {status}: {}",
                    String::from_utf8_lossy(&stdout)
                );
            }
            if !status.success() || stdout.len() > 1024 * 1024 {
                return Err(HostError::Configuration("managed_hook_stop_smoke".into()));
            }
            return serde_json::from_slice(&stdout)
                .map_err(|_| HostError::Configuration("managed_hook_stop_smoke".into()));
        }
        if Instant::now() >= deadline {
            if std::env::var_os("TY_CONTEXT_HOST_MAINTAINER_DEBUG").as_deref()
                == Some(std::ffi::OsStr::new("1"))
            {
                eprintln!(
                    "managed hook smoke timed out for {}",
                    config.hook_path.display()
                );
            }
            let _ = child.kill();
            let _ = child.wait();
            return Err(HostError::Configuration(
                "managed_hook_stop_smoke_timeout".into(),
            ));
        }
        thread::sleep(Duration::from_millis(10));
    }
}

fn token() -> HostResult<String> {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).map_err(|error| HostError::Internal(format!("random:{error}")))?;
    Ok(URL_SAFE_NO_PAD.encode(bytes))
}

pub fn parent_is_helper(peer: &crate::transport::PeerIdentity, config: &ServiceConfig) -> bool {
    peer.ancestors
        .first()
        .is_some_and(|parent| same_path(&parent.executable_path, &config.helper_path))
}

fn same_path(left: &Path, right: &Path) -> bool {
    let (Ok(left), Ok(right)) = (fs::canonicalize(left), fs::canonicalize(right)) else {
        return false;
    };
    if cfg!(windows) {
        left.to_string_lossy()
            .eq_ignore_ascii_case(&right.to_string_lossy())
    } else {
        left == right
    }
}
