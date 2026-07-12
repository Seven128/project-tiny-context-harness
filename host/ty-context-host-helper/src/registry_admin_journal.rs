use crate::{HostError, HostResult, attestation::HostKeys, durable_file, rpc::canonical_bytes};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path};

#[derive(Clone)]
pub struct AdminWrite {
    pub path: String,
    pub content: Option<String>,
}

pub struct ShardJournal<'a> {
    root: &'a Path,
    keys: &'a HostKeys,
}

impl<'a> ShardJournal<'a> {
    pub fn new(root: &'a Path, keys: &'a HostKeys) -> Self {
        Self { root, keys }
    }

    pub fn commit(&self, operation: &str, writes: Vec<AdminWrite>) -> HostResult<()> {
        self.ensure_layout()?;
        let mut seen = std::collections::BTreeSet::new();
        let writes = writes
            .into_iter()
            .map(|write| {
                validate_relative(&write.path)?;
                if !seen.insert(write.path.clone()) {
                    return Err(HostError::Integrity("admin_duplicate_write".into()));
                }
                let hash = write
                    .content
                    .as_ref()
                    .map(|value| hex::encode(Sha256::digest(value.as_bytes())));
                Ok(json!({"path":write.path,"content":write.content,"content_sha256":hash}))
            })
            .collect::<HostResult<Vec<_>>>()?;
        let sequence = self.transactions()?.len() as u64 + 1;
        let transaction = self.keys.sign_object(&json!({
            "schema_version":"ty-context-host-journal-v1",
            "transaction_id":uuid::Uuid::now_v7(),
            "sequence":sequence,
            "operation":operation,
            "created_at_unix_ms":unix_ms(),
            "writes":writes
        }))?;
        let id = string(&transaction, "transaction_id")?;
        durable_file::create(
            &self
                .root
                .join("journal")
                .join(format!("{sequence:016}-{id}.json")),
            &canonical_bytes(&transaction)?,
        )?;
        self.apply(&transaction)?;
        self.mark_applied(&transaction)
    }

    pub fn recover(&self) -> HostResult<usize> {
        self.ensure_layout()?;
        self.quarantine_staging()?;
        let transactions = self.transactions()?;
        let mut final_state = BTreeMap::<String, Option<String>>::new();
        for transaction in &transactions {
            for write in array(transaction, "writes")? {
                final_state.insert(string(write, "path")?.to_owned(), content(write)?);
            }
            let id = string(transaction, "transaction_id")?;
            let marker = self.root.join("journal/applied").join(format!("{id}.json"));
            if marker.exists() {
                self.verify_marker(&marker, transaction)?;
            } else {
                self.apply(transaction)?;
                self.mark_applied(transaction)?;
            }
        }
        for (relative, expected) in final_state {
            self.assert_state(&relative, expected.as_deref())?;
        }
        Ok(transactions.len())
    }

    pub fn verify(&self) -> HostResult<usize> {
        let transactions = self.transactions()?;
        for transaction in &transactions {
            let marker = self
                .root
                .join("journal/applied")
                .join(format!("{}.json", string(transaction, "transaction_id")?));
            self.verify_marker(&marker, transaction)?;
        }
        Ok(transactions.len())
    }

    fn transactions(&self) -> HostResult<Vec<Value>> {
        let journal = self.root.join("journal");
        if !journal.exists() {
            return Ok(Vec::new());
        }
        let mut entries = fs::read_dir(&journal)
            .map_err(|error| HostError::io(&journal, error))?
            .filter_map(Result::ok)
            .filter(|entry| {
                entry
                    .file_type()
                    .map(|kind| kind.is_file())
                    .unwrap_or(false)
            })
            .collect::<Vec<_>>();
        entries.sort_by_key(|entry| entry.file_name());
        let mut result = Vec::new();
        for (index, entry) in entries.into_iter().enumerate() {
            let expected = index as u64 + 1;
            let name = entry.file_name().to_string_lossy().into_owned();
            let value: Value = serde_json::from_slice(
                &fs::read(entry.path()).map_err(|error| HostError::io(entry.path(), error))?,
            )
            .map_err(|_| HostError::Integrity("admin_journal_json".into()))?;
            self.keys.verify_object(&value)?;
            if value["schema_version"] != "ty-context-host-journal-v1"
                || value["sequence"].as_u64() != Some(expected)
                || !name.starts_with(&format!(
                    "{expected:016}-{}",
                    string(&value, "transaction_id")?
                ))
            {
                return Err(HostError::Integrity("admin_journal_sequence".into()));
            }
            for write in array(&value, "writes")? {
                validate_relative(string(write, "path")?)?;
                let _ = content(write)?;
            }
            result.push(value);
        }
        Ok(result)
    }

