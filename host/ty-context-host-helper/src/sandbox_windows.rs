use crate::{
    HostError, HostResult,
    sandbox::SandboxPolicy,
    sandbox_windows_desktop::DesktopGuard,
    sandbox_windows_handle::{LoopbackGuard, OwnedHandle, appcontainer_temp, last, wide},
    sandbox_windows_paths::grant_paths,
    sandbox_windows_stdio::{InheritedStdio, OutputEnvironmentGuard, quote},
};
use std::path::Path;
use windows_sys::Win32::{
    Foundation::WAIT_OBJECT_0,
    Security::Isolation::{
        CreateAppContainerProfile, DeleteAppContainerProfile,
        DeriveAppContainerSidFromAppContainerName,
    },
    Security::{FreeSid, PSID, SECURITY_CAPABILITIES},
    System::{
        JobObjects::{
            AssignProcessToJobObject, CreateJobObjectW, JOB_OBJECT_LIMIT_ACTIVE_PROCESS,
            JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE, JOB_OBJECT_UILIMIT_DESKTOP,
            JOB_OBJECT_UILIMIT_DISPLAYSETTINGS, JOB_OBJECT_UILIMIT_EXITWINDOWS,
            JOB_OBJECT_UILIMIT_GLOBALATOMS, JOB_OBJECT_UILIMIT_HANDLES,
            JOB_OBJECT_UILIMIT_READCLIPBOARD, JOB_OBJECT_UILIMIT_SYSTEMPARAMETERS,
            JOB_OBJECT_UILIMIT_WRITECLIPBOARD, JOBOBJECT_BASIC_UI_RESTRICTIONS,
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JobObjectBasicUIRestrictions,
            JobObjectExtendedLimitInformation, SetInformationJobObject,
        },
        Threading::{
            CREATE_NO_WINDOW, CREATE_SUSPENDED, CreateProcessW, DeleteProcThreadAttributeList,
            EXTENDED_STARTUPINFO_PRESENT, GetExitCodeProcess, InitializeProcThreadAttributeList,
            PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES, PROCESS_INFORMATION, ResumeThread,
            STARTUPINFOEXW, UpdateProcThreadAttribute, WaitForSingleObject,
        },
    },
};

pub fn run(policy: &SandboxPolicy, command: &[String]) -> HostResult<()> {
    let profile = policy
        .isolation_group
        .as_ref()
        .map(|value| format!("OpenAI.TyC.Shared.{}", &value[..32]))
        .unwrap_or_else(|| format!("OpenAI.TyContext.{}", uuid::Uuid::new_v4().simple()));
    let profile_wide = wide(&profile);
    let mut sid: PSID = std::ptr::null_mut();
    let hr = unsafe {
        CreateAppContainerProfile(
            profile_wide.as_ptr(),
            profile_wide.as_ptr(),
            profile_wide.as_ptr(),
            std::ptr::null(),
            0,
            &mut sid,
        )
    };
    let owns_profile = if hr >= 0 && !sid.is_null() {
        true
    } else if hr as u32 == 0x8007_00b7 {
        if !sid.is_null() {
            unsafe { FreeSid(sid) };
            sid = std::ptr::null_mut();
        }
        let derived =
            unsafe { DeriveAppContainerSidFromAppContainerName(profile_wide.as_ptr(), &mut sid) };
        if derived < 0 || sid.is_null() {
            return Err(HostError::Sandbox(format!(
                "appcontainer_profile_derive:{derived:#x}"
            )));
        }
        false
    } else {
        return Err(HostError::Sandbox(format!("appcontainer_profile:{hr:#x}")));
    };
    let app_temp = appcontainer_temp(sid);
    let network = app_temp.and_then(|temp| {
        crate::sandbox_windows_network::NetworkGuard::apply_package(&policy.network, sid)
            .map(|guard| (temp, guard))
    });
    let loopback = network.and_then(|(temp, network)| {
        LoopbackGuard::apply(policy, sid).map(|guard| (temp, network, guard))
    });
    let grants = loopback.and_then(|(temp, network, guard)| {
        grant_paths(policy, sid, Some(&temp)).map(|paths| (temp, network, guard, paths))
    });
    let result = match grants {
        Ok((app_temp, _network, _loopback, mut paths)) => {
            let launched = DesktopGuard::create(sid)
                .and_then(|desktop| launch_appcontainer(policy, command, sid, &desktop, &app_temp));
            let cleanup = paths.restore();
            launched.and(cleanup)
        }
        Err(error) => Err(error),
    };
    unsafe {
        FreeSid(sid);
        if owns_profile {
            DeleteAppContainerProfile(profile_wide.as_ptr());
        }
    }
    result
}

