use crate::{HostError, HostResult};
use std::path::{Path, PathBuf};
pub fn inside(root: &Path, relative: &str) -> HostResult<PathBuf> {
    let candidate = Path::new(relative);
    if relative.is_empty()
        || candidate.is_absolute()
        || candidate
            .components()
            .any(|part| matches!(part, std::path::Component::ParentDir))
    {
        return Err(HostError::Configuration("cache_path_escape".into()));
    }
    Ok(root.join(candidate))
}
