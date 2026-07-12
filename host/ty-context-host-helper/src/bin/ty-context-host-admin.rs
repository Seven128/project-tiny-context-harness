use std::process::ExitCode;
use ty_context_host_helper::{HostError, admin_runtime};

fn main() -> ExitCode {
    match admin_runtime::run(std::env::args().skip(1).collect()) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{}", error.public_code());
            if std::env::var_os("TY_CONTEXT_HOST_MAINTAINER_DEBUG").as_deref()
                == Some(std::ffi::OsStr::new("1"))
            {
                eprintln!("{error}");
            }
            ExitCode::FAILURE
        }
    }
}

#[allow(dead_code)]
fn _type_check(_: HostError) {}