fn launch_appcontainer(
    policy: &SandboxPolicy,
    command: &[String],
    sid: PSID,
    desktop: &DesktopGuard,
    app_temp: &Path,
) -> HostResult<()> {
    let inherit_stdio = policy.process_kind == "command";
    let attribute_count = if inherit_stdio { 2 } else { 1 };
    let mut bytes = 0usize;
    unsafe {
        InitializeProcThreadAttributeList(std::ptr::null_mut(), attribute_count, 0, &mut bytes);
    }
    if bytes == 0 {
        return Err(last("sandbox_attribute_size"));
    }
    let mut storage = vec![0u8; bytes];
    let attributes = storage.as_mut_ptr().cast();
    if unsafe { InitializeProcThreadAttributeList(attributes, attribute_count, 0, &mut bytes) } == 0
    {
        return Err(last("sandbox_attributes"));
    }
    let mut capabilities = SECURITY_CAPABILITIES {
        AppContainerSid: sid,
        Capabilities: std::ptr::null_mut(),
        CapabilityCount: 0,
        Reserved: 0,
    };
    if unsafe {
        UpdateProcThreadAttribute(
            attributes,
            0,
            PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES as usize,
            (&mut capabilities as *mut SECURITY_CAPABILITIES).cast(),
            std::mem::size_of::<SECURITY_CAPABILITIES>(),
            std::ptr::null_mut(),
            std::ptr::null(),
        )
    } == 0
    {
        unsafe { DeleteProcThreadAttributeList(attributes) };
        return Err(last("sandbox_attribute"));
    }
    let mut startup = STARTUPINFOEXW::default();
    startup.StartupInfo.cb = std::mem::size_of::<STARTUPINFOEXW>() as u32;
    startup.StartupInfo.lpDesktop = desktop.name.as_ptr().cast_mut();
    startup.lpAttributeList = attributes;
    let inherited = if inherit_stdio {
        Some(InheritedStdio::create()?)
    } else {
        None
    };
    let mut inherited_values = inherited
        .as_ref()
        .map(|handles| [handles.input.0, handles.output.0, handles.error.0])
        .unwrap_or([std::ptr::null_mut(); 3]);
    if let Some(handles) = &inherited {
        startup.StartupInfo.dwFlags |= windows_sys::Win32::System::Threading::STARTF_USESTDHANDLES;
        startup.StartupInfo.hStdInput = handles.input.0;
        startup.StartupInfo.hStdOutput = handles.output.0;
        startup.StartupInfo.hStdError = handles.error.0;
        if unsafe {
            UpdateProcThreadAttribute(
                attributes,
                0,
                windows_sys::Win32::System::Threading::PROC_THREAD_ATTRIBUTE_HANDLE_LIST as usize,
                inherited_values.as_mut_ptr().cast(),
                std::mem::size_of_val(&inherited_values),
                std::ptr::null_mut(),
                std::ptr::null(),
            )
        } == 0
        {
            unsafe { DeleteProcThreadAttributeList(attributes) };
            return Err(last("sandbox_handle_attribute"));
        }
    }
    let executable = wide(policy.executable.as_os_str());
    let cwd = wide(policy.cwd.as_os_str());
    let mut command_line = wide(
        command
            .iter()
            .map(|value| quote(value))
            .collect::<Vec<_>>()
            .join(" "),
    );
    let _environment = OutputEnvironmentGuard::apply(policy, app_temp);
    let mut process = PROCESS_INFORMATION::default();
    let created = unsafe {
        CreateProcessW(
            executable.as_ptr(),
            command_line.as_mut_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            if inherit_stdio { 1 } else { 0 },
            EXTENDED_STARTUPINFO_PRESENT | CREATE_SUSPENDED | CREATE_NO_WINDOW,
            std::ptr::null(),
            cwd.as_ptr(),
            &startup.StartupInfo,
            &mut process,
        )
    };
    unsafe { DeleteProcThreadAttributeList(attributes) };
    if created == 0 {
        return Err(last("appcontainer_create_process"));
    }
    let process_handle = OwnedHandle(process.hProcess);
    let thread_handle = OwnedHandle(process.hThread);
    let job = OwnedHandle(unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) });
    if job.0.is_null() {
        return Err(last("sandbox_job_create"));
    }
    let mut limits = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
    limits.BasicLimitInformation.LimitFlags =
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_ACTIVE_PROCESS;
    limits.BasicLimitInformation.ActiveProcessLimit = policy.process_limit;
    if (unsafe {
        SetInformationJobObject(
            job.0,
            JobObjectExtendedLimitInformation,
            (&limits as *const JOBOBJECT_EXTENDED_LIMIT_INFORMATION)
                .cast_mut()
                .cast(),
            std::mem::size_of_val(&limits) as u32,
        )
    } == 0
        || unsafe { AssignProcessToJobObject(job.0, process_handle.0) } == 0)
    {
        return Err(last("sandbox_job_assign"));
    }
    // The HANDLE/UI job restrictions deadlock Node/libuv child creation inside an
    // AppContainer. Command steps retain the AppContainer token, ACL boundary,
    // private desktop, network policy, kill-on-close job and active-process cap.
    // The single-process Oracle can safely take the additional UI restrictions.
    if policy.process_kind == "oracle" {
        let ui = JOBOBJECT_BASIC_UI_RESTRICTIONS {
            UIRestrictionsClass: JOB_OBJECT_UILIMIT_DESKTOP
                | JOB_OBJECT_UILIMIT_DISPLAYSETTINGS
                | JOB_OBJECT_UILIMIT_EXITWINDOWS
                | JOB_OBJECT_UILIMIT_GLOBALATOMS
                | JOB_OBJECT_UILIMIT_HANDLES
                | JOB_OBJECT_UILIMIT_READCLIPBOARD
                | JOB_OBJECT_UILIMIT_SYSTEMPARAMETERS
                | JOB_OBJECT_UILIMIT_WRITECLIPBOARD,
        };
        if unsafe {
            SetInformationJobObject(
                job.0,
                JobObjectBasicUIRestrictions,
                (&ui as *const JOBOBJECT_BASIC_UI_RESTRICTIONS)
                    .cast_mut()
                    .cast(),
                std::mem::size_of_val(&ui) as u32,
            )
        } == 0
        {
            return Err(last("sandbox_job_ui"));
        }
    }
    if unsafe { ResumeThread(thread_handle.0) } == u32::MAX {
        return Err(last("sandbox_resume"));
    }
    if unsafe { WaitForSingleObject(process_handle.0, policy.timeout_ms) } != WAIT_OBJECT_0 {
        return Err(HostError::Sandbox("sandbox_timeout".into()));
    }
    let mut exit = 0u32;
    if unsafe { GetExitCodeProcess(process_handle.0, &mut exit) } == 0 {
        return Err(last("sandbox_exit_code"));
    }
    if exit != 0 {
        return Err(HostError::Sandbox(format!("sandbox_child_exit_{exit}")));
    }
    Ok(())
}

#[cfg(test)]
#[path = "sandbox_windows_tests.rs"]
mod tests;
