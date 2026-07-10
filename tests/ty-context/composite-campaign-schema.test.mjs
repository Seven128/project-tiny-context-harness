import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  COMPOSITE_INPUT_CONTRACT,
  COMPOSITE_INPUT_CONTRACT_VERSION
} from "../../packages/ty-context/dist/lib/composite-input-contract.js";
import {
  canonicalJson,
  canonicalYaml,
  parseStrictJson,
  parseStrictYaml,
  sha256Hex,
  utf8ByteLength
} from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import {
  COMPOSITE_AUTHORING_PACKET_SCHEMA_VERSION,
  COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION,
  COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION,
  COMPOSITE_CAMPAIGN_SCHEMA_VERSION,
  SCOPE_FIT_RESULT_SCHEMA_VERSION
} from "../../packages/ty-context/dist/lib/composite-campaign-types.js";
import {
  validateCompositeAuthoringPacketV1,
  validateCompositeCampaignBindingV1,
  validateCompositeCampaignEventV1,
  validateCompositeCampaignV1,
  validateScopeFitResultV1
} from "../../packages/ty-context/dist/lib/composite-campaign-schema.js";
import * as packageApi from "../../packages/ty-context/dist/index.js";
import {
  AUTHORING_PACKET_SHA256,
  SCOPE_FIT_SHA256,
  bindingFixture,
  campaignFixture,
  eventFixtures,
  packetFields,
  packetFixture,
  reverseObjectKeysDeep,
  scopeFitFixture
} from "./composite-campaign-schema-fixtures.mjs";
import { registerScopeSchemaCases } from "./composite-campaign-schema-scope-cases.mjs";
import { registerPacketSchemaCases } from "./composite-campaign-schema-packet-cases.mjs";
import { registerCampaignSchemaCases } from "./composite-campaign-schema-campaign-cases.mjs";
import { registerBindingEventSchemaCases } from "./composite-campaign-schema-binding-event-cases.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("V1 schema constants and canonical codec byte domains are fixed", () => {
  assert.equal(SCOPE_FIT_RESULT_SCHEMA_VERSION, "scope-fit-result-v1");
  assert.equal(COMPOSITE_AUTHORING_PACKET_SCHEMA_VERSION, "composite-authoring-packet-v1");
  assert.equal(COMPOSITE_CAMPAIGN_SCHEMA_VERSION, "composite-campaign-v1");
  assert.equal(COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION, "composite-campaign-event-v1");
  assert.equal(COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION, "composite-campaign-binding-v1");

  const value = { schema_version: "fixture-v1", z: 1, nested: { b: true, a: "x" } };
  const json = canonicalJson(value);
  assert.equal(json, '{\n  "schema_version": "fixture-v1",\n  "z": 1,\n  "nested": {\n    "b": true,\n    "a": "x"\n  }\n}\n');
  assert.equal(sha256Hex(json), "097f53dff63d60ecaee5d8f165c6170cb7f02c8778f79aaec76821d5ee76bb4a");
  assert.equal(utf8ByteLength("A界\n"), 5);
  assert.equal(canonicalYaml({ schema_version: "fixture-v1", enabled: true }), "schema_version: fixture-v1\nenabled: true\n");
});

