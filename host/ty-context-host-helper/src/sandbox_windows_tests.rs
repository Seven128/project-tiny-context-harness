use crate::{
    sandbox::SandboxPolicy,
    sandbox_windows_acl::{FileAclSnapshot, update_file_acl},
    sandbox_windows_desktop::{DesktopGuard, UserObjectAclSnapshot},
    sandbox_windows_handle::wide,
    sandbox_windows_paths::grant_paths,
};
use std::fs;
use windows_sys::Win32::{
    Foundation::LocalFree,
    Security::{GetSecurityDescriptorLength, PSID},
    Storage::FileSystem::FILE_GENERIC_READ,
    System::StationsAndDesktops::GetProcessWindowStation,
};

#[test]
fn private_desktop_restores_the_existing_window_station_acl_exactly() {
    let sid = TestSid::restricted_code();
    let window_station = unsafe { GetProcessWindowStation() };
    assert!(!window_station.is_null());
    let before = UserObjectAclSnapshot::capture(window_station).expect("before window ACL");
    {
        let guard = DesktopGuard::create(sid.0).expect("private desktop");
        drop(guard);
    }
    let after = UserObjectAclSnapshot::capture(window_station).expect("after window ACL");
    assert_eq!(
        descriptor_bytes(&before.descriptor, before.byte_len as usize),
        descriptor_bytes(&after.descriptor, after.byte_len as usize)
    );
}

#[test]
fn granted_paths_restore_a_preexisting_logon_sid_ace_exactly() {
    let sid = TestSid::restricted_code();
    let root = std::env::temp_dir().join(format!(
        "ty-context-acl-restore-{}",
        uuid::Uuid::new_v4().simple()
    ));
    let read = root.join("read");
    let write = root.join("write");
    fs::create_dir_all(&read).expect("read directory");
    fs::create_dir_all(&write).expect("write directory");
    let executable = root.join("probe.exe");
    fs::write(&executable, b"not executed").expect("probe file");
    update_file_acl(&root, sid.0, FILE_GENERIC_READ, true, true).expect("preexisting logon ACE");
    let before = FileAclSnapshot::capture(&root).expect("before file ACL");
    let policy = SandboxPolicy {
        schema_version: "ty-context-host-sandbox-v1".into(),
        process_kind: "command".into(),
        isolation_group: None,
        node_preload: None,
        executable,
        cwd: read.clone(),
        read_paths: vec![read],
        write_paths: vec![write],
        protocol_output: None,
        diagnostic_output: None,
        timeout_ms: 1_000,
        network: "loopback".into(),
        allow_child_process: false,
        allow_worker: false,
        allow_addons: false,
        process_limit: 1,
    };
    let mut granted = grant_paths(&policy, sid.0, None).expect("grant paths");
    granted.restore().expect("restore paths");
    let after = FileAclSnapshot::capture(&root).expect("after file ACL");
    assert_eq!(
        descriptor_bytes(&before.descriptor, unsafe {
            GetSecurityDescriptorLength(before.descriptor.as_ptr().cast_mut().cast()) as usize
        }),
        descriptor_bytes(&after.descriptor, unsafe {
            GetSecurityDescriptorLength(after.descriptor.as_ptr().cast_mut().cast()) as usize
        })
    );
    fs::remove_dir_all(root).expect("cleanup");
}

fn descriptor_bytes(descriptor: &[usize], byte_len: usize) -> &[u8] {
    unsafe { std::slice::from_raw_parts(descriptor.as_ptr().cast::<u8>(), byte_len) }
}
struct TestSid(PSID);
impl TestSid {
    fn restricted_code() -> Self {
        use windows_sys::Win32::Security::Authorization::ConvertStringSidToSidW;
        let value = wide("S-1-5-12");
        let mut sid = std::ptr::null_mut();
        assert_ne!(
            unsafe { ConvertStringSidToSidW(value.as_ptr(), &mut sid) },
            0
        );
        assert!(!sid.is_null());
        Self(sid)
    }
}
impl Drop for TestSid {
    fn drop(&mut self) {
        unsafe { LocalFree(self.0) };
    }
}
