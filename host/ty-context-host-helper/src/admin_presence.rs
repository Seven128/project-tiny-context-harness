use crate::{HostError, HostResult, rpc::canonical_bytes};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{fs, io::Write, path::Path};

pub fn issue(state_root: &Path, lifetime_ms: u64) -> HostResult<String> {
    if !(60_000..=10 * 60_000).contains(&lifetime_ms) {
        return Err(HostError::Usage("presence lifetime".into()));
    }
    let mut random = [0u8; 32];
    getrandom::fill(&mut random).map_err(|error| HostError::Internal(format!("random:{error}")))?;
    let token = URL_SAFE_NO_PAD.encode(random);
    let digest = hash(&token);
    let record = json!({"schema_version":"ty-context-host-local-presence-v1","token_sha256":digest,"issued_at_unix_ms":unix_ms(),"expires_at_unix_ms":unix_ms()+u128::from(lifetime_ms)});
    let directory = state_root.join("admin/presence");
    fs::create_dir_all(&directory).map_err(|error| HostError::io(&directory, error))?;
    create(
        &directory.join(format!("{digest}.json")),
        &canonical_bytes(&record)?,
    )?;
    Ok(token)
}

pub fn consume(state_root: &Path, token: &str) -> HostResult<()> {
    if !matches!(token.len(), 43 | 44)
        || !token
            .bytes()
            .all(|value| value.is_ascii_alphanumeric() || value == b'_' || value == b'-')
    {
        return Err(HostError::Permission("admin_local_presence".into()));
    }
    let digest = hash(token);
    let file = state_root
        .join("admin/presence")
        .join(format!("{digest}.json"));
    let bytes =
        fs::read(&file).map_err(|_| HostError::Permission("admin_local_presence".into()))?;
    let value: Value = serde_json::from_slice(&bytes)
        .map_err(|_| HostError::Permission("admin_local_presence".into()))?;
    if canonical_bytes(&value)? != bytes
        || value["schema_version"] != "ty-context-host-local-presence-v1"
        || value["token_sha256"].as_str() != Some(&digest)
        || value["expires_at_unix_ms"]
            .as_u64()
            .map(u128::from)
            .is_none_or(|expiry| expiry < unix_ms())
    {
        return Err(HostError::Permission("admin_local_presence".into()));
    }
    let consumed = state_root.join("audit/consumed-presence");
    fs::create_dir_all(&consumed).map_err(|error| HostError::io(&consumed, error))?;
    fs::rename(
        &file,
        consumed.join(format!("{}-{digest}.json", uuid::Uuid::now_v7())),
    )
    .map_err(|_| HostError::Permission("admin_local_presence".into()))
}

fn hash(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}
fn create(path: &Path, bytes: &[u8]) -> HostResult<()> {
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|error| HostError::io(path, error))?;
    file.write_all(bytes)
        .map_err(|error| HostError::io(path, error))?;
    file.sync_all().map_err(|error| HostError::io(path, error))
}
fn unix_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn local_presence_token_is_one_time() {
        let root =
            std::env::temp_dir().join(format!("ty-context-presence-test-{}", uuid::Uuid::new_v4()));
        let token = issue(&root, 60_000).unwrap();
        consume(&root, &token).unwrap();
        assert!(consume(&root, &token).is_err());
        fs::remove_dir_all(root).unwrap();
    }
}
