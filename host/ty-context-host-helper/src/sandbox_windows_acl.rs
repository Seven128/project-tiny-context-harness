use crate::{
    HostError, HostResult,
    sandbox_windows_handle::{last, open_reparse, wide},
};
use std::{fs, os::windows::fs::MetadataExt, path::Path};
use windows_sys::Win32::{
    Foundation::LocalFree,
    Security::Authorization::{
        EXPLICIT_ACCESS_W, GRANT_ACCESS, GetNamedSecurityInfoW, GetSecurityInfo,
        NO_MULTIPLE_TRUSTEE, REVOKE_ACCESS, SE_FILE_OBJECT, SetEntriesInAclW, SetSecurityInfo,
        TRUSTEE_IS_SID, TRUSTEE_IS_UNKNOWN, TRUSTEE_W,
    },
    Security::{
        DACL_SECURITY_INFORMATION, GetSecurityDescriptorDacl, GetSecurityDescriptorLength,
        InitializeSecurityDescriptor, NO_INHERITANCE, PSID, SECURITY_DESCRIPTOR,
        SUB_CONTAINERS_AND_OBJECTS_INHERIT, SetFileSecurityW, SetSecurityDescriptorDacl,
    },
    Storage::FileSystem::FILE_ATTRIBUTE_REPARSE_POINT,
};

pub(crate) struct FileAclSnapshot {
    pub(crate) path: std::path::PathBuf,
    pub(crate) reparse: bool,
    pub(crate) descriptor: Vec<usize>,
}
impl FileAclSnapshot {
    pub(crate) fn capture(path: &Path) -> HostResult<Self> {
        let metadata = fs::symlink_metadata(path).map_err(|error| HostError::io(path, error))?;
        let reparse = metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0;
        let mut descriptor = std::ptr::null_mut();
        if reparse {
            let handle = open_reparse(path)?;
            let mut old_acl = std::ptr::null_mut();
            let status = unsafe {
                GetSecurityInfo(
                    handle.0,
                    SE_FILE_OBJECT,
                    DACL_SECURITY_INFORMATION,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    &mut old_acl,
                    std::ptr::null_mut(),
                    &mut descriptor,
                )
            };
            if status != 0 {
                return Err(HostError::Sandbox(format!(
                    "sandbox_acl_snapshot_read:{status}"
                )));
            }
        } else {
            let name = wide(path.as_os_str());
            let mut old_acl = std::ptr::null_mut();
            let status = unsafe {
                GetNamedSecurityInfoW(
                    name.as_ptr(),
                    SE_FILE_OBJECT,
                    DACL_SECURITY_INFORMATION,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    &mut old_acl,
                    std::ptr::null_mut(),
                    &mut descriptor,
                )
            };
            if status != 0 {
                return Err(HostError::Sandbox(format!(
                    "sandbox_acl_snapshot_read:{status}"
                )));
            }
        }
        if descriptor.is_null() {
            return Err(HostError::Sandbox("sandbox_acl_snapshot_empty".into()));
        }
        let byte_len = unsafe { GetSecurityDescriptorLength(descriptor) } as usize;
        if byte_len == 0 {
            unsafe { LocalFree(descriptor) };
            return Err(last("sandbox_acl_snapshot_length"));
        }
        let words = byte_len.div_ceil(std::mem::size_of::<usize>());
        let mut copy = vec![0usize; words];
        unsafe {
            std::ptr::copy_nonoverlapping(
                descriptor.cast::<u8>(),
                copy.as_mut_ptr().cast::<u8>(),
                byte_len,
            );
            LocalFree(descriptor);
        }
        Ok(Self {
            path: path.to_path_buf(),
            reparse,
            descriptor: copy,
        })
    }