test("strict raw parsers reject duplicate keys and unsafe YAML features", () => {
  assert.throws(() => parseStrictJson('{"outer":{"same":1,"same":2}}'), /duplicate|unique/i);
  assert.throws(() => parseStrictJson('{outer:{"same":1}}'), /JSON|syntax/i);
  assert.throws(() => parseStrictYaml("outer:\n  same: 1\n  same: 2\n"), /duplicate|unique/i);
  assert.throws(() => parseStrictYaml("anchor: &a value\ncopy: *a\n"), /anchor|alias/i);
  assert.throws(() => parseStrictYaml("base: &base\n  x: 1\nmerged:\n  <<: *base\n"), /merge|anchor|alias/i);
  assert.throws(() => parseStrictYaml("merged:\n  <<:\n    x: 1\n"), /merge/i);
  assert.throws(() => parseStrictYaml("%YAML 1.2\n---\nvalue: 1\n"), /directive/i);
  assert.throws(() => parseStrictYaml("%TAG !! tag:yaml.org,2002:\n---\nvalue: plain\n"), /directive/i);
  assert.throws(() => parseStrictYaml("%TAG !! tag:example.invalid,2026:\n---\nvalue: plain\n"), /directive/i);
  assert.throws(() => parseStrictYaml("value: !custom tagged\n"), /tag/i);
  assert.throws(() => parseStrictYaml("value: !!str tagged\n"), /tag/i);
  assert.throws(() => parseStrictYaml("value: 1\n---\nvalue: 2\n"), /multiple|document/i);
  assert.throws(() => parseStrictYaml("? [a, b]\n: value\n"), /string|key|unsupported/i);

  const shared = { value: "same" };
  const repeated = canonicalYaml({ first: shared, second: shared });
  assert.equal(repeated, "first:\n  value: same\nsecond:\n  value: same\n");
  assert.doesNotMatch(repeated, /[&*][A-Za-z0-9_-]+/);
});

const middleHole = ["first", , "third"];
const sharedSparse = ["shared", , "tail"];
for (const [valueLabel, value] of [
  ["all holes", new Array(2)],
  ["middle hole", middleHole],
  ["structured-clone hole", structuredClone(middleHole)],
  ["shared alias path hole", { first: sharedSparse, second: sharedSparse }]
]) {
  for (const [codecLabel, encode] of [["JSON", canonicalJson], ["YAML", canonicalYaml]]) {
    test(`canonical ${codecLabel} rejects ${valueLabel} instead of hashing it as explicit null`, () => {
      assert.throws(() => encode(value), /sparse|array hole|missing.*index/i);
    });
  }
}

test("canonical codecs preserve explicit null array entries", () => {
  assert.equal(canonicalJson([null]), "[\n  null\n]\n");
  assert.equal(canonicalYaml([null]), "- null\n");
});

test("canonical codecs reject object metadata that can change or hide the serialized graph", () => {
  const cases = [];

  const enumerableToJson = { value: "safe", toJSON() { return { value: "different" }; } };
  cases.push(["enumerable toJSON", enumerableToJson]);

  const hiddenToJson = { value: "safe" };
  Object.defineProperty(hiddenToJson, "toJSON", {
    value() { return { value: "different" }; },
    enumerable: false
  });
  cases.push(["non-enumerable toJSON", hiddenToJson]);

  const enumerableAccessor = {};
  Object.defineProperty(enumerableAccessor, "secret", {
    get() { return "computed"; },
    enumerable: true
  });
  cases.push(["enumerable accessor", enumerableAccessor]);

  const hiddenAccessor = { value: "safe" };
  Object.defineProperty(hiddenAccessor, "secret", {
    get() { return "hidden"; },
    enumerable: false
  });
  cases.push(["non-enumerable accessor", hiddenAccessor]);

  const hiddenData = { value: "safe" };
  Object.defineProperty(hiddenData, "hidden", { value: "not serialized", enumerable: false });
  cases.push(["non-enumerable data", hiddenData]);

  const symbolProperty = { value: "safe", [Symbol("hidden")]: "not serialized" };
  cases.push(["symbol property", symbolProperty]);

  for (const [label, value] of cases) {
    for (const [codec, encode] of [["JSON", canonicalJson], ["YAML", canonicalYaml]]) {
      assert.throws(
        () => encode(value),
        /plain|canonical|own propert|enumerable|accessor|symbol|toJSON|serialized graph/i,
        `${codec}: ${label}`
      );
    }
  }
});

test("canonical codecs reject array metadata beyond length and dense data indexes", () => {
  const cases = [];
  const extra = ["safe"];
  extra.extra = "not serialized";
  cases.push(["enumerable extra property", extra]);

  const hidden = ["safe"];
  Object.defineProperty(hidden, "hidden", { value: "not serialized", enumerable: false });
  cases.push(["non-enumerable extra property", hidden]);

  const accessor = ["safe"];
  Object.defineProperty(accessor, "0", { get() { return "computed"; }, enumerable: true });
  cases.push(["accessor index", accessor]);

  const symbolProperty = ["safe"];
  symbolProperty[Symbol("hidden")] = "not serialized";
  cases.push(["symbol property", symbolProperty]);

  for (const [label, value] of cases) {
    for (const [codec, encode] of [["JSON", canonicalJson], ["YAML", canonicalYaml]]) {
      assert.throws(
        () => encode(value),
        /canonical|array|own propert|accessor|symbol|dense|serialized graph/i,
        `${codec}: ${label}`
      );
    }
  }
});

test("canonical codecs continue to support plain, null-prototype, and shared-reference data", () => {
  const nullPrototype = Object.assign(Object.create(null), { value: "plain" });
  const shared = { nested: true };
  assert.equal(canonicalJson({ nullPrototype, first: shared, second: shared }), [
    "{",
    '  "nullPrototype": {',
    '    "value": "plain"',
    "  },",
    '  "first": {',
    '    "nested": true',
    "  },",
    '  "second": {',
    '    "nested": true',
    "  }",
    "}",
    ""
  ].join("\n"));
  assert.equal(canonicalYaml({ first: shared, second: shared }), "first:\n  nested: true\nsecond:\n  nested: true\n");
});

test("canonical YAML preserves scalar terminal newlines while owning exactly one file newline", () => {
  const value = {
    zero: "tail",
    one: "tail\n",
    two: "tail\n\n",
    three: "tail\n\n\n"
  };
  const yaml = canonicalYaml(value);
  assert.equal(yaml, 'zero: tail\none: "tail\\n"\ntwo: "tail\\n\\n"\nthree: "tail\\n\\n\\n"\n');
  assert.deepEqual(parseStrictYaml(yaml), value);
  assert.equal(yaml.endsWith("\n"), true);
  assert.equal(yaml.endsWith("\n\n"), false);
  assert.equal(sha256Hex(yaml), "7376d09623391f6f47a114b0e53d02ab7c19af0d5f3e5c9c2b1dce3f8f262129");
});

test("the package index exports only approved public campaign contract surfaces", async () => {
  assert.equal(packageApi.COMPOSITE_INPUT_CONTRACT, COMPOSITE_INPUT_CONTRACT);
  assert.equal(packageApi.COMPOSITE_INPUT_CONTRACT_VERSION, COMPOSITE_INPUT_CONTRACT_VERSION);
  assert.equal(packageApi.COMPOSITE_PREFLIGHT_REPORT_VERSION, "composite-preflight-report-v1");
  assert.equal(packageApi.SCOPE_FIT_RESULT_SCHEMA_VERSION, SCOPE_FIT_RESULT_SCHEMA_VERSION);
  assert.equal(packageApi.COMPOSITE_AUTHORING_PACKET_SCHEMA_VERSION, COMPOSITE_AUTHORING_PACKET_SCHEMA_VERSION);
  assert.equal(packageApi.COMPOSITE_CAMPAIGN_SCHEMA_VERSION, COMPOSITE_CAMPAIGN_SCHEMA_VERSION);
  assert.equal(packageApi.COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION, COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION);
  assert.equal(packageApi.COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION, COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION);
  for (const name of [
    "canonicalJson", "parseStrictYaml", "resolveCompositeCampaignPaths",
    "sanitizeCompositeCampaignRequest", "validateCompositeCampaignV1", "createCampaign"
  ]) assert.equal(name in packageApi, false, name);

  const declarations = await readFile(new URL("../../packages/ty-context/dist/index.d.ts", import.meta.url), "utf8");
  for (const name of [
    "ScopeFitResultV1", "CompositeAuthoringPacketV1", "CompositeCampaignV1",
    "CompositeCampaignEventV1", "CompositeCampaignBindingV1", "CompositePreflightReport"
  ]) assert.match(declarations, new RegExp(`\\b${name}\\b`), name);
});

