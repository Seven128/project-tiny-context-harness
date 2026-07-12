use crate::{HostError, HostResult};
pub fn validate_ref(value: &str) -> HostResult<()> {
    if value.len() > 128
        || !value
            .chars()
            .next()
            .is_some_and(|value| value.is_ascii_uppercase() || value == '_')
        || !value
            .chars()
            .all(|value| value.is_ascii_uppercase() || value.is_ascii_digit() || value == '_')
    {
        return Err(HostError::Configuration("secret_ref_invalid".into()));
    }
    Ok(())
}
pub fn provider_name() -> &'static str {
    if cfg!(windows) {
        "windows-credential-manager"
    } else if cfg!(target_os = "macos") {
        "macos-keychain"
    } else {
        "secret-service"
    }
}
