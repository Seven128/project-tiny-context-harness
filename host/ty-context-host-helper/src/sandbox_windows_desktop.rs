use crate::{
    HostError, HostResult,
    sandbox_windows_handle::{last, wide},
};
use windows_sys::Win32::{
    Foundation::{GENERIC_ALL, HANDLE, LocalFree},
    Security::{
        Authorization::{
            ConvertStringSecurityDescriptorToSecurityDescriptorW, EXPLICIT_ACCESS_W, GRANT_ACCESS,
            NO_MULTIPLE_TRUSTEE, REVOKE_ACCESS, SDDL_REVISION_1, SetEntriesInAclW, TRUSTEE_IS_SID,
            TRUSTEE_IS_UNKNOWN, TRUSTEE_W,
        },
        DACL_SECURITY_INFORMATION, GetSecurityDescriptorDacl, GetUserObjectSecurity,
        InitializeSecurityDescriptor, LABEL_SECURITY_INFORMATION, NO_INHERITANCE, PSID,
        SECURITY_DESCRIPTOR, SetSecurityDescriptorDacl, SetUserObjectSecurity,
    },
    System::StationsAndDesktops::{
        CloseDesktop, CreateDesktopW, GetProcessWindowStation, GetUserObjectInformationW, HDESK,
        UOI_NAME,
    },
};

pub struct DesktopGuard {
    pub name: Vec<u16>,
    desktop: HDESK,
    window_station: HANDLE,
    window_station_acl: UserObjectAclSnapshot,
}
impl DesktopGuard {
    pub fn create(sid: PSID) -> HostResult<Self> {
        let window_station = unsafe { GetProcessWindowStation() };
        if window_station.is_null() {
            return Err(last("sandbox_window_station"));
        }
        let station_name = user_object_name(window_station)?;
        let snapshot = UserObjectAclSnapshot::capture(window_station)?;
        if let Err(error) = update_user_object_acl(window_station, sid, GENERIC_ALL, true) {
            let _ = snapshot.restore(window_station);
            return Err(error);
        }
        let desktop_name = format!("TyContext_{}", uuid::Uuid::new_v4().simple());
        let desktop_name_wide = wide(&desktop_name);
        let desktop = unsafe {
            CreateDesktopW(
                desktop_name_wide.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                0,
                GENERIC_ALL,
                std::ptr::null(),
            )
        };
        if desktop.is_null() {
            let _ = snapshot.restore(window_station);
            return Err(last("sandbox_desktop_create"));
        }
        if let Err(error) = update_user_object_acl(desktop, sid, GENERIC_ALL, true)
            .and_then(|_| set_user_object_low_integrity(desktop))
        {
            unsafe { CloseDesktop(desktop) };
            let _ = snapshot.restore(window_station);
            return Err(error);
        }
        Ok(Self {
            name: wide(format!("{station_name}\\{desktop_name}")),
            desktop,
            window_station,
            window_station_acl: snapshot,
        })
    }
}
impl Drop for DesktopGuard {
    fn drop(&mut self) {
        let _ = self.window_station_acl.restore(self.window_station);
        unsafe { CloseDesktop(self.desktop) };
    }
}

pub(crate) struct UserObjectAclSnapshot {
    pub descriptor: Vec<usize>,
    pub byte_len: u32,
}
impl UserObjectAclSnapshot {
    pub fn capture(handle: HANDLE) -> HostResult<Self> {
        let security_info = DACL_SECURITY_INFORMATION;
        let mut needed = 0u32;
        unsafe {
            GetUserObjectSecurity(handle, &security_info, std::ptr::null_mut(), 0, &mut needed)
        };
        if needed == 0 {
            return Err(last("sandbox_user_object_snapshot_size"));
        }
        let words = (needed as usize).div_ceil(std::mem::size_of::<usize>());
        let mut descriptor = vec![0usize; words];
        if unsafe {
            GetUserObjectSecurity(
                handle,
                &security_info,
                descriptor.as_mut_ptr().cast(),
                needed,
                &mut needed,
            )
        } == 0
        {
            return Err(last("sandbox_user_object_snapshot"));
        }
        Ok(Self {
            descriptor,
            byte_len: needed,
        })
    }
    fn restore(&self, handle: HANDLE) -> HostResult<()> {
        if self.byte_len == 0 {
            return Err(HostError::Sandbox(
                "sandbox_user_object_snapshot_empty".into(),
            ));
        }
        let mut information = DACL_SECURITY_INFORMATION;
        if unsafe {
            SetUserObjectSecurity(
                handle,
                &mut information,
                self.descriptor.as_ptr().cast_mut().cast(),
            )
        } == 0
        {
            return Err(last("sandbox_user_object_restore"));
        }
        Ok(())
    }
}

