fn main() {
    if let Err(error) =
        ty_context_host_helper::installer_ui::run(std::env::args().skip(1).collect())
    {
        eprintln!("{}", error.public_code());
        if std::env::var_os("TY_CONTEXT_HOST_MAINTAINER_DEBUG").as_deref()
            == Some(std::ffi::OsStr::new("1"))
        {
            eprintln!("{error}");
        }
        std::process::exit(1);
    }
}
