use crate::{
    HostError, HostResult, durable_file,
    hook_smoke::HookSmokes,
    registry::Registry,
    rpc::{self, Request, Response},
    sandbox, service_config,
    transport::{self, PeerIdentity},
    worker,
};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::{Arc, atomic::AtomicBool},
    time::{SystemTime, UNIX_EPOCH},
};

pub use crate::service_config::ServiceConfig;

pub(crate) struct Service {
    pub(crate) config: ServiceConfig,
    pub(crate) config_path: PathBuf,
    pub(crate) registry: Registry,
    pub(crate) hook_smokes: HookSmokes,
}

impl Service {
    fn open(config: ServiceConfig, config_path: PathBuf) -> HostResult<Self> {
        service_config::validate(&config)?;
        let registry = Registry::open(&config.state_root)?;
        let public_key = registry.public_key_pem()?;
        durable_file::replace(&config.attestation_public_key_path, public_key.as_bytes())?;
        Ok(Self {
            config,
            config_path,
            registry,
            hook_smokes: HookSmokes::default(),
        })
    }

    fn handle(&self, request: Request, peer: PeerIdentity) -> Response {
        if std::env::var_os("TY_CONTEXT_HOST_MAINTAINER_DEBUG").as_deref()
            == Some(std::ffi::OsStr::new("1"))
        {
            eprintln!(
                "request {} from {} received",
                request.method, peer.process_id
            );
        }
        let outcome = self
            .authorize(&request, &peer)
            .and_then(|()| self.dispatch(&request, &peer));
        if let Err(error) = &outcome
            && std::env::var_os("TY_CONTEXT_HOST_MAINTAINER_DEBUG").as_deref()
                == Some(std::ffi::OsStr::new("1"))
        {
            eprintln!(
                "request {} from {} rejected: {error}",
                request.method, peer.process_id
            );
        }
        match outcome {
            Ok(result) => self.response(&request, true, "ok", false, result, None),
            Err(error) => self.response(
                &request,
                false,
                error.public_code(),
                false,
                Value::Null,
                Some(error.public_code().into()),
            ),
        }
    }

    fn dispatch(&self, request: &Request, peer: &PeerIdentity) -> HostResult<Value> {
        match request.method.as_str() {
            "health" => self.health(request),
            "get_active" => Ok(self
                .registry
                .active_for_repository(Path::new(&request.repository_hint))?
                .unwrap_or(Value::Null)),
            "record_managed_heartbeat" => self.record_heartbeat(request, peer),
            "reserve_authority" | "compile_and_seal" | "verify" | "final_gate" => {
                self.run_worker(request, peer)
            }
            "handle_hook_event" => self.handle_hook(request, peer),
            _ => Err(HostError::Configuration("host_method_unsupported".into())),
        }
    }

    pub(crate) fn run_worker(&self, request: &Request, peer: &PeerIdentity) -> HostResult<Value> {
        let workdir = self.worker_workdir(request)?;
        let outcome = worker::run(
            &self.config.node_path,
            &self.config.worker_path,
            &self.config_path,
            &self.config.state_root,
            &request.method,
            &request.repository_hint,
            &request.params,
        );
        if let (Some(user_id), Some(group_id)) = (peer.user_id, peer.group_id) {
            worker::restore_workdir_owner(&workdir, user_id, group_id)?;
            worker::restore_repository_mirror_owner(
                Path::new(&request.repository_hint),
                user_id,
                group_id,
            )?;
        }
        outcome
    }

    fn worker_workdir(&self, request: &Request) -> HostResult<PathBuf> {
        if let Some(workdir) = request.params.get("workdir").and_then(Value::as_str) {
            return crate::identity::workdir(
                Path::new(&request.repository_hint),
                Path::new(workdir),
            )
            .map(|(identity, _)| PathBuf::from(identity.canonical_path));
        }
        let active = self
            .registry
            .active_for_repository(Path::new(&request.repository_hint))?
            .ok_or_else(|| HostError::Configuration("host_registry_missing".into()))?;
        active["workdir_identity"]["canonical_path"]
            .as_str()
            .map(PathBuf::from)
            .ok_or_else(|| HostError::Integrity("host_registry_workdir_identity".into()))
    }

