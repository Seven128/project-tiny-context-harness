import type {
  DeliveryControlV2,
  DeliveryObligationV2,
  DeliveryOwnerV2,
  KeyedPathV2,
  KeyedStatementV2,
} from "./long-task-delivery-types.js";
import {
  array,
  key,
  literal,
  object,
  PROOF_SURFACES,
  repositoryFiles,
  repositoryPattern,
  repositoryPatterns,
  string,
  text,
} from "./long-task-shape-primitives.js";

export function parseKeyedStatements(
  value: unknown,
  label: string,
): KeyedStatementV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, ["key", "statement"]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      statement: string(row.statement, `${itemLabel}.statement`),
    };
  });
}

export function parseKeyedPaths(value: unknown, label: string): KeyedPathV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, ["key", "path"]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      path: repositoryPattern(row.path, `${itemLabel}.path`),
    };
  });
}

export function parseControls(
  value: unknown,
  label: string,
): DeliveryControlV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(
      item,
      itemLabel,
      ["key", "location"],
      [
        "trigger",
        "input",
        "loading_state",
        "empty_state",
        "success_state",
        "failure_state",
        "feedback",
      ],
    );
    return {
      key: key(row.key, `${itemLabel}.key`),
      location: string(row.location, `${itemLabel}.location`),
      trigger: optionalText(row, "trigger", itemLabel),
      input: optionalText(row, "input", itemLabel),
      loading_state: optionalText(row, "loading_state", itemLabel),
      empty_state: optionalText(row, "empty_state", itemLabel),
      success_state: optionalText(row, "success_state", itemLabel),
      failure_state: optionalText(row, "failure_state", itemLabel),
      feedback: optionalText(row, "feedback", itemLabel),
    };
  });
}

export function parseOwner(value: unknown, label: string): DeliveryOwnerV2 {
  const row = object(value, label, ["label", "context_refs", "path_globs"]);
  return {
    label: string(row.label, `${label}.label`),
    context_refs: repositoryFiles(row.context_refs, `${label}.context_refs`),
    path_globs: repositoryPatterns(row.path_globs, `${label}.path_globs`),
  };
}

export function parseObligations(
  value: unknown,
  label: string,
): DeliveryObligationV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "statement",
      "required_proof_surfaces",
    ]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      statement: string(row.statement, `${itemLabel}.statement`),
      required_proof_surfaces: array(
        row.required_proof_surfaces,
        `${itemLabel}.required_proof_surfaces`,
      ).map((surface, surfaceIndex) =>
        literal(
          surface,
          PROOF_SURFACES,
          `${itemLabel}.required_proof_surfaces[${surfaceIndex}]`,
        ),
      ),
    };
  });
}

function optionalText(
  row: Record<string, unknown>,
  field: string,
  label: string,
): string {
  return Object.hasOwn(row, field) ? text(row[field], `${label}.${field}`) : "";
}
