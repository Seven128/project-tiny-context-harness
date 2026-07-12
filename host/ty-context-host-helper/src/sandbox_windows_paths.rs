use crate::{
    HostError, HostResult,
    sandbox::SandboxPolicy,
    sandbox_windows_acl::{FileAclSnapshot, update_file_acl, update_reparse_acl},
};
use std::{collections::BTreeMap, fs, os::windows::fs::MetadataExt, path::Path};
use windows_sys::Win32::{
    Security::PSID,
    Storage::FileSystem::{
        DELETE, FILE_ATTRIBUTE_REPARSE_POINT, FILE_DELETE_CHILD, FILE_GENERIC_EXECUTE,
        FILE_GENERIC_READ, FILE_GENERIC_WRITE, FILE_READ_ATTRIBUTES, FILE_TRAVERSE, SYNCHRONIZE,
    },
};

fn insert_grant(
    paths: &mut BTreeMap<String, (std::path::PathBuf, bool)>,
    path: &Path,
    write: bool,
) -> HostResult<()> {
    let canonical = fs::canonicalize(path).map_err(|error| HostError::io(path, error))?;
    let key = canonical.to_string_lossy().to_lowercase();
    paths
        .entry(key)
        .and_modify(|value| value.1 |= write)
        .or_insert((canonical, write));
    Ok(())
}

#[derive(Default)]
pub(crate) struct GrantedPaths {
    snapshots: BTreeMap<String, FileAclSnapshot>,
    order: Vec<String>,
}
impl GrantedPaths {
    fn capture(&mut self, path: &Path) -> HostResult<()> {
        let key = path.to_string_lossy().replace('/', "\\").to_lowercase();
        if !self.snapshots.contains_key(&key) {
            self.snapshots
                .insert(key.clone(), FileAclSnapshot::capture(path)?);
            self.order.push(key);
        }
        Ok(())
    }

    fn grant_file(&mut self, path: &Path, sid: PSID, mask: u32, inherit: bool) -> HostResult<()> {
        self.capture(path)?;
        update_file_acl(path, sid, mask, true, inherit)
    }

    fn grant_tree(&mut self, path: &Path, sid: PSID, mask: u32) -> HostResult<()> {
        let metadata = fs::symlink_metadata(path).map_err(|error| HostError::io(path, error))?;
        self.capture(path)?;
        if metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
            return update_reparse_acl(path, sid, mask, true);
        }
        update_file_acl(path, sid, mask, true, metadata.is_dir())?;
        if metadata.is_dir() {
            for entry in fs::read_dir(path).map_err(|error| HostError::io(path, error))? {
                self.grant_tree(
                    &entry.map_err(|error| HostError::io(path, error))?.path(),
                    sid,
                    mask,
                )?;
            }
        }
        Ok(())
    }

    pub(crate) fn restore(&mut self) -> HostResult<()> {
        let mut first_error = None;
        for key in self.order.iter().rev() {
            let Some(snapshot) = self.snapshots.get(key) else {
                continue;
            };
            match snapshot.restore() {
                Ok(()) => {
                    self.snapshots.remove(key);
                }
                Err(error) if first_error.is_none() => first_error = Some(error),
                Err(_) => {}
            }
        }
        if let Some(error) = first_error {
            Err(error)
        } else {
            self.order.clear();
            Ok(())
        }
    }
}
impl Drop for GrantedPaths {
    fn drop(&mut self) {
        let _ = self.restore();
    }
}

pub(crate) fn grant_paths(
    policy: &SandboxPolicy,
    sid: PSID,
    app_temp: Option<&Path>,
) -> HostResult<GrantedPaths> {
    let mut paths = BTreeMap::<String, (std::path::PathBuf, bool)>::new();
    let system_root = std::env::var_os("SystemRoot").map(std::path::PathBuf::from);
    if !system_root
        .as_ref()
        .is_some_and(|root| policy.executable.starts_with(root))
    {
        if let Some(parent) = policy.executable.parent() {
            insert_grant(&mut paths, parent, false)?;
        }
    }
    for path in &policy.read_paths {
        insert_grant(&mut paths, path, false)?;
    }
    for path in &policy.write_paths {
        insert_grant(&mut paths, path, true)?;
    }
    if let Some(path) = app_temp {
        insert_grant(&mut paths, path, true)?;
    }
    let allowed_roots = paths
        .values()
        .map(|value| value.0.clone())
        .collect::<Vec<_>>();
    for path in &allowed_roots {
        validate_reparse_tree(path, &allowed_roots)?;
    }
    let mut ancestor_map = BTreeMap::<String, std::path::PathBuf>::new();
    for path in &allowed_roots {
        let mut current = path.parent();
        while let Some(parent) = current {
            let canonical =
                fs::canonicalize(parent).map_err(|error| HostError::io(parent, error))?;
            ancestor_map
                .entry(canonical.to_string_lossy().to_lowercase())
                .or_insert(canonical);
            current = parent.parent();
        }
    }
    let mut granted = GrantedPaths::default();
    for path in ancestor_map.values() {
        granted.grant_file(
            path,
            sid,
            FILE_TRAVERSE | FILE_READ_ATTRIBUTES | SYNCHRONIZE,
            false,
        )?;
    }
    for (path, write) in paths.values() {
        let mask = FILE_GENERIC_READ
            | FILE_GENERIC_EXECUTE
            | if *write {
                FILE_GENERIC_WRITE | DELETE | FILE_DELETE_CHILD
            } else {
                0
            };
        granted.grant_tree(path, sid, mask)?;
    }
    Ok(granted)
}
fn validate_reparse_tree(root: &Path, allowed_roots: &[std::path::PathBuf]) -> HostResult<()> {
    let metadata = fs::symlink_metadata(root).map_err(|error| HostError::io(root, error))?;
    if metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
        let target = fs::canonicalize(root).map_err(|error| HostError::io(root, error))?;
        if !allowed_roots
            .iter()
            .any(|allowed| path_inside(allowed, &target))
        {
            return Err(HostError::Sandbox(format!(
                "sandbox_reparse_escape:{}",
                root.display()
            )));
        }
        return Ok(());
    }
    if metadata.is_dir() {
        for entry in fs::read_dir(root).map_err(|error| HostError::io(root, error))? {
            validate_reparse_tree(
                &entry.map_err(|error| HostError::io(root, error))?.path(),
                allowed_roots,
            )?;
        }
    }
    Ok(())
}
fn path_inside(root: &Path, candidate: &Path) -> bool {
    let root = root.to_string_lossy().replace('/', "\\").to_lowercase();
    let candidate = candidate
        .to_string_lossy()
        .replace('/', "\\")
        .to_lowercase();
    candidate == root || candidate.starts_with(&format!("{root}\\"))
}