    fn response(
        &self,
        request: &Request,
        ok: bool,
        code: &str,
        retryable: bool,
        result: Value,
        error: Option<String>,
    ) -> Response {
        let result_hash = hex::encode(Sha256::digest(
            rpc::canonical_bytes(&result).unwrap_or_default(),
        ));
        let mut nonce = [0u8; 32];
        let _ = getrandom::fill(&mut nonce);
        let attestation = self.registry.sign(&json!({"schema_version":"ty-context-host-response-attestation-v1","request_id":request.request_id,"client_nonce":request.client_nonce,"response_code":code,"result_sha256":result_hash,"issued_at_unix_ms":unix_ms(),"server_nonce":URL_SAFE_NO_PAD.encode(nonce)})).unwrap_or(Value::Null);
        Response {
            protocol: rpc::PROTOCOL.into(),
            request_id: request.request_id,
            ok,
            code: code.into(),
            retryable,
            result,
            error,
            attestation,
        }
    }
}

pub fn doctor(mut output: impl Write) -> HostResult<()> {
    let node = std::env::var_os("TY_CONTEXT_NODE_PATH")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("node"));
    let launcher = crate::sandbox_launcher::system_default()?;
    let capabilities = sandbox::detect(&node, &launcher.path, &launcher.sha256)?;
    let value = json!({"schema_version":"ty-context-host-doctor-v1","protocol":rpc::PROTOCOL,"capabilities":capabilities,"secret_provider":crate::secret::provider_name()});
    serde_json::to_writer(&mut output, &value)
        .map_err(|error| HostError::Internal(error.to_string()))?;
    writeln!(output).map_err(|error| HostError::io("stdout", error))
}

pub(crate) struct PreparedService {
    endpoint: String,
    handler: transport::Handler,
}

impl PreparedService {
    #[cfg(windows)]
    pub(crate) fn endpoint(&self) -> &str {
        &self.endpoint
    }

    pub(crate) fn serve(
        self,
        stop: Option<Arc<AtomicBool>>,
        ready: Option<Box<dyn FnOnce() + Send>>,
    ) -> HostResult<()> {
        transport::serve_controlled(&self.endpoint, self.handler, stop, ready)
    }
}

pub(crate) fn prepare_service(config_path: PathBuf) -> HostResult<PreparedService> {
    let bytes = fs::read(&config_path).map_err(|error| HostError::io(&config_path, error))?;
    let config: ServiceConfig = serde_json::from_slice(&bytes)
        .map_err(|error| HostError::Configuration(format!("config_json:{error}")))?;
    let endpoint = config.endpoint.clone();
    let service = Arc::new(Service::open(config, config_path)?);
    let handler: transport::Handler = Arc::new(move |mut stream, peer| {
        let response = rpc::read_frame(&mut stream)
            .and_then(rpc::parse_request)
            .map(|request| service.handle(request, peer));
        if let Ok(response) = response {
            if let Ok(value) = serde_json::to_value(response) {
                let _ = rpc::write_frame(&mut stream, &value);
            }
        }
    });
    Ok(PreparedService { endpoint, handler })
}

pub fn serve_from_args(args: Vec<String>) -> HostResult<()> {
    let config_path = option(&args, "--config")?;
    prepare_service(config_path)?.serve(None, None)
}

#[cfg(windows)]
pub fn windows_service_from_args(args: Vec<String>) -> HostResult<()> {
    crate::windows_service::run(args)
}
#[cfg(not(windows))]
pub fn windows_service_from_args(_args: Vec<String>) -> HostResult<()> {
    Err(HostError::Configuration(
        "windows_service_unsupported".into(),
    ))
}
pub fn sandbox_from_args(args: Vec<String>) -> HostResult<()> {
    sandbox::launch(args)
}
fn option(args: &[String], key: &str) -> HostResult<PathBuf> {
    let index = args
        .iter()
        .position(|value| value == key)
        .ok_or_else(|| HostError::Usage(format!("missing {key}")))?;
    args.get(index + 1)
        .map(PathBuf::from)
        .ok_or_else(|| HostError::Usage(format!("missing value for {key}")))
}
fn unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}
