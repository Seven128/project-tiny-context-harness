# [Runtime / Operator Path] Runbook

本文件记录 operator/provisioning 恢复路径，不是 `Development Self-Test Report` 或 scenario evidence。

## 1. Recovery Summary

- Canonical path:
- Current state:
- Next command channel:
- Last known good checkpoint:
- Primary blocker:

## 2. Hard Constraints

- 会改变下一步动作的判断必须写在这里，并同步到 `plan.yaml#resume_capsule.do_not_retry` 或 implementation doc `Current Operator Path`。
- Example: PC 微信已登录后再次出现 QR 时，先判定 `rule_assumption_gap` vs `operator_induced_logout_or_session_reset`，不得直接进入重新扫码流程。

## 3. Operator Path

```txt
canonical:
credentials: Keychain item name or secret reference only
remote host:
command channel:
UI channel:
do not prefer:
```

## 4. Preconditions

- Required access:
- Required local tools:
- Required remote services:
- Safety / cleanup notes:

## 5. Resume Steps

1. 
2. 
3. 

## 6. Fallbacks And Diagnostics

- Preferred fallback:
- Diagnostic-only paths:
- Do not retry:

## 7. Linked Evidence

- Evidence index:
- Exploration appendix:
- Implementation doc:
