import type {
  DeliveryBindingV2,
  RollbackRecoveryV2,
} from "./long-task-delivery-types.js";
import {
  array,
  fail,
  key,
  literal,
  object,
  repositoryFile,
  repositoryPattern,
  repositoryPatterns,
  string,
  strings,
} from "./long-task-shape-primitives.js";

export function parseBindings(
  value: unknown,
  label: string,
): DeliveryBindingV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(
      item,
      itemLabel,
      ["key", "kind", "target", "carrier_paths"],
      ["existence", "verification_check_key"],
    );
    const kindValue = literal(
      row.kind,
      ["path_glob", "file", "verified"] as const,
      `${itemLabel}.kind`,
    );
    const verificationCheckKey = Object.hasOwn(row, "verification_check_key")
      ? key(row.verification_check_key, `${itemLabel}.verification_check_key`)
      : undefined;
    if (kindValue === "verified" && !verificationCheckKey)
      fail(`${itemLabel}.verification_check_key`, "is required for verified");
    if (kindValue !== "verified" && verificationCheckKey)
      fail(
        `${itemLabel}.verification_check_key`,
        "is only allowed for verified",
      );
    const target =
      kindValue === "file"
        ? repositoryFile(row.target, `${itemLabel}.target`)
        : kindValue === "path_glob"
          ? repositoryPattern(row.target, `${itemLabel}.target`)
          : string(row.target, `${itemLabel}.target`);
    return {
      key: key(row.key, `${itemLabel}.key`),
      kind: kindValue,
      target,
      carrier_paths: repositoryPatterns(
        row.carrier_paths,
        `${itemLabel}.carrier_paths`,
      ),
      existence: Object.hasOwn(row, "existence")
        ? literal(
            row.existence,
            ["existing", "planned"] as const,
            `${itemLabel}.existence`,
          )
        : "existing",
      ...(verificationCheckKey
        ? { verification_check_key: verificationCheckKey }
        : {}),
    };
  });
}

export function parseRollback(
  value: unknown,
  label: string,
): RollbackRecoveryV2 {
  const row = object(value, label, [
    "rollback",
    "recovery",
    "verification_check_keys",
  ]);
  return {
    rollback: string(row.rollback, `${label}.rollback`),
    recovery: string(row.recovery, `${label}.recovery`),
    verification_check_keys: strings(
      row.verification_check_keys,
      `${label}.verification_check_keys`,
    ),
  };
}
