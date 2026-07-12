use crate::{HostError, HostResult, attestation::HostKeys, rpc::canonical_bytes};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};
use uuid::Uuid;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct JournalWrite {
    pub path: String,
    pub content: Option<String>,
}

pub struct Journal {
    root: PathBuf,
}

impl Journal {
    pub fn new(state_root: &Path) -> HostResult<Self> {
        let root = state_root.join("journal");
        fs::create_dir_all(root.join("applied")).map_err(|error| HostError::io(&root, error))?;
        Ok(Self { root })
    }
    pub fn commit(
        &self,
        keys: &HostKeys,
        operation: &str,
        writes: Vec<JournalWrite>,
    ) -> HostResult<Value> {
        for write in &writes {
            validate_relative(&write.path)?;
        }
        let sequence = self.next_sequence()?;
        let record = keys.sign_object(&json!({"schema_version":"ty-context-host-journal-v1","transaction_id":Uuid::now_v7(),"sequence":sequence,"operation":operation,"writes":writes}))?;
        let id = record["transaction_id"]
            .as_str()
            .ok_or_else(|| HostError::Internal("journal_id".into()))?;
        let file = self.root.join(format!("{sequence:016}-{id}.json"));
        write_create(&file, &canonical_bytes(&record)?)?;
        Ok(record)
    }
    pub fn mark_applied(&self, keys: &HostKeys, transaction: &Value) -> HostResult<()> {
        let id = transaction["transaction_id"]
            .as_str()
            .ok_or_else(|| HostError::Integrity("journal_id".into()))?;
        let hash = transaction["record_sha256"]
            .as_str()
            .ok_or_else(|| HostError::Integrity("journal_hash".into()))?;
        let marker = keys.sign_object(&json!({"schema_version":"ty-context-host-journal-applied-v1","transaction_id":id,"transaction_sha256":hash}))?;
        write_create(
            &self.root.join("applied").join(format!("{id}.json")),
            &canonical_bytes(&marker)?,
        )
    }
    pub fn verify(&self, keys: &HostKeys) -> HostResult<Vec<Value>> {
        let mut files: Vec<_> = fs::read_dir(&self.root)
            .map_err(|error| HostError::io(&self.root, error))?
            .filter_map(Result::ok)
            .filter(|entry| {
                entry
                    .file_type()
                    .map(|kind| kind.is_file())
                    .unwrap_or(false)
            })
            .collect();
        files.sort_by_key(|entry| entry.file_name());
        let mut result = Vec::new();
        let mut expected = 1u64;
        for entry in files {
            let bytes =
                fs::read(entry.path()).map_err(|error| HostError::io(entry.path(), error))?;
            let value: Value = serde_json::from_slice(&bytes)
                .map_err(|error| HostError::Integrity(format!("journal_json:{error}")))?;
            keys.verify_object(&value)?;
            if value["sequence"].as_u64() != Some(expected) {
                return Err(HostError::Integrity("journal_sequence".into()));
            }
            expected += 1;
            result.push(value);
        }
        Ok(result)
    }
    fn next_sequence(&self) -> HostResult<u64> {
        Ok(self.verify_names()?.into_iter().max().unwrap_or(0) + 1)
    }
    fn verify_names(&self) -> HostResult<Vec<u64>> {
        let mut result = Vec::new();
        for entry in fs::read_dir(&self.root).map_err(|error| HostError::io(&self.root, error))? {
            let entry = entry.map_err(|error| HostError::io(&self.root, error))?;
            if !entry
                .file_type()
                .map_err(|error| HostError::io(entry.path(), error))?
                .is_file()
            {
                continue;
            }
            let name = entry.file_name().to_string_lossy().into_owned();
            let sequence = name
                .get(..16)
                .and_then(|value| value.parse().ok())
                .ok_or_else(|| HostError::Integrity(format!("journal_name:{name}")))?;
            result.push(sequence);
        }
        Ok(result)
    }
}

fn validate_relative(value: &str) -> HostResult<()> {
    let path = Path::new(value);
    if value.is_empty()
        || path.is_absolute()
        || path
            .components()
            .any(|part| matches!(part, std::path::Component::ParentDir))
    {
        return Err(HostError::Integrity(format!("journal_path:{value}")));
    }
    Ok(())
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
