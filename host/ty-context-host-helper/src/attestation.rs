use crate::{HostError, HostResult, rpc::canonical_bytes};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use ed25519_dalek::{
    Signature, Signer, SigningKey, Verifier, VerifyingKey,
    pkcs8::{DecodePrivateKey, DecodePublicKey, EncodePrivateKey, EncodePublicKey},
};
use pkcs8::LineEnding;
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
};

pub struct HostKeys {
    signing: SigningKey,
    verifying: VerifyingKey,
    pub key_id: String,
    trusted_dir: PathBuf,
}

impl HostKeys {
    pub fn load_or_create(state_root: &Path) -> HostResult<Self> {
        let directory = state_root.join("keys");
        fs::create_dir_all(&directory).map_err(|error| HostError::io(&directory, error))?;
        let private = directory.join("host-ed25519-private.pem");
        let public = directory.join("host-ed25519-public.pem");
        let trusted = directory.join("trusted");
        fs::create_dir_all(&trusted).map_err(|error| HostError::io(&trusted, error))?;
        match (private.exists(), public.exists()) {
            (true, true) => Self::load_with_trusted(&private, &public, trusted),
            (false, false) => {
                let mut seed = [0u8; 32];
                getrandom::fill(&mut seed)
                    .map_err(|error| HostError::Internal(format!("random:{error}")))?;
                let signing = SigningKey::from_bytes(&seed);
                let verifying = signing.verifying_key();
                write_create(
                    &private,
                    signing
                        .to_pkcs8_pem(LineEnding::LF)
                        .map_err(|error| HostError::Internal(format!("private_pem:{error}")))?
                        .as_bytes(),
                )?;
                write_create(
                    &public,
                    verifying
                        .to_public_key_pem(LineEnding::LF)
                        .map_err(|error| HostError::Internal(format!("public_pem:{error}")))?
                        .as_bytes(),
                )?;
                Self::from_keys(signing, verifying, trusted)
            }
            _ => Err(HostError::Integrity("key_pair_partial".into())),
        }
    }

    pub fn load(private: &Path, public: &Path) -> HostResult<Self> {
        let trusted = public
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .join("trusted");
        Self::load_with_trusted(private, public, trusted)
    }

    fn load_with_trusted(private: &Path, public: &Path, trusted_dir: PathBuf) -> HostResult<Self> {
        let private_text =
            fs::read_to_string(private).map_err(|error| HostError::io(private, error))?;
        let public_text =
            fs::read_to_string(public).map_err(|error| HostError::io(public, error))?;
        let signing = SigningKey::from_pkcs8_pem(&private_text)
            .map_err(|error| HostError::Integrity(format!("private_key:{error}")))?;
        let verifying = VerifyingKey::from_public_key_pem(&public_text)
            .map_err(|error| HostError::Integrity(format!("public_key:{error}")))?;
        if signing.verifying_key() != verifying {
            return Err(HostError::Integrity("key_pair_mismatch".into()));
        }
        Self::from_keys(signing, verifying, trusted_dir)
    }

    pub fn sign_object(&self, payload: &Value) -> HostResult<Value> {
        let mut object = payload
            .as_object()
            .cloned()
            .ok_or_else(|| HostError::Internal("signed_payload_not_object".into()))?;
        object.insert("key_id".into(), Value::String(self.key_id.clone()));
        let digest = sha256(&canonical_bytes(&Value::Object(object.clone()))?);
        object.insert("record_sha256".into(), Value::String(hex::encode(digest)));
        object.insert(
            "signature".into(),
            Value::String(URL_SAFE_NO_PAD.encode(self.signing.sign(&digest).to_bytes())),
        );
        Ok(Value::Object(object))
    }

    pub fn verify_object(&self, signed: &Value) -> HostResult<()> {
        let mut object: Map<String, Value> = signed
            .as_object()
            .cloned()
            .ok_or_else(|| HostError::Integrity("signed_record_not_object".into()))?;
        let signature_text = take_string(&mut object, "signature")?;
        let digest_text = take_string(&mut object, "record_sha256")?;
        let key_id = object
            .get("key_id")
            .and_then(Value::as_str)
            .ok_or_else(|| HostError::Integrity("key_id".into()))?
            .to_owned();
        let digest = sha256(&canonical_bytes(&Value::Object(object))?);
        if hex::encode(digest) != digest_text {
            return Err(HostError::Integrity("record_hash".into()));
        }
        let bytes: [u8; 64] = URL_SAFE_NO_PAD
            .decode(signature_text)
            .map_err(|_| HostError::Integrity("signature_encoding".into()))?
            .try_into()
            .map_err(|_| HostError::Integrity("signature_length".into()))?;
        self.verifier(&key_id)?
            .verify(&digest, &Signature::from_bytes(&bytes))
            .map_err(|_| HostError::Integrity("signature".into()))
    }

