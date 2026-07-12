use crate::{HostError, HostResult};
use windows_sys::Win32::{
    Foundation::HANDLE,
    NetworkManagement::WindowsFilteringPlatform::{
        FWP_ACTION_BLOCK, FWP_CONDITION_VALUE0, FWP_CONDITION_VALUE0_0, FWP_EMPTY, FWP_MATCH_EQUAL,
        FWP_MATCH_NOT_EQUAL, FWP_SID, FWP_V4_ADDR_AND_MASK, FWP_V4_ADDR_MASK, FWP_V6_ADDR_AND_MASK,
        FWP_V6_ADDR_MASK, FWP_VALUE0, FWPM_ACTION0, FWPM_CONDITION_ALE_PACKAGE_ID,
        FWPM_CONDITION_IP_REMOTE_ADDRESS, FWPM_DISPLAY_DATA0, FWPM_FILTER_CONDITION0,
        FWPM_FILTER_FLAG_CLEAR_ACTION_RIGHT, FWPM_FILTER0, FWPM_LAYER_ALE_AUTH_CONNECT_V4,
        FWPM_LAYER_ALE_AUTH_CONNECT_V6, FWPM_SESSION_FLAG_DYNAMIC, FWPM_SESSION0,
        FWPM_SUBLAYER_UNIVERSAL, FwpmEngineClose0, FwpmEngineOpen0, FwpmFilterAdd0,
    },
    Security::PSID,
    System::Rpc::RPC_C_AUTHN_WINNT,
};

pub struct NetworkGuard(HANDLE);

impl NetworkGuard {
    pub fn apply_package(policy: &str, sid: PSID) -> HostResult<Self> {
        let guard = Self::open()?;
        guard.install(policy, package_condition(sid))?;
        Ok(guard)
    }

    fn open() -> HostResult<Self> {
        let session = FWPM_SESSION0 {
            flags: FWPM_SESSION_FLAG_DYNAMIC,
            ..Default::default()
        };
        let mut engine = std::ptr::null_mut();
        let status = unsafe {
            FwpmEngineOpen0(
                std::ptr::null(),
                RPC_C_AUTHN_WINNT,
                std::ptr::null(),
                &session,
                &mut engine,
            )
        };
        if status != 0 || engine.is_null() {
            return Err(wfp("sandbox_wfp_engine", status));
        }
        Ok(Self(engine))
    }

    fn install(&self, policy: &str, scope: FWPM_FILTER_CONDITION0) -> HostResult<()> {
        if policy == "loopback" {
            self.block_non_loopback_v4(scope)?;
            self.block_non_loopback_v6(scope)
        } else {
            self.block_all(scope, FWPM_LAYER_ALE_AUTH_CONNECT_V4)?;
            self.block_all(scope, FWPM_LAYER_ALE_AUTH_CONNECT_V6)
        }
    }

    fn block_all(
        &self,
        scope: FWPM_FILTER_CONDITION0,
        layer: windows_sys::core::GUID,
    ) -> HostResult<()> {
        let mut conditions = [scope];
        self.add(layer, &mut conditions)
    }

    fn block_non_loopback_v4(&self, scope: FWPM_FILTER_CONDITION0) -> HostResult<()> {
        let mut loopback = FWP_V4_ADDR_AND_MASK {
            addr: 0x7f00_0000,
            mask: 0xff00_0000,
        };
        let mut conditions = [
            scope,
            FWPM_FILTER_CONDITION0 {
                fieldKey: FWPM_CONDITION_IP_REMOTE_ADDRESS,
                matchType: FWP_MATCH_NOT_EQUAL,
                conditionValue: FWP_CONDITION_VALUE0 {
                    r#type: FWP_V4_ADDR_MASK,
                    Anonymous: FWP_CONDITION_VALUE0_0 {
                        v4AddrMask: &mut loopback,
                    },
                },
            },
        ];
        self.add(FWPM_LAYER_ALE_AUTH_CONNECT_V4, &mut conditions)
    }

    fn block_non_loopback_v6(&self, scope: FWPM_FILTER_CONDITION0) -> HostResult<()> {
        let mut address = [0u8; 16];
        address[15] = 1;
        let mut loopback = FWP_V6_ADDR_AND_MASK {
            addr: address,
            prefixLength: 128,
        };
        let mut conditions = [
            scope,
            FWPM_FILTER_CONDITION0 {
                fieldKey: FWPM_CONDITION_IP_REMOTE_ADDRESS,
                matchType: FWP_MATCH_NOT_EQUAL,
                conditionValue: FWP_CONDITION_VALUE0 {
                    r#type: FWP_V6_ADDR_MASK,
                    Anonymous: FWP_CONDITION_VALUE0_0 {
                        v6AddrMask: &mut loopback,
                    },
                },
            },
        ];
        self.add(FWPM_LAYER_ALE_AUTH_CONNECT_V6, &mut conditions)
    }

    fn add(
        &self,
        layer: windows_sys::core::GUID,
        conditions: &mut [FWPM_FILTER_CONDITION0],
    ) -> HostResult<()> {
        let mut name = "Tiny Context sandbox network boundary"
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect::<Vec<_>>();
        let filter = FWPM_FILTER0 {
            displayData: FWPM_DISPLAY_DATA0 {
                name: name.as_mut_ptr(),
                description: std::ptr::null_mut(),
            },
            flags: FWPM_FILTER_FLAG_CLEAR_ACTION_RIGHT,
            layerKey: layer,
            subLayerKey: FWPM_SUBLAYER_UNIVERSAL,
            weight: FWP_VALUE0 {
                r#type: FWP_EMPTY,
                ..Default::default()
            },
            numFilterConditions: conditions.len() as u32,
            filterCondition: conditions.as_mut_ptr(),
            action: FWPM_ACTION0 {
                r#type: FWP_ACTION_BLOCK,
                ..Default::default()
            },
            ..Default::default()
        };
        let mut id = 0u64;
        let status = unsafe { FwpmFilterAdd0(self.0, &filter, std::ptr::null_mut(), &mut id) };
        if status != 0 {
            return Err(wfp("sandbox_wfp_filter", status));
        }
        Ok(())
    }
}

impl Drop for NetworkGuard {
    fn drop(&mut self) {
        if !self.0.is_null() {
            unsafe { FwpmEngineClose0(self.0) };
        }
    }
}

fn package_condition(sid: PSID) -> FWPM_FILTER_CONDITION0 {
    FWPM_FILTER_CONDITION0 {
        fieldKey: FWPM_CONDITION_ALE_PACKAGE_ID,
        matchType: FWP_MATCH_EQUAL,
        conditionValue: FWP_CONDITION_VALUE0 {
            r#type: FWP_SID,
            Anonymous: FWP_CONDITION_VALUE0_0 { sid: sid.cast() },
        },
    }
}

fn wfp(code: &str, status: u32) -> HostError {
    HostError::Sandbox(format!("{code}:{status}"))
}
