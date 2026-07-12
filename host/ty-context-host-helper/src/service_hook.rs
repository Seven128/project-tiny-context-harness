use crate::{
    HostError, HostResult,
    hook_smoke::Scenario,
    rpc::Request,
    service::Service,
    service_config::{file_hash, same_path},
    transport::PeerIdentity,
};
use serde_json::{Value, json};
use std::{fs, path::Path};

impl Service {
    pub(crate) fn authorize(&self, request: &Request, peer: &PeerIdentity) -> HostResult<()> {
        if self.config.test_namespace {
            return Ok(());
        }
        if peer.process_id == 0 || peer.command_line.len() < 2 {
            return Err(HostError::Permission("peer_identity".into()));
        }
        if !same_path(&peer.executable_path, &self.config.node_path)
            || !same_path(Path::new(&peer.command_line[0]), &self.config.node_path)
        {
            return Err(HostError::Permission("peer_node_identity".into()));
        }
        let hook = matches!(
            request.method.as_str(),
            "handle_hook_event" | "record_managed_heartbeat"
        );
        let (expected_path, expected_hash, code) = if hook {
            (
                &self.config.hook_path,
                &self.config.hook_sha256,
                "hook_peer_identity",
            )
        } else {
            (
                &self.config.cli_path,
                &self.config.cli_sha256,
                "cli_peer_identity",
            )
        };
        if !same_path(Path::new(&peer.command_line[1]), expected_path)
            || file_hash(expected_path)? != *expected_hash
        {
            return Err(HostError::Permission(code.into()));
        }
        if hook {
            let parent = peer
                .ancestors
                .first()
                .ok_or_else(|| HostError::Permission("hook_origin_missing".into()))?;
            let smoke = request
                .params
                .get("host_smoke_token")
                .and_then(Value::as_str)
                .is_some();
            let expected = if smoke {
                &self.config.helper_path
            } else {
                &self.config.codex_launcher_path
            };
            if !same_path(&parent.executable_path, expected) {
                return Err(HostError::Permission("hook_origin_identity".into()));
            }
        }
        Ok(())
    }

    pub(crate) fn record_heartbeat(
        &self,
        request: &Request,
        peer: &PeerIdentity,
    ) -> HostResult<Value> {
        let event = string(&request.params, "hook_event_name")?;
        let thread = string(&request.params, "thread_id")?;
        let turn = string(&request.params, "turn_id")?;
        self.registry.record_heartbeat(
            Path::new(&request.repository_hint),
            event,
            self.hook_origin_process_id(peer),
            thread,
            turn,
        )
    }

    pub(crate) fn handle_hook(&self, request: &Request, peer: &PeerIdentity) -> HostResult<Value> {
        let event = string(&request.params, "hook_event_name")?;
        let thread = string(&request.params, "thread_id")?;
        let turn = string(&request.params, "turn_id")?;
        if let Some(token) = request
            .params
            .get("host_smoke_token")
            .and_then(Value::as_str)
        {
            if !self.config.test_namespace
                && !crate::hook_smoke::parent_is_helper(peer, &self.config)
            {
                return Err(HostError::Permission("hook_smoke_origin".into()));
            }
            return match self.hook_smokes.consume(token)? {
                Scenario::NoActive if event == "SessionStart" => Ok(json!({})),
                Scenario::SyntheticActive if event == "Stop" => Ok(needs_work_stop_result()),
                _ => Err(HostError::RpcRequest("hook_smoke_scenario".into())),
            };
        }
        let (_, active) = self.registry.record_heartbeat_and_read_active(
            Path::new(&request.repository_hint),
            event,
            self.hook_origin_process_id(peer),
            thread,
            turn,
        )?;
        let Some(active) = active else {
            return Ok(json!({}));
        };
        if event == "SessionStart" || event == "PostCompact" {
            return Ok(session_context(event, &active));
        }
        self.run_worker(request)
    }

    fn hook_origin_process_id(&self, peer: &PeerIdentity) -> u32 {
        if self.config.test_namespace {
            peer.process_id
        } else {
            peer.ancestors
                .first()
                .map_or(peer.process_id, |parent| parent.process_id)
        }
    }
}

pub(crate) fn needs_work_stop_result() -> Value {
    json!({"decision":"block","reason":"host_completion_gate_unavailable: trusted managed worker must recompute the active task"})
}
fn string<'a>(value: &'a Value, key: &str) -> HostResult<&'a str> {
    value
        .get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| HostError::RpcRequest(format!("missing:{key}")))
}

fn session_context(event: &str, active: &Value) -> Value {
    let registry = active["registry_id"].as_str().unwrap_or("unknown");
    let contract = active["contract_sha256"].as_str().unwrap_or("unknown");
    let state = active["state"].as_str().unwrap_or("sealed");
    let workdir = active["workdir_identity"]["canonical_path"]
        .as_str()
        .unwrap_or("");
    let status = read_session_status(workdir);
    let findings = status
        .as_ref()
        .and_then(|value| value["findings"].as_array())
        .map(|items| {
            items
                .iter()
                .take(3)
                .filter_map(|item| {
                    item["category"]
                        .as_str()
                        .or_else(|| item["next_action"].as_str())
                })
                .map(safe_context)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let internal = status
        .as_ref()
        .and_then(|value| value["workflow_status"].as_str())
        .unwrap_or(state);
    let command = if workdir.contains(char::is_whitespace) {
        format!("ty-context composite-long-task verify {workdir:?}")
    } else {
        format!("ty-context composite-long-task verify {workdir}")
    };
    let findings = if findings.is_empty() {
        "none".into()
    } else {
        findings.join(", ")
    };
    json!({"hookSpecificOutput":{"hookEventName":event,"additionalContext":format!("Composite registry {registry}; contract {contract}; internal status {internal}; first findings: {findings}. Next command: {command}. needs_work is internal and must never be reported as a terminal outcome.")}})
}
fn read_session_status(workdir: &str) -> Option<Value> {
    if workdir.is_empty() {
        return None;
    }
    let bytes = fs::read(Path::new(workdir).join("current-status.json")).ok()?;
    if bytes.len() > 64 * 1024 {
        return None;
    }
    serde_json::from_slice(&bytes).ok()
}
fn safe_context(value: &str) -> String {
    value
        .chars()
        .filter(|value| !value.is_control())
        .take(200)
        .collect()
}
