use crate::{
    HostResult,
    registry_admin::{AdminRegistry, ShardLock, field, signed_values, unix_ms},
    registry_admin_journal::{AdminWrite, ShardJournal},
};
use serde_json::{Value, json};
use std::collections::BTreeSet;

impl AdminRegistry {
    pub fn gc(&self, registry_id: &str) -> HostResult<Value> {
        let located = self.locate(registry_id)?;
        let _lock = ShardLock::acquire(&located.root)?;
        ShardJournal::new(&located.root, &self.keys).recover()?;
        let now = unix_ms();
        let mut writes = Vec::new();
        let mut reservations = 0usize;
        let mut tombstones = 0usize;
        for value in signed_values(
            &located.root.join("registry/reservations/by-repository"),
            &self.keys,
        )? {
            if expiry(&value, "expires_at", "expires_at_unix_ms").is_some_and(|value| value <= now)
            {
                let repository = field(&value, "repository_identity_hash")?;
                let workdir = field(&value, "workdir_identity_hash")?;
                writes.push(AdminWrite {
                    path: format!("registry/reservations/by-repository/{repository}.json"),
                    content: None,
                });
                writes.push(AdminWrite {
                    path: format!("registry/reservations/by-workdir/{workdir}.json"),
                    content: None,
                });
                reservations += 1;
            }
        }
        for value in signed_values(&located.root.join("registry/tombstones"), &self.keys)? {
            if expiry(&value, "retain_until", "retain_until_unix_ms")
                .is_some_and(|value| value <= now)
            {
                writes.push(AdminWrite {
                    path: format!("registry/tombstones/{}.json", field(&value, "registry_id")?),
                    content: None,
                });
                tombstones += 1;
            }
        }
        if !writes.is_empty() {
            ShardJournal::new(&located.root, &self.keys).commit("administrative_gc", writes)?;
        }
        let removed_keys = self.gc_retained_keys()?;
        Ok(
            json!({"schema_version":"ty-context-host-admin-gc-v1","registry_id":registry_id,"expired_reservations":reservations,"expired_tombstones":tombstones,"removed_retained_keys":removed_keys}),
        )
    }

    fn gc_retained_keys(&self) -> HostResult<Vec<String>> {
        let mut used = BTreeSet::new();
        for root in self.shards()? {
            for relative in [
                "registry/active/records",
                "registry/reservations/by-repository",
                "registry/tombstones",
            ] {
                for value in signed_values(&root.join(relative), &self.keys)? {
                    if let Some(id) = value["key_id"].as_str() {
                        used.insert(id.to_owned());
                    }
                }
            }
        }
        let mut removed = Vec::new();
        for id in self.keys.retained_key_ids()? {
            if !used.contains(&id) {
                self.keys.remove_retained_key(&id)?;
                removed.push(id);
            }
        }
        Ok(removed)
    }
}

fn expiry(value: &Value, text: &str, numeric: &str) -> Option<u128> {
    value[numeric]
        .as_u64()
        .map(u128::from)
        .or_else(|| value[text].as_str().and_then(parse_rfc3339_ms))
}
fn parse_rfc3339_ms(value: &str) -> Option<u128> {
    let bytes = value.as_bytes();
    if bytes.len() < 20
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
    {
        return None;
    }
    let n = |start: usize, end: usize| {
        std::str::from_utf8(&bytes[start..end])
            .ok()?
            .parse::<i64>()
            .ok()
    };
    let (y, m, d, h, min, s) = (
        n(0, 4)?,
        n(5, 7)?,
        n(8, 10)?,
        n(11, 13)?,
        n(14, 16)?,
        n(17, 19)?,
    );
    let y = y - if m <= 2 { 1 } else { 0 };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = m + if m > 2 { -3 } else { 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    let days = era * 146097 + doe - 719468;
    let seconds = days * 86400 + h * 3600 + min * 60 + s;
    if seconds < 0 {
        None
    } else {
        Some(seconds as u128 * 1000)
    }
}