    pub fn public_pem(&self) -> HostResult<String> {
        self.verifying
            .to_public_key_pem(LineEnding::LF)
            .map_err(|error| HostError::Internal(format!("public_pem:{error}")))
    }
    pub fn rotate(state_root: &Path) -> HostResult<(String, Self)> {
        let current = Self::load_or_create(state_root)?;
        let public = current.public_pem()?;
        let retained = current.trusted_dir.join(format!("{}.pem", current.key_id));
        if retained.exists() {
            if fs::read_to_string(&retained).map_err(|error| HostError::io(&retained, error))?
                != public
            {
                return Err(HostError::Integrity("retained_key_mismatch".into()));
            }
        } else {
            write_create(&retained, public.as_bytes())?;
        }
        let mut seed = [0u8; 32];
        getrandom::fill(&mut seed)
            .map_err(|error| HostError::Internal(format!("random:{error}")))?;
        let signing = SigningKey::from_bytes(&seed);
        let verifying = signing.verifying_key();
        let directory = state_root.join("keys");
        let private = directory.join("host-ed25519-private.pem");
        let public_file = directory.join("host-ed25519-public.pem");
        crate::durable_file::replace(
            &private,
            signing
                .to_pkcs8_pem(LineEnding::LF)
                .map_err(|error| HostError::Internal(format!("private_pem:{error}")))?
                .as_bytes(),
        )?;
        crate::durable_file::replace(
            &public_file,
            verifying
                .to_public_key_pem(LineEnding::LF)
                .map_err(|error| HostError::Internal(format!("public_pem:{error}")))?
                .as_bytes(),
        )?;
        let rotated = Self::load_or_create(state_root)?;
        Ok((current.key_id, rotated))
    }

    pub fn retained_key_ids(&self) -> HostResult<Vec<String>> {
        let mut ids = fs::read_dir(&self.trusted_dir)
            .map_err(|error| HostError::io(&self.trusted_dir, error))?
            .filter_map(Result::ok)
            .filter_map(|entry| {
                entry
                    .file_name()
                    .to_str()
                    .and_then(|name| name.strip_suffix(".pem"))
                    .map(str::to_owned)
            })
            .collect::<Vec<_>>();
        ids.sort();
        Ok(ids)
    }

    pub fn remove_retained_key(&self, key_id: &str) -> HostResult<()> {
        if !key_id.bytes().all(|value| value.is_ascii_hexdigit()) || key_id.len() != 64 {
            return Err(HostError::Integrity("retained_key_id".into()));
        }
        let file = self.trusted_dir.join(format!("{key_id}.pem"));
        if file.exists() {
            fs::remove_file(&file).map_err(|error| HostError::io(&file, error))?;
        }
        Ok(())
    }

    fn verifier(&self, key_id: &str) -> HostResult<VerifyingKey> {
        if key_id == self.key_id {
            return Ok(self.verifying);
        }
        if key_id.len() != 64 || !key_id.bytes().all(|value| value.is_ascii_hexdigit()) {
            return Err(HostError::Integrity("key_id".into()));
        }
        let file = self.trusted_dir.join(format!("{key_id}.pem"));
        let text = fs::read_to_string(&file).map_err(|_| HostError::Integrity("key_id".into()))?;
        let key = VerifyingKey::from_public_key_pem(&text)
            .map_err(|_| HostError::Integrity("retained_public_key".into()))?;
        let der = key
            .to_public_key_der()
            .map_err(|error| HostError::Internal(format!("public_der:{error}")))?;
        if hex::encode(sha256(der.as_bytes())) != key_id {
            return Err(HostError::Integrity("retained_key_identity".into()));
        }
        Ok(key)
    }

    fn from_keys(
        signing: SigningKey,
        verifying: VerifyingKey,
        trusted_dir: PathBuf,
    ) -> HostResult<Self> {
        let der = verifying
            .to_public_key_der()
            .map_err(|error| HostError::Internal(format!("public_der:{error}")))?;
        Ok(Self {
            signing,
            verifying,
            key_id: hex::encode(sha256(der.as_bytes())),
            trusted_dir,
        })
    }
}

fn sha256(bytes: &[u8]) -> [u8; 32] {
    Sha256::digest(bytes).into()
}
fn take_string(object: &mut Map<String, Value>, key: &str) -> HostResult<String> {
    object
        .remove(key)
        .and_then(|value| value.as_str().map(str::to_owned))
        .ok_or_else(|| HostError::Integrity(key.into()))
}
fn write_create(path: &PathBuf, bytes: &[u8]) -> HostResult<()> {
    use std::io::Write;
    let mut options = fs::OpenOptions::new();
    options.write(true).create_new(true);
    let mut file = options
        .open(path)
        .map_err(|error| HostError::io(path, error))?;
    file.write_all(bytes)
        .map_err(|error| HostError::io(path, error))?;
    file.sync_all().map_err(|error| HostError::io(path, error))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn signed_records_fail_closed_after_mutation() {
        let root =
            std::env::temp_dir().join(format!("ty-context-key-test-{}", uuid::Uuid::new_v4()));
        let keys = HostKeys::load_or_create(&root).unwrap();
        let signed = keys.sign_object(&json!({"value": 1})).unwrap();
        keys.verify_object(&signed).unwrap();
        let mut mutated = signed;
        mutated["value"] = json!(2);
        assert!(keys.verify_object(&mutated).is_err());
        let _ = fs::remove_dir_all(root);
    }
}
