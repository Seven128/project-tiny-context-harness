use crate::{
    HostError, HostResult,
    attestation::HostKeys,
    durable_file,
    journal::Journal,
    registry_admin_journal::{AdminWrite, ShardJournal},
    rpc::canonical_bytes,
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

pub struct AdminRegistry {
    pub(crate) state_root: PathBuf,
    pub(crate) keys: HostKeys,
    journal: Journal,
}

pub(crate) struct LocatedRegistry {
    pub(crate) root: PathBuf,
    pub(crate) active: bool,
}

impl AdminRegistry {
    pub fn open(state_root: &Path) -> HostResult<Self> {
        Ok(Self {
            state_root: state_root.to_path_buf(),
            keys: HostKeys::load_or_create(state_root)?,
            journal: Journal::new(state_root)?,
        })
    }

    pub fn status(&self) -> HostResult<Value> {
        let mut active = 0;
        let mut reservations = 0;
        let mut tombstones = 0;
        let mut shard_journal_records = 0;
        for root in self.shards()? {
            shard_journal_records += ShardJournal::new(&root, &self.keys).verify()?;
            active += self.verify_directory(&root.join("registry/active/records"))?;
            reservations +=
                self.verify_directory(&root.join("registry/reservations/by-repository"))?;
            tombstones += self.verify_directory(&root.join("registry/tombstones"))?;
        }
        Ok(
            json!({"schema_version":"ty-context-host-admin-status-v1","key_id":self.keys.key_id,"retained_key_ids":self.keys.retained_key_ids()?,"journal_records":self.journal.verify(&self.keys)?.len(),"shard_journal_records":shard_journal_records,"active_registries":active,"reservations":reservations,"tombstones":tombstones}),
        )
    }

    pub fn close(&self, registry_id: &str, reason: &str) -> HostResult<Value> {
        let located = self.locate(registry_id)?;
        if !located.active {
            return Err(HostError::Configuration("admin_registry_not_active".into()));
        }
        let _lock = ShardLock::acquire(&located.root)?;
        ShardJournal::new(&located.root, &self.keys).recover()?;
        let record = read_signed(
            &located
                .root
                .join(format!("registry/active/records/{registry_id}.json")),
            &self.keys,
        )?;
        let repository = field(&record, "repository_identity_hash")?;
        let workdir = field(&record, "workdir_identity_hash")?;
        self.assert_same(
            &located
                .root
                .join(format!("registry/active/by-repository/{repository}.json")),
            &record,
        )?;
        self.assert_same(
            &located
                .root
                .join(format!("registry/active/by-workdir/{workdir}.json")),
            &record,
        )?;
        let tombstone = self.keys.sign_object(&json!({
            "schema_version":"ty-context-host-administrative-tombstone-v1",
            "registry_id":registry_id,
            "repository_identity_hash":repository,
            "workdir_identity_hash":workdir,
            "contract_sha256":field(&record,"contract_sha256")?,
            "reason_sha256":hex::encode(Sha256::digest(reason.as_bytes())),
            "closed_at_unix_ms":unix_ms(),
            "retain_until_unix_ms":unix_ms()+30*24*60*60_000u128
        }))?;
        let content = canonical_string(&tombstone)?;
        ShardJournal::new(&located.root, &self.keys).commit(
            "administrative_close",
            vec![
                AdminWrite {
                    path: format!("registry/tombstones/{registry_id}.json"),
                    content: Some(content),
                },
                AdminWrite {
                    path: format!("registry/active/records/{registry_id}.json"),
                    content: None,
                },
                AdminWrite {
                    path: format!("registry/active/by-repository/{repository}.json"),
                    content: None,
                },
                AdminWrite {
                    path: format!("registry/active/by-workdir/{workdir}.json"),
                    content: None,
                },
            ],
        )?;
        Ok(tombstone)
    }

    pub fn recover_journal(&self, registry_id: &str) -> HostResult<Value> {
        let located = self.locate(registry_id)?;
        let _lock = ShardLock::acquire(&located.root)?;
        let recovered = ShardJournal::new(&located.root, &self.keys).recover()?;
        Ok(
            json!({"schema_version":"ty-context-host-admin-recovery-v1","registry_id":registry_id,"journal_records":recovered}),
        )
    }

    pub fn rotate_key(&mut self, registry_id: &str, public_key_path: &Path) -> HostResult<Value> {
        let _ = self.locate(registry_id)?;
        let old = self.keys.key_id.clone();
        let (_, rotated) = HostKeys::rotate(&self.state_root)?;
        durable_file::replace(public_key_path, rotated.public_pem()?.as_bytes())?;
        let new = rotated.key_id.clone();
        self.keys = rotated;
        Ok(
            json!({"schema_version":"ty-context-host-admin-key-rotation-v1","registry_id":registry_id,"old_key_id":old,"new_key_id":new,"service_restart_required":true}),
        )
    }

    pub fn audit(
        &self,
        command: &str,
        registry_id: &str,
        reason: &str,
        outcome: &str,
    ) -> HostResult<()> {
        let directory = self.state_root.join("audit/admin");
        fs::create_dir_all(&directory).map_err(|error| HostError::io(&directory, error))?;
        let record = self.keys.sign_object(&json!({"schema_version":"ty-context-host-admin-audit-v1","audit_id":uuid::Uuid::now_v7(),"command":command,"registry_id":registry_id,"reason_sha256":hex::encode(Sha256::digest(reason.as_bytes())),"outcome":outcome,"observed_at_unix_ms":unix_ms()}))?;
        let id = field(&record, "audit_id")?;
        durable_file::create(
            &directory.join(format!("{id}.json")),
            &canonical_bytes(&record)?,
        )
    }

    pub(crate) fn locate(&self, registry_id: &str) -> HostResult<LocatedRegistry> {
        validate_id(registry_id)?;
        let mut matches = Vec::new();
        for root in self.shards()? {
            for (relative, active) in [
                (format!("registry/active/records/{registry_id}.json"), true),
                (format!("registry/tombstones/{registry_id}.json"), false),
            ] {
                let file = root.join(relative);
                if file.exists() {
                    let _ = read_signed(&file, &self.keys)?;
                    matches.push(LocatedRegistry {
                        root: root.clone(),
                        active,
                    });
                }
            }
        }
        if matches.len() != 1 {
            return Err(HostError::Configuration(
                if matches.is_empty() {
                    "admin_registry_missing"
                } else {
                    "admin_registry_ambiguous"
                }
                .into(),
            ));
        }
        Ok(matches.remove(0))
    }
    pub(crate) fn shards(&self) -> HostResult<Vec<PathBuf>> {
        let directory = self.state_root.join("repositories");
        if !directory.exists() {
            return Ok(Vec::new());
        }
        let mut roots = fs::read_dir(&directory)
            .map_err(|error| HostError::io(&directory, error))?
            .filter_map(Result::ok)
            .filter(|entry| entry.file_type().map(|kind| kind.is_dir()).unwrap_or(false))
            .map(|entry| entry.path())
            .collect::<Vec<_>>();
        roots.sort();
        Ok(roots)
    }
    fn verify_directory(&self, directory: &Path) -> HostResult<usize> {
        Ok(signed_values(directory, &self.keys)?.len())
    }
    fn assert_same(&self, file: &Path, expected: &Value) -> HostResult<()> {
        let value = read_signed(file, &self.keys)?;
        if canonical_bytes(&value)? != canonical_bytes(expected)? {
            return Err(HostError::Integrity("admin_active_index".into()));
        }
        Ok(())
    }
}

pub(crate) struct ShardLock {
    file: PathBuf,
}
impl ShardLock {
    pub(crate) fn acquire(root: &Path) -> HostResult<Self> {
        let file = root.join("locks/registry.lock");
        if let Some(parent) = file.parent() {
            fs::create_dir_all(parent).map_err(|error| HostError::io(parent, error))?;
        }
        let mut handle = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&file)
            .map_err(|_| HostError::Permission("admin_registry_busy".into()))?;
        handle
            .write_all(format!("{}", std::process::id()).as_bytes())
            .map_err(|error| HostError::io(&file, error))?;
        handle
            .sync_all()
            .map_err(|error| HostError::io(&file, error))?;
        Ok(Self { file })
    }
}
impl Drop for ShardLock {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.file);
    }
}
pub(crate) fn signed_values(directory: &Path, keys: &HostKeys) -> HostResult<Vec<Value>> {
    if !directory.exists() {
        return Ok(Vec::new());
    }
    let mut entries = fs::read_dir(directory)
        .map_err(|error| HostError::io(directory, error))?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().extension().and_then(|value| value.to_str()) == Some("json"))
        .collect::<Vec<_>>();
    entries.sort_by_key(|entry| entry.file_name());
    entries
        .into_iter()
        .map(|entry| read_signed(&entry.path(), keys))
        .collect()
}
fn read_signed(file: &Path, keys: &HostKeys) -> HostResult<Value> {
    let value: Value =
        serde_json::from_slice(&fs::read(file).map_err(|error| HostError::io(file, error))?)
            .map_err(|_| HostError::Integrity("admin_record_json".into()))?;
    keys.verify_object(&value)?;
    Ok(value)
}
fn canonical_string(value: &Value) -> HostResult<String> {
    String::from_utf8(canonical_bytes(value)?).map_err(|_| HostError::Internal("admin_utf8".into()))
}
pub(crate) fn field<'a>(value: &'a Value, key: &str) -> HostResult<&'a str> {
    value[key]
        .as_str()
        .ok_or_else(|| HostError::Integrity(format!("admin_record_{key}")))
}
fn validate_id(value: &str) -> HostResult<()> {
    if value.len() > 128
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"-_.:".contains(&byte))
    {
        Err(HostError::Usage("registry id".into()))
    } else {
        Ok(())
    }
}
pub(crate) fn unix_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

#[cfg(test)]
#[path = "registry_admin_tests.rs"]
mod tests;