fn set_user_object_low_integrity(handle: HANDLE) -> HostResult<()> {
    let sddl = wide("S:(ML;;NW;;;LW)");
    let mut descriptor = std::ptr::null_mut();
    if unsafe {
        ConvertStringSecurityDescriptorToSecurityDescriptorW(
            sddl.as_ptr(),
            SDDL_REVISION_1,
            &mut descriptor,
            std::ptr::null_mut(),
        )
    } == 0
    {
        return Err(last("sandbox_desktop_integrity_descriptor"));
    }
    let mut information = LABEL_SECURITY_INFORMATION;
    let applied = unsafe { SetUserObjectSecurity(handle, &mut information, descriptor) };
    unsafe { LocalFree(descriptor) };
    if applied == 0 {
        Err(last("sandbox_desktop_integrity"))
    } else {
        Ok(())
    }
}
fn user_object_name(handle: HANDLE) -> HostResult<String> {
    let mut needed = 0u32;
    unsafe { GetUserObjectInformationW(handle, UOI_NAME, std::ptr::null_mut(), 0, &mut needed) };
    if needed < 2 {
        return Err(last("sandbox_window_station_name_size"));
    }
    let mut bytes = vec![0u8; needed as usize];
    if unsafe {
        GetUserObjectInformationW(
            handle,
            UOI_NAME,
            bytes.as_mut_ptr().cast(),
            needed,
            &mut needed,
        )
    } == 0
    {
        return Err(last("sandbox_window_station_name"));
    }
    let words =
        unsafe { std::slice::from_raw_parts(bytes.as_ptr().cast::<u16>(), bytes.len() / 2) };
    Ok(String::from_utf16_lossy(words)
        .trim_end_matches('\0')
        .to_owned())
}
fn update_user_object_acl(handle: HANDLE, sid: PSID, mask: u32, grant: bool) -> HostResult<()> {
    let mut information = DACL_SECURITY_INFORMATION;
    let mut needed = 0u32;
    unsafe { GetUserObjectSecurity(handle, &information, std::ptr::null_mut(), 0, &mut needed) };
    if needed == 0 {
        return Err(last("sandbox_user_object_security_size"));
    }
    let mut bytes = vec![0u8; needed as usize];
    if unsafe {
        GetUserObjectSecurity(
            handle,
            &information,
            bytes.as_mut_ptr().cast(),
            needed,
            &mut needed,
        )
    } == 0
    {
        return Err(last("sandbox_user_object_security"));
    }
    let mut present = 0;
    let mut defaulted = 0;
    let mut old_acl = std::ptr::null_mut();
    if unsafe {
        GetSecurityDescriptorDacl(
            bytes.as_ptr().cast_mut().cast(),
            &mut present,
            &mut old_acl,
            &mut defaulted,
        )
    } == 0
        || present == 0
    {
        return Err(last("sandbox_user_object_dacl"));
    }
    let trustee = TRUSTEE_W {
        pMultipleTrustee: std::ptr::null_mut(),
        MultipleTrusteeOperation: NO_MULTIPLE_TRUSTEE,
        TrusteeForm: TRUSTEE_IS_SID,
        TrusteeType: TRUSTEE_IS_UNKNOWN,
        ptstrName: sid.cast(),
    };
    let access = EXPLICIT_ACCESS_W {
        grfAccessPermissions: mask,
        grfAccessMode: if grant { GRANT_ACCESS } else { REVOKE_ACCESS },
        grfInheritance: NO_INHERITANCE,
        Trustee: trustee,
    };
    let mut new_acl = std::ptr::null_mut();
    let status = unsafe { SetEntriesInAclW(1, &access, old_acl, &mut new_acl) };
    if status != 0 {
        return Err(HostError::Sandbox(format!(
            "sandbox_user_object_acl:{status}"
        )));
    }
    let mut descriptor = SECURITY_DESCRIPTOR::default();
    let applied = unsafe {
        InitializeSecurityDescriptor((&mut descriptor as *mut SECURITY_DESCRIPTOR).cast(), 1) != 0
            && SetSecurityDescriptorDacl(
                (&mut descriptor as *mut SECURITY_DESCRIPTOR).cast(),
                1,
                new_acl,
                0,
            ) != 0
            && SetUserObjectSecurity(
                handle,
                &mut information,
                (&mut descriptor as *mut SECURITY_DESCRIPTOR).cast(),
            ) != 0
    };
    unsafe { LocalFree(new_acl.cast()) };
    if applied {
        Ok(())
    } else {
        Err(last("sandbox_user_object_acl_apply"))
    }
}
