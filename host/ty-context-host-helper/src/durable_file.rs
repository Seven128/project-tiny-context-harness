use crate::{HostError, HostResult};
use std::{fs, io::Write, path::Path};

pub fn create(path: &Path, bytes: &[u8]) -> HostResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| HostError::io(parent, error))?;
    }
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|error| HostError::io(path, error))?;
    file.write_all(bytes)
        .map_err(|error| HostError::io(path, error))?;
    file.sync_all()
        .map_err(|error| HostError::io(path, error))?;
    sync_parent(path)
}

pub fn replace(path: &Path, bytes: &[u8]) -> HostResult<()> {
    let temporary = path.with_extension(format!("tmp-{}", uuid::Uuid::new_v4()));
    create(&temporary, bytes)?;
    #[cfg(windows)]
    move_replace_windows(&temporary, path)?;
    #[cfg(not(windows))]
    fs::rename(&temporary, path).map_err(|error| HostError::io(path, error))?;
    sync_parent(path)
}

#[cfg(unix)]
fn sync_parent(path: &Path) -> HostResult<()> {
    if let Some(parent) = path.parent() {
        let directory = fs::File::open(parent).map_err(|error| HostError::io(parent, error))?;
        directory
            .sync_all()
            .map_err(|error| HostError::io(parent, error))?;
    }
    Ok(())
}

#[cfg(windows)]
fn sync_parent(_path: &Path) -> HostResult<()> {
    Ok(())
}

#[cfg(windows)]
fn move_replace_windows(source: &Path, target: &Path) -> HostResult<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH, MoveFileExW,
    };
    let source_wide = source
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();
    let target_wide = target
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();
    if unsafe {
        MoveFileExW(
            source_wide.as_ptr(),
            target_wide.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    } == 0
    {
        let error = std::io::Error::last_os_error();
        let _ = fs::remove_file(source);
        return Err(HostError::io(target, error));
    }
    Ok(())
}
