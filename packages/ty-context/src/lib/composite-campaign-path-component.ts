const WINDOWS_RESERVED = /^(?:CON|PRN|AUX|NUL|CLOCK\$|CONIN\$|CONOUT\$|COM(?:[1-9¹²³])|LPT(?:[1-9¹²³]))$/i;

export function validatePortablePathComponent(value: string, label = "Path"): string {
  const basename = value.split(".", 1)[0];
  if (WINDOWS_RESERVED.test(basename)) {
    throw new Error(`${label} uses a reserved Windows device name: ${value}`);
  }
  if (
    !value || value === "." || value === ".." ||
    /[\\/<>:"|?*\u0000-\u001f]/.test(value) || /[. ]$/.test(value) ||
    /^[\\/]/.test(value) || /^[A-Za-z]:/.test(value)
  ) {
    throw new Error(`${label} contains an unsafe portable path component: ${value}`);
  }
  return value;
}
