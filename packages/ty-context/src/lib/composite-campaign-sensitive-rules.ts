export const COMPOSITE_REDACTED = "[REDACTED]";

export function secretLabelForKey(key: string): string {
  const normalized = normalizeSensitiveKey(key);
  if (/(?:^|_)(?:password|passwd|pwd)$/.test(normalized)) return "password";
  if (/(?:^|_)(?:api_key|secret_access_key)$/.test(normalized)) return "api_key";
  if (/(?:^|_)private_key$/.test(normalized)) return "private_key";
  if (/(?:^|_)(?:cookie|cookies|set_cookie|set_cookies)$/.test(normalized)) return "cookie";
  if (/(?:^|_)authorization$/.test(normalized)) return "authorization";
  if (/(?:^|_)secret$/.test(normalized)) return "secret";
  return "token";
}

export function isSensitiveKey(key: string): boolean {
  const normalized = normalizeSensitiveKey(key);
  return /^(?:password|passwd|pwd|token|access_token|refresh_token|api_key|apikey|client_secret|secret|private_key|cookie|cookies|set_cookie|set_cookies|authorization)$/.test(normalized) ||
    /(?:^|_)(?:password|passwd|pwd|token|secret|api_key|secret_access_key|private_key|cookie|cookies|authorization)$/.test(normalized);
}

export function isRedactedValue(value: string): boolean {
  return value.trim().replace(/^["']|["']$/g, "") === COMPOSITE_REDACTED;
}

export function isRedactedPropertyValue(property: string | undefined, value: string): boolean {
  if (!property) return false;
  const normalized = normalizeSensitiveKey(property);
  if (/(?:^|_)authorization$/.test(normalized)) {
    return /^\s*(?:bearer|basic)\s+\[REDACTED\]\s*$/i.test(value) || isRedactedValue(value);
  }
  if (/(?:^|_)(?:cookie|cookies|set_cookie|set_cookies)$/.test(normalized)) return isRedactedCookieValue(value);
  return false;
}

export function isExplicitlyRedacted(key: string, value: string): boolean {
  if (isRedactedValue(value)) return true;
  const normalized = normalizeSensitiveKey(key);
  if (/(?:^|_)authorization$/.test(normalized)) return /^\s*(?:bearer|basic)\s+\[REDACTED\]\s*$/i.test(value);
  if (/(?:^|_)(?:cookie|cookies|set_cookie|set_cookies)$/.test(normalized)) return isRedactedCookieValue(value);
  return false;
}

export function isHighConfidenceCredential(value: string): boolean {
  const candidate = value.trim();
  return !isRedactedValue(candidate) && (candidate.length >= 20 || (candidate.length >= 8 && /[0-9._-]/.test(candidate)));
}

export function normalizeSensitiveKey(value: string): string {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}

function isRedactedCookieValue(value: string): boolean {
  return isRedactedValue(value) || /^(?:[^=;\s]+\s*=\s*)?\[REDACTED\]\s*$/i.test(value.trim());
}
