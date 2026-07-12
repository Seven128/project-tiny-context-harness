use crate::{HostError, HostResult, service};
use std::{
    fs::OpenOptions,
    path::PathBuf,
    sync::{
        Arc, Mutex, OnceLock,
        atomic::{AtomicBool, AtomicPtr, Ordering},
    },
};
use windows_sys::Win32::{
    Foundation::ERROR_SERVICE_SPECIFIC_ERROR,
    System::Services::{
        RegisterServiceCtrlHandlerExW, SERVICE_ACCEPT_STOP, SERVICE_CONTROL_INTERROGATE,
        SERVICE_CONTROL_STOP, SERVICE_RUNNING, SERVICE_START_PENDING, SERVICE_STATUS,
        SERVICE_STATUS_HANDLE, SERVICE_STOP_PENDING, SERVICE_STOPPED, SERVICE_TABLE_ENTRYW,
        SERVICE_WIN32_OWN_PROCESS, SetServiceStatus, StartServiceCtrlDispatcherW,
    },
};

struct Startup {
    config_path: PathBuf,
    service_name: String,
}

struct ControlContext {
    stop: Arc<AtomicBool>,
    endpoint: Mutex<Option<String>>,
    status_handle: AtomicPtr<core::ffi::c_void>,
}

static STARTUP: OnceLock<Startup> = OnceLock::new();
static SERVICE_RESULT: Mutex<Option<HostError>> = Mutex::new(None);

pub fn run(args: Vec<String>) -> HostResult<()> {
    let config_path = option(&args, "--config")?;
    let service_name = option(&args, "--service-name")?;
    if service_name.is_empty()
        || service_name.len() > 256
        || service_name.chars().any(char::is_control)
    {
        return Err(HostError::Configuration("windows_service_name".into()));
    }
    STARTUP
        .set(Startup {
            config_path: PathBuf::from(config_path),
            service_name: service_name.clone(),
        })
        .map_err(|_| HostError::Internal("windows_service_already_initialized".into()))?;
    let mut name = wide(&service_name);
    let table = [
        SERVICE_TABLE_ENTRYW {
            lpServiceName: name.as_mut_ptr(),
            lpServiceProc: Some(service_main),
        },
        SERVICE_TABLE_ENTRYW::default(),
    ];
    if unsafe { StartServiceCtrlDispatcherW(table.as_ptr()) } == 0 {
        return Err(last("windows_service_dispatcher"));
    }
    if let Some(error) = SERVICE_RESULT.lock().expect("service result mutex").take() {
        Err(error)
    } else {
        Ok(())
    }
}

unsafe extern "system" fn service_main(_argc: u32, _argv: *mut *mut u16) {
    let Some(startup) = STARTUP.get() else {
        return;
    };
    let context = Box::new(ControlContext {
        stop: Arc::new(AtomicBool::new(false)),
        endpoint: Mutex::new(None),
        status_handle: AtomicPtr::new(std::ptr::null_mut()),
    });
    let context = Box::into_raw(context);
    let name = wide(&startup.service_name);
    let handle = unsafe {
        RegisterServiceCtrlHandlerExW(name.as_ptr(), Some(control_handler), context.cast())
    };
    if handle.is_null() {
        store_error(last("windows_service_register_handler"));
        unsafe { drop(Box::from_raw(context)) };
        return;
    }
    unsafe { (*context).status_handle.store(handle, Ordering::Release) };
    let _ = report(handle, SERVICE_START_PENDING, 0, 0, 1, 15_000);
    let result = service::prepare_service(startup.config_path.clone()).and_then(|prepared| {
        let endpoint = prepared.endpoint().to_string();
        *unsafe { &*context }
            .endpoint
            .lock()
            .expect("service endpoint mutex") = Some(endpoint);
        let ready_handle = handle as usize;
        let ready = Box::new(move || {
            let _ = report(
                ready_handle as SERVICE_STATUS_HANDLE,
                SERVICE_RUNNING,
                SERVICE_ACCEPT_STOP,
                0,
                0,
                0,
            );
        });
        prepared.serve(Some(unsafe { &*context }.stop.clone()), Some(ready))
    });
    let win32 = if result.is_ok() {
        0
    } else {
        ERROR_SERVICE_SPECIFIC_ERROR
    };
    let _ = report(handle, SERVICE_STOPPED, 0, win32, 0, 0);
    if let Err(error) = result {
        store_error(error);
    }
    unsafe { drop(Box::from_raw(context)) };
}

unsafe extern "system" fn control_handler(
    control: u32,
    _event_type: u32,
    _event_data: *mut core::ffi::c_void,
    raw: *mut core::ffi::c_void,
) -> u32 {
    if raw.is_null() {
        return 1;
    }
    let context = unsafe { &*(raw.cast::<ControlContext>()) };
    match control {
        SERVICE_CONTROL_STOP => {
            if !context.stop.swap(true, Ordering::AcqRel) {
                let handle = context.status_handle.load(Ordering::Acquire);
                if !handle.is_null() {
                    let _ = report(handle, SERVICE_STOP_PENDING, 0, 0, 2, 15_000);
                }
                if let Some(endpoint) = context
                    .endpoint
                    .lock()
                    .expect("service endpoint mutex")
                    .clone()
                {
                    std::thread::spawn(move || {
                        let _ = OpenOptions::new().read(true).write(true).open(endpoint);
                    });
                }
            }
            0
        }
        SERVICE_CONTROL_INTERROGATE => 0,
        _ => 120,
    }
}

fn report(
    handle: SERVICE_STATUS_HANDLE,
    state: u32,
    accepted: u32,
    win32_exit: u32,
    checkpoint: u32,
    wait_hint: u32,
) -> HostResult<()> {
    let status = SERVICE_STATUS {
        dwServiceType: SERVICE_WIN32_OWN_PROCESS,
        dwCurrentState: state,
        dwControlsAccepted: accepted,
        dwWin32ExitCode: win32_exit,
        dwServiceSpecificExitCode: if win32_exit == ERROR_SERVICE_SPECIFIC_ERROR {
            1
        } else {
            0
        },
        dwCheckPoint: checkpoint,
        dwWaitHint: wait_hint,
    };
    if unsafe { SetServiceStatus(handle, &status) } == 0 {
        Err(last("windows_service_status"))
    } else {
        Ok(())
    }
}

fn option(args: &[String], key: &str) -> HostResult<String> {
    let index = args
        .iter()
        .position(|value| value == key)
        .ok_or_else(|| HostError::Usage(format!("missing {key}")))?;
    args.get(index + 1)
        .cloned()
        .ok_or_else(|| HostError::Usage(format!("missing value for {key}")))
}

fn store_error(error: HostError) {
    *SERVICE_RESULT.lock().expect("service result mutex") = Some(error);
}

fn wide(value: &str) -> Vec<u16> {
    use std::os::windows::ffi::OsStrExt;
    std::ffi::OsStr::new(value)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

fn last(code: &str) -> HostError {
    HostError::Configuration(format!("{code}:{}", std::io::Error::last_os_error()))
}
