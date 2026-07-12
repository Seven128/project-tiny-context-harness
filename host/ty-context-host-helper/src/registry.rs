use crate::{
    HostError, HostResult,
    attestation::HostKeys,
    identity,
    journal::{Journal, JournalWrite},
    rpc::canonical_bytes,
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

pub struct Registry {
    state_root: PathBuf,
    keys: HostKeys,
    journal: Journal,
}

impl Registry {
    pub fn open(state_root: &Path) -> HostResult<Self> {
        for relative in [
            "keys",
            "registry/active",
            "registry/tombstones",
            "journal",
            "bundles",
            "dependencies",
            "browsers",
            "staging",
            "quarantine",
            "audit/health-probes",
            "heartbeats",
        ] {
            fs::create_dir_all(state_root.join(relative))
                .map_err(|error| HostError::io(state_root.join(relative), error))?;
        }
        Ok(Self {
            state_root: state_root.to_path_buf(),
            keys: HostKeys::load_or_create(state_root)?,
            journal: Journal::new(state_root)?,
        })
    }
    pub fn active_for_repository(&self, repository: &Path) -> HostResult<Option<Value>> {
        let (hash, shard) = repository_locator(repository)?;
        self.active_for_locator(&hash, &shard)
    }
    fn active_for_locator(&self, hash: &str, shard: &str) -> HostResult<Option<Value>> {
        let shard_root = self.state_root.join("repositories").join(shard);
        let relative = format!("registry/active/by-repository/{hash}.json");
        crate::registry_integrity::verify_shard_targets(
            &shard_root,
            &[relative.as_str()],
            &self.keys,
        )?;
        let file = shard_root.join(&relative);
        if !file.exists() {
            return Ok(None);
        }
        let value: Value =
            serde_json::from_slice(&fs::read(&file).map_err(|error| HostError::io(&file, error))?)
                .map_err(|error| HostError::Integrity(format!("active_json:{error}")))?;
        self.keys.verify_object(&value)?;
        Ok(Some(value))
    }
    pub fn reservation_for_repository(&self, repository: &Path) -> HostResult<Option<Value>> {
        let (hash, shard) = repository_locator(repository)?;
        self.reservation_for_locator(&hash, &shard)
    }
    fn reservation_for_locator(&self, hash: &str, shard: &str) -> HostResult<Option<Value>> {
        let shard_root = self.state_root.join("repositories").join(shard);
        let relative = format!("registry/reservations/by-repository/{hash}.json");
        crate::registry_integrity::verify_shard_targets(
            &shard_root,
            &[relative.as_str()],
            &self.keys,
        )?;
        let file = shard_root.join(&relative);
        if !file.exists() {
            return Ok(None);
        }
        let value: Value =
            serde_json::from_slice(&fs::read(&file).map_err(|error| HostError::io(&file, error))?)
                .map_err(|error| HostError::Integrity(format!("reservation_json:{error}")))?;
        self.keys.verify_object(&value)?;
        Ok(Some(value))
    }
    pub fn health_state_for_repository(
        &self,
        repository: &Path,
    ) -> HostResult<(Option<Value>, Option<Value>, Option<Value>)> {
        let (hash, shard) = repository_locator(repository)?;
        let heartbeat = self.heartbeat_for_hash(&hash)?;
        let active = self.active_for_locator(&hash, &shard)?;
        let reservation = self.reservation_for_locator(&hash, &shard)?;
        Ok((heartbeat, active, reservation))
    }
    pub fn record_heartbeat(
        &self,
        repository: &Path,
        event: &str,
        process_id: u32,
        thread_id: &str,
        turn_id: &str,
    ) -> HostResult<Value> {
        let (hash, _) = repository_locator(repository)?;
        self.record_heartbeat_for_hash(&hash, event, process_id, thread_id, turn_id)
    }
    pub fn record_heartbeat_and_read_active(
        &self,
        repository: &Path,
        event: &str,
        process_id: u32,
        thread_id: &str,
        turn_id: &str,
    ) -> HostResult<(Value, Option<Value>)> {
        let (hash, shard) = repository_locator(repository)?;
        let heartbeat =
            self.record_heartbeat_for_hash(&hash, event, process_id, thread_id, turn_id)?;
        Ok((heartbeat, self.active_for_locator(&hash, &shard)?))
    }
    fn record_heartbeat_for_hash(
        &self,
        hash: &str,
        event: &str,
        process_id: u32,
        thread_id: &str,
        turn_id: &str,
    ) -> HostResult<Value> {
        if !["SessionStart", "PostCompact", "Stop"].contains(&event) {
            return Err(HostError::RpcRequest("heartbeat_event".into()));
        }
        let record = self.keys.sign_object(&json!({"schema_version":"ty-context-managed-heartbeat-v1","repository_identity_hash":hash,"event":event,"process_id":process_id,"thread_id":thread_id,"turn_id":turn_id,"observed_at_unix_ms":unix_ms()}))?;
        let relative = format!("heartbeats/{hash}.json");
        let transaction = self.journal.commit(
            &self.keys,
            "record_managed_heartbeat",
            vec![JournalWrite {
                path: relative.clone(),
                content: Some(
                    String::from_utf8(canonical_bytes(&record)?)
                        .map_err(|_| HostError::Internal("heartbeat_utf8".into()))?,
                ),
            }],
        )?;
        let file = self.state_root.join(relative);
        atomic_replace(&file, &canonical_bytes(&record)?)?;
        self.journal.mark_applied(&self.keys, &transaction)?;
        Ok(record)
    }
    pub fn heartbeat_for_repository(&self, repository: &Path) -> HostResult<Option<Value>> {
        let (_, hash) = identity::repository(repository)?;
        self.heartbeat_for_hash(&hash)
    }
    fn heartbeat_for_hash(&self, hash: &str) -> HostResult<Option<Value>> {
        let file = self
            .state_root
            .join("heartbeats")
            .join(format!("{hash}.json"));
        if !file.exists() {
            return Ok(None);
        }
        let value: Value =
            serde_json::from_slice(&fs::read(&file).map_err(|error| HostError::io(&file, error))?)
                .map_err(|error| HostError::Integrity(format!("heartbeat_json:{error}")))?;
        self.keys.verify_object(&value)?;
        Ok(Some(value))
    }
    pub fn public_key_pem(&self) -> HostResult<String> {
        self.keys.public_pem()
    }
    pub fn key_id(&self) -> &str {
        &self.keys.key_id
    }
    pub fn sign(&self, value: &Value) -> HostResult<Value> {
        self.keys.sign_object(value)
    }
    pub fn verify_journal(&self) -> HostResult<usize> {
        Ok(self.journal.verify(&self.keys)?.len())
    }
    pub fn durability_probe(&self) -> HostResult<bool> {
        let id = uuid::Uuid::new_v4();
        let file = self
            .state_root
            .join("audit/health-probes")
            .join(format!("{id}.json"));
        let record = self.keys.sign_object(&json!({
            "schema_version":"ty-context-host-durability-probe-v1",
            "probe_id":id,
            "observed_at_unix_ms":unix_ms()
        }))?;
        atomic_replace(&file, &canonical_bytes(&record)?)?;
        let reread: Value =
            serde_json::from_slice(&fs::read(&file).map_err(|error| HostError::io(&file, error))?)
                .map_err(|error| HostError::Integrity(format!("durability_probe_json:{error}")))?;
        self.keys.verify_object(&reread)?;
        fs::remove_file(&file).map_err(|error| HostError::io(&file, error))?;
        Ok(true)
    }
}

fn repository_locator(repository: &Path) -> HostResult<(String, String)> {
    let (repository_identity, hash) = identity::repository(repository)?;
    let shard = hex::encode(Sha256::digest(
        repository_identity.canonical_path.as_bytes(),
    ));
    Ok((hash, shard))
}

fn atomic_replace(path: &Path, bytes: &[u8]) -> HostResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| HostError::io(parent, error))?;
    }
    let temp = path.with_extension(format!("tmp-{}", uuid::Uuid::new_v4()));
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temp)
        .map_err(|error| HostError::io(&temp, error))?;
    file.write_all(bytes)
        .map_err(|error| HostError::io(&temp, error))?;
    file.sync_all()
        .map_err(|error| HostError::io(&temp, error))?;
    fs::rename(&temp, path).map_err(|error| HostError::io(path, error))
}
fn unix_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}