test("TypeScript consumers can named-import approved types but not campaign internals", async () => {
  const parent = path.join(REPO_ROOT, "tmp", "ty-context", "public-api-type-tests");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "case-"));
  try {
    const modulePath = relativeModuleSpecifier(root, path.join(REPO_ROOT, "packages/ty-context/dist/index.js"));
    const approved = [
      "ScopeFitResultV1", "CompositeAuthoringPacketV1", "CompositeCampaignV1",
      "CompositeCampaignEventV1", "CompositeCampaignBindingV1", "CompositePreflightReport"
    ];
    const allowed = await compileTypeFixture(root, "allowed.mts", `
import type { ${approved.join(", ")} } from ${JSON.stringify(modulePath)};
export type Approved = [${approved.join(", ")}];
`);
    assert.deepEqual(allowed, []);

    const forbidden = [
      "CompositeCampaignLoadedSnapshotV1", "CompositeCampaignPaths", "CompositeCampaignSanitizedRequest"
    ];
    const diagnostics = await compileTypeFixture(root, "forbidden.mts", `
import type { ${forbidden.join(", ")} } from ${JSON.stringify(modulePath)};
export type Leaked = [${forbidden.join(", ")}];
`);
    for (const name of forbidden) {
      assert.ok(diagnostics.some((entry) => entry.includes(name) && /no exported member/i.test(entry)), name);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("all public V1 validators accept complete canonical fixtures", () => {
  const scope = scopeFitFixture();
  const packet = packetFixture();
  const binding = bindingFixture();
  const campaign = campaignFixture(binding);
  assert.deepEqual(validateScopeFitResultV1(scope), scope);
  assert.deepEqual(validateCompositeAuthoringPacketV1(packet), packet);
  assert.deepEqual(validateCompositeCampaignBindingV1(binding), binding);
  assert.deepEqual(validateCompositeCampaignV1(campaign), campaign);
  for (const event of eventFixtures()) assert.deepEqual(validateCompositeCampaignEventV1(event), event);
});

test("schema validators restore canonical key order before hashing", () => {
  const normalizedScope = validateScopeFitResultV1(reverseObjectKeysDeep(scopeFitFixture()));
  assert.equal(sha256Hex(canonicalJson(normalizedScope)), SCOPE_FIT_SHA256);
  const normalizedPacket = validateCompositeAuthoringPacketV1(reverseObjectKeysDeep(packetFixture()));
  assert.equal(sha256Hex(canonicalJson(normalizedPacket)), AUTHORING_PACKET_SHA256);
  for (const document of COMPOSITE_INPUT_CONTRACT.documents) {
    assert.deepEqual(Object.keys(packetFields(normalizedPacket, document.id)), document.fields.map((field) => field.name));
  }
});

test("unknown future majors fail before unrelated shape errors", () => {
  for (const [validate, value] of [
    [validateScopeFitResultV1, { schema_version: "scope-fit-result-v9", extra: true }],
    [validateCompositeAuthoringPacketV1, { schema_version: "composite-authoring-packet-v2", extra: true }],
    [validateCompositeCampaignBindingV1, { schema_version: "composite-campaign-binding-v2", extra: true }],
    [validateCompositeCampaignEventV1, { schema_version: "composite-campaign-event-v8", extra: true }],
    [validateCompositeCampaignV1, { schema_version: "composite-campaign-v3", extra: true }]
  ]) assert.throws(() => validate(value), /unsupported future schema|future schema major/i);
});

registerScopeSchemaCases();
registerPacketSchemaCases();
registerCampaignSchemaCases();
registerBindingEventSchemaCases();

async function compileTypeFixture(root, name, source) {
  const file = path.join(root, name);
  await writeFile(file, source, "utf8");
  const program = ts.createProgram([file], {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    noEmit: true,
    skipLibCheck: true
  });
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
}

function relativeModuleSpecifier(from, target) {
  const relative = path.relative(from, target).replace(/\\/g, "/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}