    pub(crate) fn restore(&self) -> HostResult<()> {
        if self.reparse {
            let handle = open_reparse(&self.path)?;
            let mut present = 0;
            let mut defaulted = 0;
            let mut acl = std::ptr::null_mut();
            if unsafe {
                GetSecurityDescriptorDacl(
                    self.descriptor.as_ptr().cast_mut().cast(),
                    &mut present,
                    &mut acl,
                    &mut defaulted,
                )
            } == 0
                || present == 0
            {
                return Err(last("sandbox_acl_snapshot_dacl"));
            }
            let status = unsafe {
                SetSecurityInfo(
                    handle.0,
                    SE_FILE_OBJECT,
                    DACL_SECURITY_INFORMATION,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    acl,
                    std::ptr::null_mut(),
                )
            };
            if status != 0 {
                return Err(HostError::Sandbox(format!(
                    "sandbox_acl_restore:{}:{status}",
                    self.path.display()
                )));
            }
            return Ok(());
        }
        let name = wide(self.path.as_os_str());
        if unsafe {
            SetFileSecurityW(
                name.as_ptr(),
                DACL_SECURITY_INFORMATION,
                self.descriptor.as_ptr().cast_mut().cast(),
            )
        } == 0
        {
            return Err(HostError::Sandbox(format!(
                "sandbox_acl_restore:{}:{}",
                self.path.display(),
                std::io::Error::last_os_error()
            )));
        }
        Ok(())
    }
}

pub(crate) fn update_reparse_acl(path: &Path, sid: PSID, mask: u32, grant: bool) -> HostResult<()> {
    let handle = open_reparse(path)?;
    let mut old_acl = std::ptr::null_mut();
    let mut descriptor = std::ptr::null_mut();
    let status = unsafe {
        GetSecurityInfo(
            handle.0,
            SE_FILE_OBJECT,
            DACL_SECURITY_INFORMATION,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            &mut old_acl,
            std::ptr::null_mut(),
            &mut descriptor,
        )
    };
    if status != 0 {
        return Err(HostError::Sandbox(format!(
            "sandbox_reparse_acl_read:{status}"
        )));
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
    let merge = unsafe { SetEntriesInAclW(1, &access, old_acl, &mut new_acl) };
    if merge != 0 {
        unsafe { LocalFree(descriptor) };
        return Err(HostError::Sandbox(format!(
            "sandbox_reparse_acl_merge:{merge}"
        )));
    }
    let applied = unsafe {
        SetSecurityInfo(
            handle.0,
            SE_FILE_OBJECT,
            DACL_SECURITY_INFORMATION,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            new_acl,
            std::ptr::null_mut(),
        )
    };
    unsafe {
        LocalFree(new_acl.cast());
        LocalFree(descriptor)
    };
    if applied != 0 {
        return Err(HostError::Sandbox(format!(
            "sandbox_reparse_acl_apply:{applied}"
        )));
    }
    Ok(())
}

pub(crate) fn update_file_acl(
    path: &Path,
    sid: PSID,
    mask: u32,
    grant: bool,
    inherit: bool,
) -> HostResult<()> {
    let name = wide(path.as_os_str());
    let mut old_acl = std::ptr::null_mut();
    let mut descriptor = std::ptr::null_mut();
    let status = unsafe {
        GetNamedSecurityInfoW(
            name.as_ptr(),
            SE_FILE_OBJECT,
            DACL_SECURITY_INFORMATION,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            &mut old_acl,
            std::ptr::null_mut(),
            &mut descriptor,
        )
    };
    if status != 0 {
        return Err(HostError::Sandbox(format!("sandbox_acl_read:{status}")));
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
        grfInheritance: if inherit {
            SUB_CONTAINERS_AND_OBJECTS_INHERIT
        } else {
            NO_INHERITANCE
        },
        Trustee: trustee,
    };
    let mut new_acl = std::ptr::null_mut();
    let merge = unsafe { SetEntriesInAclW(1, &access, old_acl, &mut new_acl) };
    if merge != 0 {
        unsafe { LocalFree(descriptor) };
        return Err(HostError::Sandbox(format!("sandbox_acl_merge:{merge}")));
    }
    let mut updated = SECURITY_DESCRIPTOR::default();
    let applied = unsafe {
        InitializeSecurityDescriptor((&mut updated as *mut SECURITY_DESCRIPTOR).cast(), 1) != 0
            && SetSecurityDescriptorDacl(
                (&mut updated as *mut SECURITY_DESCRIPTOR).cast(),
                1,
                new_acl,
                0,
            ) != 0
            && SetFileSecurityW(
                name.as_ptr(),
                DACL_SECURITY_INFORMATION,
                (&mut updated as *mut SECURITY_DESCRIPTOR).cast(),
            ) != 0
    };
    unsafe {
        LocalFree(new_acl.cast());
        LocalFree(descriptor)
    };
    if !applied {
        return Err(HostError::Sandbox(format!(
            "sandbox_acl_apply:{}:{}",
            path.display(),
            std::io::Error::last_os_error()
        )));
    }
    Ok(())
}