    fn apply(&self, transaction: &Value) -> HostResult<()> {
        for write in array(transaction, "writes")? {
            let target = self.root.join(string(write, "path")?);
            match content(write)? {
                Some(value) => durable_file::replace(&target, value.as_bytes())?,
                None if target.exists() => {
                    fs::remove_file(&target).map_err(|error| HostError::io(&target, error))?
                }
                None => {}
            }
        }
        Ok(())
    }
    fn mark_applied(&self, transaction: &Value) -> HostResult<()> {
        let id = string(transaction, "transaction_id")?;
        let marker = self.keys.sign_object(&json!({"schema_version":"ty-context-host-journal-applied-v1","transaction_id":id,"transaction_sha256":string(transaction,"record_sha256")?,"applied_at_unix_ms":unix_ms()}))?;
        durable_file::create(
            &self.root.join("journal/applied").join(format!("{id}.json")),
            &canonical_bytes(&marker)?,
        )
    }
    fn verify_marker(&self, file: &Path, transaction: &Value) -> HostResult<()> {
        let marker: Value =
            serde_json::from_slice(&fs::read(file).map_err(|error| HostError::io(file, error))?)
                .map_err(|_| HostError::Integrity("admin_journal_marker_json".into()))?;
        self.keys.verify_object(&marker)?;
        if marker["schema_version"] != "ty-context-host-journal-applied-v1"
            || marker["transaction_id"] != transaction["transaction_id"]
            || marker["transaction_sha256"] != transaction["record_sha256"]
        {
            return Err(HostError::Integrity("admin_journal_marker".into()));
        }
        Ok(())
    }
    fn assert_state(&self, relative: &str, expected: Option<&str>) -> HostResult<()> {
        let file = self.root.join(relative);
        match expected {
            Some(value)
                if fs::read_to_string(&file).map_err(|error| HostError::io(&file, error))?
                    == value =>
            {
                Ok(())
            }
            Some(_) => Err(HostError::Integrity("admin_recovery_state".into())),
            None if !file.exists() => Ok(()),
            None => Err(HostError::Integrity("admin_recovery_delete".into())),
        }
    }
    fn quarantine_staging(&self) -> HostResult<()> {
        let staging = self.root.join("staging");
        let quarantine = self.root.join("quarantine");
        fs::create_dir_all(&quarantine).map_err(|error| HostError::io(&quarantine, error))?;
        for entry in fs::read_dir(&staging).map_err(|error| HostError::io(&staging, error))? {
            let entry = entry.map_err(|error| HostError::io(&staging, error))?;
            fs::rename(
                entry.path(),
                quarantine.join(format!(
                    "{}-{}",
                    uuid::Uuid::new_v4(),
                    entry.file_name().to_string_lossy()
                )),
            )
            .map_err(|error| HostError::io(entry.path(), error))?;
        }
        Ok(())
    }
    fn ensure_layout(&self) -> HostResult<()> {
        for relative in ["journal/applied", "staging", "quarantine", "locks"] {
            fs::create_dir_all(self.root.join(relative))
                .map_err(|error| HostError::io(self.root.join(relative), error))?;
        }
        Ok(())
    }
}

fn content(write: &Value) -> HostResult<Option<String>> {
    match &write["content"] {
        Value::Null if write["content_sha256"].is_null() => Ok(None),
        Value::String(value)
            if write["content_sha256"].as_str()
                == Some(&hex::encode(Sha256::digest(value.as_bytes()))) =>
        {
            Ok(Some(value.clone()))
        }
        _ => Err(HostError::Integrity("admin_journal_content".into())),
    }
}
fn string<'a>(value: &'a Value, key: &str) -> HostResult<&'a str> {
    value[key]
        .as_str()
        .ok_or_else(|| HostError::Integrity(format!("admin_journal_{key}")))
}
fn array<'a>(value: &'a Value, key: &str) -> HostResult<&'a Vec<Value>> {
    value[key]
        .as_array()
        .ok_or_else(|| HostError::Integrity(format!("admin_journal_{key}")))
}
fn validate_relative(value: &str) -> HostResult<()> {
    let path = Path::new(value);
    if value.is_empty()
        || path.is_absolute()
        || path
            .components()
            .any(|part| matches!(part, std::path::Component::ParentDir))
    {
        Err(HostError::Integrity("admin_journal_path".into()))
    } else {
        Ok(())
    }
}
fn unix_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}
