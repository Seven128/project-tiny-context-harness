use std::process::ExitCode;
use ty_context_host_helper::{HostError, service};

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{}", error.public_code());
            if let Some(code) = error.public_detail_code() {
                eprintln!("{code}");
            }
            if std::env::var_os("TY_CONTEXT_HOST_MAINTAINER_DEBUG").as_deref()
                == Some(std::ffi::OsStr::new("1"))
            {
                eprintln!("{error}");
            }
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<(), HostError> {
    let mut args = std::env::args().skip(1);
    match args.next().as_deref() {
        Some("doctor") => service::doctor(std::io::stdout()),
        Some("serve") => service::serve_from_args(args.collect()),
        Some("service") => service::windows_service_from_args(args.collect()),
        Some("sandbox") => service::sandbox_from_args(args.collect()),
        _ => Err(HostError::Usage(
            "expected doctor|serve|service|sandbox".into(),
        )),
    }
}
