use crate::{HostError, HostResult, rpc};
use serde::Deserialize;
use serde_json::{Value, json};
use std::{
    fs,
    io::Write,
    path::Path,
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct WorkerResult {
    schema_version: String,
    ok: bool,
    code: String,
    result: Value,
}

pub fn run(
    node: &Path,
    worker: &Path,
    config: &Path,
    state_root: &Path,
    method: &str,
    repository_hint: &str,
    params: &Value,
) -> HostResult<Value> {
    let directory = state_root
        .join("staging")
        .join(format!("host-worker-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&directory).map_err(|error| HostError::io(&directory, error))?;
    let request_path = directory.join("request.json");
    let result_path = directory.join("result.json");
    let request = json!({"schema_version":"ty-context-host-worker-request-v1","method":method,"repository_hint":repository_hint,"params":params});
    write_create(&request_path, &rpc::canonical_bytes(&request)?)?;
    let outcome = run_process(
        node,
        worker,
        config,
        &request_path,
        &result_path,
        timeout(method),
    )
    .and_then(|success| read_result(&result_path, success));
    let _ = fs::remove_dir_all(&directory);
    outcome
}

fn run_process(
    node: &Path,
    worker: &Path,
    config: &Path,
    request: &Path,
    result: &Path,
    timeout: Duration,
) -> HostResult<bool> {
    let mut child = Command::new(node)
        .arg(worker)
        .args(["--config", &config.to_string_lossy()])
        .args(["--request", &request.to_string_lossy()])
        .args(["--result", &result.to_string_lossy()])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| HostError::io(worker, error))?;
    let started = Instant::now();
    loop {
        if let Some(status) = child
            .try_wait()
            .map_err(|error| HostError::io(worker, error))?
        {
            return Ok(status.success());
        }
        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(HostError::Worker("host_worker_timeout".into()));
        }
        thread::sleep(Duration::from_millis(25));
    }
}

fn read_result(path: &Path, process_success: bool) -> HostResult<Value> {
    let bytes = fs::read(path).map_err(|error| HostError::io(path, error))?;
    if bytes.len() > rpc::MAX_FRAME_BYTES {
        return Err(HostError::Worker("host_worker_result_too_large".into()));
    }
    let value: Value = serde_json::from_slice(&bytes)
        .map_err(|_| HostError::Worker("host_worker_result_invalid".into()))?;
    if rpc::canonical_bytes(&value)? != bytes {
        return Err(HostError::Worker("host_worker_result_noncanonical".into()));
    }
    let result: WorkerResult = serde_json::from_value(value)
        .map_err(|_| HostError::Worker("host_worker_result_invalid".into()))?;
    if result.schema_version != "ty-context-host-worker-result-v1"
        || result.code.is_empty()
        || !result
            .code
            .bytes()
            .all(|value| value.is_ascii_alphanumeric() || b"_.-".contains(&value))
    {
        return Err(HostError::Worker("host_worker_result_invalid".into()));
    }
    if !process_success || !result.ok {
        return Err(HostError::Worker(if result.ok {
            "host_worker_exit_mismatch".into()
        } else {
            result.code
        }));
    }
    if result.code != "ok" {
        return Err(HostError::Worker("host_worker_result_invalid".into()));
    }
    Ok(result.result)
}

fn timeout(method: &str) -> Duration {
    match method {
        "reserve_authority" => Duration::from_secs(60),
        "compile_and_seal" => Duration::from_secs(10 * 60),
        "verify" | "final_gate" | "handle_hook_event" => Duration::from_secs(6 * 60 * 60),
        _ => Duration::from_secs(5),
    }
}

fn write_create(path: &Path, bytes: &[u8]) -> HostResult<()> {
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|error| HostError::io(path, error))?;
    file.write_all(bytes)
        .map_err(|error| HostError::io(path, error))?;
    file.sync_all().map_err(|error| HostError::io(path, error))
}
