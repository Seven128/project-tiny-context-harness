use crate::{HostError, HostResult, attestation::HostKeys};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path};

pub fn verify_shard_targets(root: &Path, targets: &[&str], keys: &HostKeys) -> HostResult<()> {
    if !root.exists() {
        return Ok(());
    }
    let journal = root.join("journal");
    if !journal.is_dir() {
        return Err(HostError::Integrity("repository_journal_missing".into()));
    }
    let mut entries = fs::read_dir(&journal)
        .map_err(|error| HostError::io(&journal, error))?
        .filter_map(Result::ok)
        .filter(|entry| {
            entry
                .file_type()
                .map(|value| value.is_file())
                .unwrap_or(false)
        })
        .collect::<Vec<_>>();
    entries.sort_by_key(|entry| entry.file_name());
    let mut expected_sequence = 1u64;
    let mut latest = BTreeMap::<String, Option<String>>::new();
    for entry in entries {
        let name = entry.file_name().to_string_lossy().into_owned();
        if !name.starts_with(&format!("{expected_sequence:016}-")) || !name.ends_with(".json") {
            return Err(HostError::Integrity("repository_journal_sequence".into()));
        }
        let bytes = fs::read(entry.path()).map_err(|error| HostError::io(entry.path(), error))?;
        let value: Value = serde_json::from_slice(&bytes)
            .map_err(|_| HostError::Integrity("repository_journal_json".into()))?;
        keys.verify_object(&value)?;
        if value["schema_version"] != "ty-context-host-journal-v1"
            || value["sequence"].as_u64() != Some(expected_sequence)
        {
            return Err(HostError::Integrity("repository_journal_record".into()));
        }
        let transaction = value["transaction_id"]
            .as_str()
            .ok_or_else(|| HostError::Integrity("repository_journal_transaction".into()))?;
        let marker = root
            .join("journal/applied")
            .join(format!("{transaction}.json"));
        let applied: Value = serde_json::from_slice(
            &fs::read(&marker).map_err(|error| HostError::io(&marker, error))?,
        )
        .map_err(|_| HostError::Integrity("repository_journal_marker_json".into()))?;
        keys.verify_object(&applied)?;
        if applied["schema_version"] != "ty-context-host-journal-applied-v1"
            || applied["transaction_id"] != value["transaction_id"]
            || applied["transaction_sha256"] != value["record_sha256"]
        {
            return Err(HostError::Integrity("repository_journal_marker".into()));
        }
        for write in value["writes"]
            .as_array()
            .ok_or_else(|| HostError::Integrity("repository_journal_writes".into()))?
        {
            let relative = write["path"]
                .as_str()
                .ok_or_else(|| HostError::Integrity("repository_journal_path".into()))?;
            if targets.contains(&relative) {
                let content = match &write["content"] {
                    Value::Null => None,
                    Value::String(value)
                        if write["content_sha256"].as_str()
                            == Some(&hex::encode(Sha256::digest(value.as_bytes()))) =>
                    {
                        Some(value.clone())
                    }
                    _ => return Err(HostError::Integrity("repository_journal_content".into())),
                };
                latest.insert(relative.into(), content);
            }
        }
        expected_sequence += 1;
    }
    if expected_sequence == 1 {
        return Err(HostError::Integrity("repository_journal_empty".into()));
    }
    for target in targets {
        let file = root.join(target);
        match latest.get(*target) {
            Some(Some(expected)) => {
                let actual =
                    fs::read_to_string(&file).map_err(|error| HostError::io(&file, error))?;
                if &actual != expected {
                    return Err(HostError::Integrity("repository_state_mismatch".into()));
                }
            }
            Some(None) if file.exists() => {
                return Err(HostError::Integrity("repository_state_not_deleted".into()));
            }
            None if file.exists() => {
                return Err(HostError::Integrity("repository_state_unjournaled".into()));
            }
            _ => {}
        }
    }
    Ok(())
}
