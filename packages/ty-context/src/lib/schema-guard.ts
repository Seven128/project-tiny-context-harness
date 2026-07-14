import { readConfig } from "./config.js";
import { CANONICAL_NPX_COMMAND, CURRENT_SCHEMA_VERSION } from "./constants.js";

export async function assertSupportedSchema(
  projectRoot: string,
  commandName: string,
): Promise<void> {
  const config = await readConfig(projectRoot);
  const message = unsupportedSchemaMessage(
    config.core.schema_version,
    commandName,
  );
  if (message) {
    throw new Error(message);
  }
}

export function unsupportedSchemaMessage(
  schemaVersion: string,
  commandName: string,
): string | undefined {
  const projectMajor = schemaMajor(schemaVersion);
  const supportedMajor = schemaMajor(CURRENT_SCHEMA_VERSION);
  if (
    projectMajor === undefined ||
    supportedMajor === undefined ||
    projectMajor <= supportedMajor
  ) {
    return undefined;
  }
  return [
    `unsupported Harness schema version ${schemaVersion}; this CLI supports schema ${CURRENT_SCHEMA_VERSION}`,
    `Refusing to run ${commandName} because older CLI versions must not rewrite newer projects`,
    `Use the canonical latest CLI: ${CANONICAL_NPX_COMMAND} ${commandName}`,
  ].join(". ");
}

export function schemaMajor(schemaVersion: string): number | undefined {
  const match = /^(\d+)/.exec(String(schemaVersion).trim());
  if (!match) {
    return undefined;
  }
  return Number.parseInt(match[1], 10);
}
