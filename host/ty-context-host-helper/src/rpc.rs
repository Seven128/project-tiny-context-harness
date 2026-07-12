use crate::{HostError, HostResult};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::io::{Read, Write};
use uuid::Uuid;

pub const PROTOCOL: &str = "ty-context-host-rpc-v1";
pub const MAX_FRAME_BYTES: usize = 1024 * 1024;
pub const NORMAL_METHODS: &[&str] = &[
    "health",
    "record_managed_heartbeat",
    "reserve_authority",
    "compile_and_seal",
    "get_active",
    "verify",
    "final_gate",
    "handle_hook_event",
];

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Request {
    pub protocol: String,
    pub request_id: Uuid,
    pub method: String,
    pub repository_hint: String,
    pub client_nonce: String,
    pub params: Value,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Response {
    pub protocol: String,
    pub request_id: Uuid,
    pub ok: bool,
    pub code: String,
    pub retryable: bool,
    pub result: Value,
    pub error: Option<String>,
    pub attestation: Value,
}

pub fn read_frame<R: Read>(reader: &mut R) -> HostResult<Value> {
    let mut header = [0u8; 4];
    reader
        .read_exact(&mut header)
        .map_err(|error| HostError::RpcFrame(format!("header:{error}")))?;
    let length = u32::from_be_bytes(header) as usize;
    if length > MAX_FRAME_BYTES {
        return Err(HostError::RpcFrame("too_large".into()));
    }
    let mut payload = vec![0u8; length];
    reader
        .read_exact(&mut payload)
        .map_err(|error| HostError::RpcFrame(format!("payload:{error}")))?;
    let value: Value = serde_json::from_slice(&payload)
        .map_err(|error| HostError::RpcFrame(format!("json:{error}")))?;
    if canonical_bytes(&value)? != payload {
        return Err(HostError::RpcFrame("noncanonical_json".into()));
    }
    Ok(value)
}

pub fn write_frame<W: Write>(writer: &mut W, value: &Value) -> HostResult<()> {
    let payload = canonical_bytes(value)?;
    if payload.len() > MAX_FRAME_BYTES {
        return Err(HostError::RpcFrame("too_large".into()));
    }
    writer
        .write_all(&(payload.len() as u32).to_be_bytes())
        .map_err(|error| HostError::RpcFrame(format!("write_header:{error}")))?;
    writer
        .write_all(&payload)
        .map_err(|error| HostError::RpcFrame(format!("write_payload:{error}")))?;
    writer
        .flush()
        .map_err(|error| HostError::RpcFrame(format!("flush:{error}")))
}

pub fn parse_request(value: Value) -> HostResult<Request> {
    let request: Request =
        serde_json::from_value(value).map_err(|error| HostError::RpcRequest(error.to_string()))?;
    if request.protocol != PROTOCOL {
        return Err(HostError::RpcRequest("protocol".into()));
    }
    if request.request_id.get_version_num() != 4 {
        return Err(HostError::RpcRequest("request_id".into()));
    }
    if !NORMAL_METHODS.contains(&request.method.as_str()) {
        return Err(HostError::RpcRequest("method".into()));
    }
    if !request.params.is_object() {
        return Err(HostError::RpcRequest("params".into()));
    }
    if URL_SAFE_NO_PAD
        .decode(&request.client_nonce)
        .map_err(|_| HostError::RpcRequest("client_nonce".into()))?
        .len()
        != 32
    {
        return Err(HostError::RpcRequest("client_nonce".into()));
    }
    Ok(request)
}

pub fn canonical_bytes(value: &Value) -> HostResult<Vec<u8>> {
    serde_json::to_vec(&canonical(value))
        .map_err(|error| HostError::Internal(format!("canonical_json:{error}")))
}

fn canonical(value: &Value) -> Value {
    match value {
        Value::Object(input) => {
            let mut keys: Vec<_> = input.keys().collect();
            keys.sort();
            let mut output = Map::new();
            for key in keys {
                output.insert(key.clone(), canonical(&input[key]));
            }
            Value::Object(output)
        }
        Value::Array(items) => Value::Array(items.iter().map(canonical).collect()),
        _ => value.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn canonical_frame_round_trip() {
        let value = json!({"z": 2, "a": {"y": true, "b": 1}});
        let mut frame = Vec::new();
        write_frame(&mut frame, &value).unwrap();
        assert_eq!(read_frame(&mut frame.as_slice()).unwrap(), value);
    }

    #[test]
    fn rejects_noncanonical_and_oversized_frames() {
        let payload = br#"{"a": 1}"#;
        let mut frame = (payload.len() as u32).to_be_bytes().to_vec();
        frame.extend(payload);
        assert!(matches!(
            read_frame(&mut frame.as_slice()),
            Err(HostError::RpcFrame(_))
        ));
        let oversized = ((MAX_FRAME_BYTES + 1) as u32).to_be_bytes().to_vec();
        assert!(matches!(
            read_frame(&mut oversized.as_slice()),
            Err(HostError::RpcFrame(_))
        ));
    }
}
