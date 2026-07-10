import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPOSITE_CAMPAIGN_EVENT_LINE_MAX_BYTES,
  COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES,
  assertCompositeCampaignEventLineSize,
  assertCompositeCampaignPacketSafe,
  assertCompositeCampaignTrackedFileSize,
  findCompositeCampaignPacketSecrets,
  sanitizeCompositeCampaignRequest
} from "../../packages/ty-context/dist/lib/composite-campaign-security.js";
import { sha256Hex, utf8ByteLength } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";

const syntheticCredential = (...parts) => parts.join("");

test("request sanitization is deterministic and redacts high-confidence secret families", () => {
  const raw = [
    "Authorization: Bearer bearer-secret-value",
    "Cookie: session=very-secret-cookie",
    "password = super-secret-password",
    `api_key: ${syntheticCredential("sk", "_live_", "abcdefghijklmnopqrstuvwxyz")}`,
    `token: ${syntheticCredential("gh", "p_", "abcdefghijklmnopqrstuvwxyz0123456789")}`,
    "-----BEGIN PRIVATE KEY-----",
    "cHJpdmF0ZS1rZXktYnl0ZXM=",
    "-----END PRIVATE KEY-----",
    "ordinary requirement remains"
  ].join("\r\n");

  const first = sanitizeCompositeCampaignRequest(raw);
  const second = sanitizeCompositeCampaignRequest(raw);
  assert.deepEqual(first, second);
  const expected = [
    "Authorization: Bearer [REDACTED]",
    "Cookie: [REDACTED]",
    "password = [REDACTED]",
    "api_key: [REDACTED]",
    "token: [REDACTED]",
    "[REDACTED]",
    "ordinary requirement remains",
    ""
  ].join("\n");
  assert.deepEqual(first, { content: expected, redaction_count: 6 });
  for (const secret of ["bearer-secret-value", "very-secret-cookie", "super-secret-password", "sk_live_", "ghp_", "cHJpdmF0"]) {
    assert.equal(first.content.includes(secret), false, secret);
  }
  assert.equal(sha256Hex(first.content), "3e2c3f2eb256fb50babf1f5f1f6999526f2e804fe07617fdc405f8bfa14ef5d0");
  assert.equal(utf8ByteLength(first.content), 152);
});

test("empty or comment-only sensitive assignment RHS fails closed before continuation text can persist", () => {
  for (const [label, raw, secret] of [
    ["YAML continuation", "password:\n  yaml-continuation-secret\n", "yaml-continuation-secret"],
    ["JSON continuation", '"password":\n  "json-continuation-secret"\n', "json-continuation-secret"],
    ["CRLF indented continuation", "  accessToken:\r\n    crlf-continuation-secret\r\n", "crlf-continuation-secret"],
    ["comment-only RHS", "privateKey: # supplied below\n  comment-continuation-secret\n", "comment-continuation-secret"],
    ["empty at EOF", "sessionCookie:\n", ""],
    ["empty before peer", "proxyAuthorization:\nordinary: preserved\n", ""],
    ["flow JSON empty before close", '{"password":}\n', ""],
    ["flow JSON empty before sibling", '{"password":, "ordinary": 1}\n', ""],
    ["flow JSON camel key with spaces", '{"accessToken" :   , "ordinary": 1}\n', ""],
    ["flow empty before array close", '{"privateKey": ]\n', ""]
  ]) {
    assert.throws(() => sanitizeCompositeCampaignRequest(raw), (error) => {
      assert.match(error.message, /sensitive|assignment|empty|ambiguous|refus/i, label);
      if (secret) assert.doesNotMatch(error.message, new RegExp(secret), label);
      return true;
    });
    assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: raw }).map((finding) => finding.pointer), ["/notes"], label);
    assert.throws(() => assertCompositeCampaignPacketSafe({ notes: raw }), (error) => {
      if (secret) assert.doesNotMatch(error.message, new RegExp(secret), label);
      return true;
    });
  }
});

test("explicit redaction markers are accepted without being reported as secrets", () => {
  const request = sanitizeCompositeCampaignRequest("token: [REDACTED]\npassword=[REDACTED]\n");
  assert.equal(request.redaction_count, 0);
  assert.equal(request.content, "token: [REDACTED]\npassword=[REDACTED]\n");
  assert.deepEqual(findCompositeCampaignPacketSecrets({ token: "[REDACTED]", nested: ["Bearer [REDACTED]"] }), []);
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: "Cookie: session=[REDACTED]" }), []);
  assert.doesNotThrow(() => assertCompositeCampaignPacketSafe({ api_key: "[REDACTED]" }));
  assert.deepEqual(sanitizeCompositeCampaignRequest("Cookie: session=[REDACTED]\n"), {
    content: "Cookie: session=[REDACTED]\n",
    redaction_count: 0
  });
});

test("high-confidence sk provider keys are redacted from requests and rejected in packets", () => {
  const credentials = [
    syntheticCredential("sk", "-proj-", "abcdefghijklmnopqrstuvwxyz"),
    syntheticCredential("sk", "-ant-api03-", "AbCdEfGhIjKlMnOpQrStUvWxYz012345"),
    syntheticCredential("sk", "-", "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"),
    syntheticCredential("sk", "-", "AbCdEfGhIjKl_MnOpQrSt-UvWxYz0123456789")
  ];
  for (const credential of credentials) {
    assert.deepEqual(sanitizeCompositeCampaignRequest(`Use ${credential}\n`), {
      content: "Use [REDACTED]\n",
      redaction_count: 1
    }, credential.slice(0, 12));
    assert.deepEqual(
      findCompositeCampaignPacketSecrets({ nested: credential }).map((finding) => finding.pointer),
      ["/nested"],
      credential.slice(0, 12)
    );
  }
});

test("recursive packet scanning rejects nested secret families without echoing secret values", () => {
  const packet = {
    ordinary: "keep",
    nested: {
      credentials: [
        { password: "packet-password-value" },
        "Authorization: Bearer packet-bearer-value",
        { api_key: syntheticCredential("sk", "_test_", "abcdefghijklmnopqrstuvwxyz") },
        "-----BEGIN PRIVATE KEY-----\ncGFja2V0LXByaXZhdGUta2V5\n-----END PRIVATE KEY-----",
        "Cookie: session=packet-cookie-secret",
        { refresh_token: "refresh-token-secret-value" },
        { cookie: "session=object-cookie-secret" },
        { authorization: "Bearer object-bearer-secret" },
        "-----BEGIN RSA PRIVATE KEY-----\nUlNBLXByaXZhdGU=\n-----END RSA PRIVATE KEY-----",
        "-----BEGIN EC PRIVATE KEY-----\nRUMtcHJpdmF0ZQ==\n-----END EC PRIVATE KEY-----",
        "-----BEGIN OPENSSH PRIVATE KEY-----\nT1BFTlNTSC1wcml2YXRl\n-----END OPENSSH PRIVATE KEY-----"
      ]
    }
  };
  const findings = findCompositeCampaignPacketSecrets(packet);
  assert.deepEqual(findings.map((finding) => finding.pointer), [
    "/nested/credentials/0/password",
    "/nested/credentials/1",
    "/nested/credentials/2/api_key",
    "/nested/credentials/3",
    "/nested/credentials/4",
    "/nested/credentials/5/refresh_token",
    "/nested/credentials/6/cookie",
    "/nested/credentials/7/authorization",
    "/nested/credentials/8",
    "/nested/credentials/9",
    "/nested/credentials/10"
  ]);
  assert.ok(findings.every((finding) => !JSON.stringify(finding).includes("packet-password-value")));
  assert.ok(findings.every((finding) => !JSON.stringify(finding).includes("packet-bearer-value")));
  assert.throws(() => assertCompositeCampaignPacketSafe(packet), (error) => {
    assert.match(error.message, /secret|credential/i);
    assert.doesNotMatch(error.message, /packet-password-value|packet-bearer-value|packet-cookie-secret|object-cookie-secret|object-bearer-secret|refresh-token-secret-value|sk_test_|cGFja2V0|UlNBL|RUMt|T1BFT/);
    return true;
  });
});

test("high-confidence sanitization does not redact benign requirement language", () => {
  const benign = [
    "Token budget: 120000 characters",
    "The password policy requires rotation.",
    "Document the API-key field without including a value.",
    "Use token-based pagination.",
    "token_count: 8",
    "The private key policy requires annual review.",
    "Document the private-key field without including a value.",
    "private_key is the schema field name, not a credential.",
    "Use sk-example as a short documentation placeholder.",
    "Document the literal sk-<long random> credential shape without a value.",
    ""
  ].join("\n");
  assert.deepEqual(sanitizeCompositeCampaignRequest(benign), { content: benign, redaction_count: 0 });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: benign }), []);
});

test("private-key scalar assignments redact whole request values and remain forbidden in packets", () => {
  const raw = [
    "private_key: line-private-key-secret",
    "Use private-key = inline-private-key-secret",
    '\"private_key\": \"quoted private key secret tail\"',
    "- 'private-key': bullet-private-key-secret",
    ""
  ].join("\n");
  const sanitized = sanitizeCompositeCampaignRequest(raw);
  assert.deepEqual(sanitized, {
    content: [
      "private_key: [REDACTED]",
      "Use private-key = [REDACTED]",
      '\"private_key\": [REDACTED]',
      "- 'private-key': [REDACTED]",
      ""
    ].join("\n"),
    redaction_count: 4
  });
  assert.doesNotMatch(sanitized.content, /line-private|inline-private|quoted private|bullet-private/);

  const packet = { notes: raw.split("\n").slice(0, -1) };
  assert.deepEqual(findCompositeCampaignPacketSecrets(packet).map((finding) => finding.pointer), [
    "/notes/0", "/notes/1", "/notes/2", "/notes/3"
  ]);
  assert.throws(() => assertCompositeCampaignPacketSafe(packet), (error) => {
    assert.doesNotMatch(error.message, /line-private|inline-private|quoted private|bullet-private/);
    return true;
  });

  const explicitlyRedacted = [
    "private_key: [REDACTED]",
    "Use private-key = [REDACTED]",
    '\"private_key\": \"[REDACTED]\"',
    "- 'private-key': [REDACTED]",
    ""
  ].join("\n");
  assert.deepEqual(sanitizeCompositeCampaignRequest(explicitlyRedacted), {
    content: explicitlyRedacted,
    redaction_count: 0
  });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: explicitlyRedacted }), []);
});

test("sensitive YAML block scalars are replaced as one line and their bodies are discarded", () => {
  const indicators = ["|", "|-", "|+", ">", ">-", ">+"];
  for (const [index, indicator] of indicators.entries()) {
    const eol = index % 2 === 0 ? "\n" : "\r\n";
    const secret = `synthetic-block-secret-${index}`;
    const raw = [
      `password: ${indicator}`,
      `  ${secret}`,
      "  second secret line",
      "next_peer: preserved",
      ""
    ].join(eol);
    const sanitized = sanitizeCompositeCampaignRequest(raw);
    assert.deepEqual(sanitized, {
      content: "password: [REDACTED]\nnext_peer: preserved\n",
      redaction_count: 1
    }, indicator);
    assert.equal(sanitized.content.includes(secret), false, indicator);
    assert.deepEqual(
      findCompositeCampaignPacketSecrets({ notes: raw }).map((finding) => finding.pointer),
      ["/notes"],
      indicator
    );
  }

  const quotedBullet = [
    '- "api_key": >+',
    "    quoted-bullet-secret",
    "  next_peer: preserved",
    "- 'token': |",
    "    second-bullet-secret",
    "- description: ordinary requirement",
    ""
  ].join("\n");
  const sanitizedBullet = sanitizeCompositeCampaignRequest(quotedBullet);
  assert.deepEqual(sanitizedBullet, {
    content: [
      '- "api_key": [REDACTED]',
      "  next_peer: preserved",
      "- 'token': [REDACTED]",
      "- description: ordinary requirement",
      ""
    ].join("\n"),
    redaction_count: 2
  });
  assert.doesNotMatch(sanitizedBullet.content, /quoted-bullet-secret|second-bullet-secret/);
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: quotedBullet }).map((finding) => finding.pointer), ["/notes"]);
});

for (const [label, raw, secret] of [
  ["Markdown blockquote", "> password: |\n>   markdown-block-secret\nordinary: preserved\n", "markdown-block-secret"],
  ["numbered-list prefix", "1. password: >-\n   numbered-block-secret\nordinary: preserved\n", "numbered-block-secret"],
  ["flow prefix", "{password: |\n  flow-block-secret\n}\n", "flow-block-secret"],
  ["explicit YAML tag", "password: !!str |\n  tagged-block-secret\nordinary: preserved\n", "tagged-block-secret"],
  ["YAML anchor", "password: &pw >-\n  anchored-block-secret\nordinary: preserved\n", "anchored-block-secret"],
  ["indent indicator", "password: |2\n  indicated-block-secret\nordinary: preserved\n", "indicated-block-secret"]
]) {
  test(`non-simple sensitive YAML block form ${label} fails closed without echoing its body`, () => {
    assert.throws(() => sanitizeCompositeCampaignRequest(raw), (error) => {
      assert.match(error.message, /YAML|block|ambiguous|unsupported|secret/i, label);
      assert.equal(error.message.includes(secret), false, label);
      return true;
    });
    assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: raw }).map((finding) => finding.pointer), ["/notes"]);
  });
}

test("a sensitive block marker with unsupported trailing syntax fails closed before its body", () => {
  const raw = "password: |2 unexpected\n  yaml-trailing-body-secret\nordinary: preserved\n";
  assert.throws(() => sanitizeCompositeCampaignRequest(raw), (error) => {
    assert.match(error.message, /YAML|block|ambiguous|unsupported|secret/i);
    assert.doesNotMatch(error.message, /yaml-trailing-body-secret/);
    return true;
  });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: raw }).map((finding) => finding.pointer), ["/notes"]);
});

test("ambiguous sensitive YAML block indentation fails closed", () => {
  const ambiguous = "password: |\n    first-secret\n  ambiguous-indent\nnext_peer: preserved\n";
  assert.throws(() => sanitizeCompositeCampaignRequest(ambiguous), /YAML|block|indent|ambiguous|secret/i);

  const missingIndent = "password: |\nsynthetic-unindented-secret\nnext_peer: preserved\n";
  assert.throws(() => sanitizeCompositeCampaignRequest(missingIndent), /YAML|block|indent|ambiguous|secret/i);

  const unsupportedIndicator = "password: |2\n  synthetic-indicator-secret\nnext_peer: preserved\n";
  assert.throws(() => sanitizeCompositeCampaignRequest(unsupportedIndicator), /YAML|block|indicator|unsupported|secret/i);
});

for (const [label, raw, secret] of [
  ["leading tab", "\tpassword: |\n\t  leading-tab-secret\nnext_peer: preserved\n", "leading-tab-secret"],
  ["tab after colon", "password:\t|\n  colon-tab-secret\nnext_peer: preserved\n", "colon-tab-secret"],
  ["tab after bullet", "-\tpassword: |\n  bullet-tab-secret\nnext_peer: preserved\n", "bullet-tab-secret"],
  ["mixed tabs", " \t- password:\t>\n    mixed-tab-secret\nnext_peer: preserved\n", "mixed-tab-secret"]
]) {
  test(`sensitive YAML block scalar ${label} fails closed without echoing its secret body`, () => {
    assert.throws(() => sanitizeCompositeCampaignRequest(raw), (error) => {
      assert.match(error.message, /YAML|block|tab|ambiguous|secret/i, label);
      assert.equal(error.message.includes(secret), false, label);
      return true;
    }, label);
  });
}

test("Markdown bullets plus inline and bare Bearer credentials cannot enter tracked content", () => {
  const raw = [
    "- password: markdown-bullet-secret",
    "- Cookie: session=markdown-cookie-secret",
    "Use Authorization: Bearer inline-bearer-secret",
    "Bearer bare-bearer-secret",
    ""
  ].join("\n");
  assert.deepEqual(sanitizeCompositeCampaignRequest(raw), {
    content: [
      "- password: [REDACTED]",
      "- Cookie: [REDACTED]",
      "Use Authorization: Bearer [REDACTED]",
      "Bearer [REDACTED]",
      ""
    ].join("\n"),
    redaction_count: 4
  });

  const packet = { notes: raw.split("\n").slice(0, -1) };
  assert.deepEqual(findCompositeCampaignPacketSecrets(packet).map((finding) => finding.pointer), [
    "/notes/0", "/notes/1", "/notes/2", "/notes/3"
  ]);
  assert.throws(() => assertCompositeCampaignPacketSafe(packet), (error) => {
    assert.doesNotMatch(error.message, /markdown-bullet-secret|markdown-cookie-secret|inline-bearer-secret|bare-bearer-secret/);
    return true;
  });

  const benign = "Bearer authentication is the documented scheme, not a credential.\n";
  assert.deepEqual(sanitizeCompositeCampaignRequest(benign), { content: benign, redaction_count: 0 });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: benign }), []);
});

test("inline assignments, env exports, JSON credentials, and alphabetic bearer values are sanitized", () => {
  const raw = [
    "Use password=inline-secret-value",
    "export API_KEY=env-secret-value",
    '{"password":"json-secret-value"}',
    "Bearer abcdefghijklmnopqrstuvwxyz",
    ""
  ].join("\n");
  assert.deepEqual(sanitizeCompositeCampaignRequest(raw), {
    content: [
      "Use password=[REDACTED]",
      "export API_KEY=[REDACTED]",
      '{"password":"[REDACTED]"}',
      "Bearer [REDACTED]",
      ""
    ].join("\n"),
    redaction_count: 4
  });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: raw }).map((finding) => finding.pointer), ["/notes"]);
  assert.throws(() => assertCompositeCampaignPacketSafe({ notes: raw }), (error) => {
    assert.doesNotMatch(error.message, /inline-secret-value|env-secret-value|json-secret-value|abcdefghijklmnopqrstuvwxyz/);
    return true;
  });
});

test("quoted multiword assignments and inline Cookie redact whole values without secret tails", () => {
  const raw = [
    'Use password="double quoted secret tail"',
    "export API_KEY='single quoted secret tail'",
    "- password: 'bullet quoted secret tail'",
    "Use Cookie: session=inline-cookie-secret",
    ""
  ].join("\n");
  const sanitized = sanitizeCompositeCampaignRequest(raw);
  assert.deepEqual(sanitized, {
    content: [
      'Use password="[REDACTED]"',
      "export API_KEY='[REDACTED]'",
      "- password: [REDACTED]",
      "Use Cookie: [REDACTED]",
      ""
    ].join("\n"),
    redaction_count: 4
  });
  assert.doesNotMatch(sanitized.content, /quoted secret tail|inline-cookie-secret/);
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: raw }).map((finding) => finding.pointer), ["/notes"]);
});

test("exact sensitive assignment keys share scalar redaction across syntax families and operators", () => {
  const raw = [
    "cookie=session=scalar-cookie-secret",
    "Authorization: Basic scalar-basic-secret",
    "export PASSWORD+=scalar-export-secret",
    "Use private_key=scalar-private-secret",
    '"authorization": "Bearer scalar-quoted-secret"',
    "- cookie: session=scalar-bullet-secret",
    "export COOKIE+=session=scalar-export-cookie",
    ""
  ].join("\n");
  const sanitized = sanitizeCompositeCampaignRequest(raw);
  assert.deepEqual(sanitized, {
    content: [
      "cookie=[REDACTED]",
      "Authorization: Basic [REDACTED]",
      "export PASSWORD+=[REDACTED]",
      "Use private_key=[REDACTED]",
      '"authorization": [REDACTED]',
      "- cookie: [REDACTED]",
      "export COOKIE+=[REDACTED]",
      ""
    ].join("\n"),
    redaction_count: 7
  });
  for (const secret of [
    "scalar-cookie-secret", "scalar-basic-secret", "scalar-export-secret", "scalar-private-secret",
    "scalar-quoted-secret", "scalar-bullet-secret", "scalar-export-cookie"
  ]) assert.equal(sanitized.content.includes(secret), false, secret);
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: raw }).map((finding) => finding.pointer), ["/notes"]);

  const redacted = [
    "cookie=[REDACTED]",
    "Authorization: Basic [REDACTED]",
    "export PASSWORD+=[REDACTED]",
    '"authorization": "[REDACTED]"',
    "- cookie: [REDACTED]",
    ""
  ].join("\n");
  assert.deepEqual(sanitizeCompositeCampaignRequest(redacted), { content: redacted, redaction_count: 0 });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: redacted }), []);
});

test("quoted sensitive scalars consume escaped quote content without leaking a suffix tail", () => {
  const json = '{"password":"prefix\\\"suffix-secret"}\n';
  const yaml = "password: 'prefix''suffix-secret'\n";
  assert.deepEqual(sanitizeCompositeCampaignRequest(json), {
    content: '{"password":"[REDACTED]"}\n',
    redaction_count: 1
  });
  assert.deepEqual(sanitizeCompositeCampaignRequest(yaml), {
    content: "password: [REDACTED]\n",
    redaction_count: 1
  });
  for (const [label, raw] of [["json", json], ["yaml", yaml]]) {
    assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: raw }).map((finding) => finding.pointer), ["/notes"], label);
    assert.throws(() => assertCompositeCampaignPacketSafe({ notes: raw }), (error) => {
      assert.doesNotMatch(error.message, /prefix|suffix-secret/);
      return true;
    });
  }
});

test("finite derived sensitive-key families share request and recursive packet classification", () => {
  const entries = [
    ["DATABASE_PASSWORD", "database-password-secret"],
    ["GITHUB_TOKEN", "github-token-secret"],
    ["JWT_SECRET", "jwt-secret-value"],
    ["X-API-Key", "x-api-key-secret"],
    ["AWS_SECRET_ACCESS_KEY", "aws-secret-access-key"],
    ["PROXY_AUTHORIZATION", "Basic proxy-authorization-secret"]
  ];
  const raw = `${entries.map(([key, value]) => `${key}: ${value}`).join("\n")}\n`;
  const sanitized = sanitizeCompositeCampaignRequest(raw);
  assert.equal(sanitized.redaction_count, entries.length);
  assert.equal(sanitized.content, `${entries.map(([key]) =>
    `${key}: ${key.endsWith("AUTHORIZATION") ? "Basic " : ""}[REDACTED]`
  ).join("\n")}\n`);
  for (const [, secret] of entries) assert.equal(sanitized.content.includes(secret), false, secret);

  const packet = Object.fromEntries(entries);
  assert.deepEqual(
    findCompositeCampaignPacketSecrets(packet).map((finding) => finding.pointer),
    entries.map(([key]) => `/${key}`)
  );
  assert.deepEqual(findCompositeCampaignPacketSecrets({
    token_count: "8",
    password_policy: "rotate annually",
    api_key_name: "documentation-only"
  }), []);
});

test("derived cookie and private-key component families share request and packet protection", () => {
  const entries = [
    ["SESSION_COOKIE", "session=derived-cookie-secret"],
    ["cookies", "session=plural-cookie-secret"],
    ["TLS_PRIVATE_KEY", "base64-private-key-secret"]
  ];
  const raw = `${entries.map(([key, value]) => `${key}: ${value}`).join("\n")}\n`;
  assert.deepEqual(sanitizeCompositeCampaignRequest(raw), {
    content: `${entries.map(([key]) => `${key}: [REDACTED]`).join("\n")}\n`,
    redaction_count: entries.length
  });
  assert.deepEqual(
    findCompositeCampaignPacketSecrets(Object.fromEntries(entries)).map((finding) => finding.pointer),
    entries.map(([key]) => `/${key}`)
  );
  assert.deepEqual(findCompositeCampaignPacketSecrets({
    session_cookie: "[REDACTED]",
    cookies: "session=[REDACTED]",
    tls_private_key: "[REDACTED]"
  }), []);
});

test("camelCase and acronym sensitive keys normalize into the shared finite classifier", () => {
  const entries = [
    ["privateKey", "camel-private-key-secret"],
    ["accessToken", "camel-access-token-secret"],
    ["sessionCookie", "session=camel-cookie-secret"],
    ["proxyAuthorization", "Basic camel-auth-secret"],
    ["APIKey", "camel-api-key-secret"],
    ["AWSSecretAccessKey", "camel-aws-secret-key"]
  ];
  const raw = `${entries.map(([key, value]) => `${key}: ${value}`).join("\n")}\n`;
  const sanitized = sanitizeCompositeCampaignRequest(raw);
  assert.equal(sanitized.redaction_count, entries.length);
  assert.equal(sanitized.content, `${entries.map(([key]) =>
    `${key}: ${key === "proxyAuthorization" ? "Basic " : ""}[REDACTED]`
  ).join("\n")}\n`);
  assert.deepEqual(
    findCompositeCampaignPacketSecrets(Object.fromEntries(entries)).map((finding) => finding.pointer),
    entries.map(([key]) => `/${key}`)
  );

  for (const [key] of entries) {
    const block = `${key}: |\n  ${key}-block-secret\nordinary: preserved\n`;
    assert.deepEqual(sanitizeCompositeCampaignRequest(block), {
      content: `${key}: [REDACTED]\nordinary: preserved\n`,
      redaction_count: 1
    }, key);
    assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: block }).map((finding) => finding.pointer), ["/notes"], key);
  }

  const benign = "tokenCount: 8\npasswordPolicy: rotate\napiKeyName: primary\nprivateKeyFile: config/key.pem\n";
  assert.deepEqual(sanitizeCompositeCampaignRequest(benign), { content: benign, redaction_count: 0 });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: benign }), []);
});

for (const [label, raw, secret] of [
  ["unterminated double quote", 'password: "unterminated-quoted-secret\n', "unterminated-quoted-secret"],
  ["unterminated single quote", "token: 'unterminated-single-secret\n", "unterminated-single-secret"],
  ["bare backslash continuation", "password=first-line-secret\\\ncontinued-line-secret\n", "continued-line-secret"]
]) {
  test(`ambiguous multiline sensitive scalar ${label} fails closed without echoing content`, () => {
    assert.throws(() => sanitizeCompositeCampaignRequest(raw), (error) => {
      assert.match(error.message, /sensitive|quoted|continuation|unterminated|refusing/i);
      assert.equal(error.message.includes(secret), false);
      return true;
    });
    assert.throws(() => assertCompositeCampaignPacketSafe({ notes: raw }), (error) => {
      assert.equal(error.message.includes(secret), false);
      return true;
    });
  });
}

test("provider and JWT finite high-signal families are redacted in requests and rejected in packets", () => {
  const credentials = [
    syntheticCredential("gl", "pat-", "AbCdEfGhIjKlMnOpQrStUvWx"),
    syntheticCredential("npm", "_", "AbCdEfGhIjKlMnOpQrStUvWxYz012345"),
    syntheticCredential("hf", "_", "AbCdEfGhIjKlMnOpQrStUvWxYz012345"),
    syntheticCredential("eyJ", "hbGciOiJIUzI1NiJ9.", "eyJzdWIiOiJ1c2VyLTEifQ.", "AbCdEfGhIjKlMnOpQrStUvWx")
  ];
  for (const credential of credentials) {
    assert.deepEqual(sanitizeCompositeCampaignRequest(`Use ${credential}\n`), {
      content: "Use [REDACTED]\n",
      redaction_count: 1
    }, credential.slice(0, 12));
    assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: credential }).map((finding) => finding.pointer), ["/notes"]);
  }
});

test("setx, CLI option, and URI-userinfo credential syntax is sanitized with low-noise guards", () => {
  const raw = [
    "setx API_KEY setx-secret-value",
    "tool --password cli-space-secret",
    "tool --password=cli-equals-secret",
    "curl --api-key=cli-api-secret",
    "tool --token=cli-token-secret",
    "postgres://db-user:uri-password-secret@db.example.invalid/app",
    ""
  ].join("\n");
  const sanitized = sanitizeCompositeCampaignRequest(raw);
  assert.deepEqual(sanitized, {
    content: [
      "setx API_KEY [REDACTED]",
      "tool --password [REDACTED]",
      "tool --password=[REDACTED]",
      "curl --api-key=[REDACTED]",
      "tool --token=[REDACTED]",
      "postgres://db-user:[REDACTED]@db.example.invalid/app",
      ""
    ].join("\n"),
    redaction_count: 6
  });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: raw }).map((finding) => finding.pointer), ["/notes"]);

  const benign = [
    "setx API_KEY",
    "Document the --password option without a value.",
    "Document the --token option without a value.",
    "postgres://db.example.invalid/app",
    "token_count: 8",
    "password_policy: rotate annually",
    "api_key_name: primary",
    "TLS_PRIVATE_KEY_FILE: config/private-key.pem",
    "GITHUB_TOKEN_FILE: config/token.txt",
    ""
  ].join("\n");
  assert.deepEqual(sanitizeCompositeCampaignRequest(benign), { content: benign, redaction_count: 0 });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: benign }), []);

  const mixedUris = "postgres://u:[REDACTED]@one.invalid and postgres://u:second-uri-secret@two.invalid";
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: mixedUris }).map((finding) => finding.pointer), ["/notes"]);
  assert.throws(() => assertCompositeCampaignPacketSafe({ notes: mixedUris }), (error) => {
    assert.doesNotMatch(error.message, /second-uri-secret/);
    return true;
  });
});

test("URI userinfo with an empty username still protects a nonempty password", () => {
  const raw = "postgres://:empty-user-password@db.example.invalid/app\n";
  assert.deepEqual(sanitizeCompositeCampaignRequest(raw), {
    content: "postgres://:[REDACTED]@db.example.invalid/app\n",
    redaction_count: 1
  });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: raw }).map((finding) => finding.pointer), ["/notes"]);

  const redacted = "postgres://:[REDACTED]@db.example.invalid/app\n";
  assert.deepEqual(sanitizeCompositeCampaignRequest(redacted), { content: redacted, redaction_count: 0 });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: redacted }), []);
});

test("setx and path-like CLI commands redact one option value while preserving trailing arguments", () => {
  const raw = [
    "SETX API_KEY uppercase-setx-secret",
    "TOOL --PASSWORD uppercase-cli-secret --VERBOSE",
    "MyTool --password mixed-case-secret --verbose",
    "PowerShell --token mixed-case-token-secret --NoProfile",
    "my-tool --password cli-tail-secret --verbose",
    "./bin/my-tool --token=path-token-secret --dry-run",
    "C:\\Tools\\my-tool.exe --api-key path-api-secret --verbose",
    ""
  ].join("\n");
  assert.deepEqual(sanitizeCompositeCampaignRequest(raw), {
    content: [
      "SETX API_KEY [REDACTED]",
      "TOOL --PASSWORD [REDACTED] --VERBOSE",
      "MyTool --password [REDACTED] --verbose",
      "PowerShell --token [REDACTED] --NoProfile",
      "my-tool --password [REDACTED] --verbose",
      "./bin/my-tool --token=[REDACTED] --dry-run",
      "C:\\Tools\\my-tool.exe --api-key [REDACTED] --verbose",
      ""
    ].join("\n"),
    redaction_count: 7
  });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: raw }).map((finding) => finding.pointer), ["/notes"]);
});

test("CLI token scanning handles leading flags without treating prose or missing values as credentials", () => {
  const raw = [
    "tool --verbose --password leading-flag-secret --tail",
    "MyTool --dry-run --password mixed-leading-flag-secret --tail",
    "PowerShell --NoProfile --token powershell-leading-flag-secret --NonInteractive",
    ""
  ].join("\n");
  assert.deepEqual(sanitizeCompositeCampaignRequest(raw), {
    content: [
      "tool --verbose --password [REDACTED] --tail",
      "MyTool --dry-run --password [REDACTED] --tail",
      "PowerShell --NoProfile --token [REDACTED] --NonInteractive",
      ""
    ].join("\n"),
    redaction_count: 3
  });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: raw }).map((finding) => finding.pointer), ["/notes"]);

  const benign = [
    "Use --password option without a value.",
    "Explain --token policy in prose.",
    "tool --password",
    "tool --password --verbose",
    ""
  ].join("\n");
  assert.deepEqual(sanitizeCompositeCampaignRequest(benign), { content: benign, redaction_count: 0 });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: benign }), []);
});

test("indented SETX and quoted path-like executables share bounded credential scanning", () => {
  const raw = [
    "  SETX API_KEY indented-setx-secret",
    '"C:\\Program Files\\My Tool\\my-tool.exe" --verbose --password quoted-path-secret --tail',
    ""
  ].join("\n");
  assert.deepEqual(sanitizeCompositeCampaignRequest(raw), {
    content: [
      "  SETX API_KEY [REDACTED]",
      '"C:\\Program Files\\My Tool\\my-tool.exe" --verbose --password [REDACTED] --tail',
      ""
    ].join("\n"),
    redaction_count: 2
  });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: raw }).map((finding) => finding.pointer), ["/notes"]);

  const prose = "Use --password option without a value.\nExplain --token policy in prose.\n";
  assert.deepEqual(sanitizeCompositeCampaignRequest(prose), { content: prose, redaction_count: 0 });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: prose }), []);
});

test("temporary ASIA provider credentials are redacted with permanent access-key IDs", () => {
  for (const credential of [
    syntheticCredential("AK", "IA", "ABCDEFGHIJKLMNOP"),
    syntheticCredential("AS", "IA", "ABCDEFGHIJKLMNOP")
  ]) {
    assert.deepEqual(sanitizeCompositeCampaignRequest(`Use ${credential}\n`), {
      content: "Use [REDACTED]\n",
      redaction_count: 1
    });
    assert.deepEqual(findCompositeCampaignPacketSecrets({ credential }).map((finding) => finding.pointer), ["/credential"]);
  }
});

test("PGP private-key blocks are redacted whole and unmatched headers fail closed", () => {
  const complete = [
    "-----BEGIN PGP PRIVATE KEY BLOCK-----",
    "Version: synthetic",
    "cGdwLXByaXZhdGUta2V5LXNlY3JldA==",
    "-----END PGP PRIVATE KEY BLOCK-----",
    "ordinary requirement remains",
    ""
  ].join("\n");
  const sanitized = sanitizeCompositeCampaignRequest(complete);
  assert.deepEqual(sanitized, {
    content: "[REDACTED]\nordinary requirement remains\n",
    redaction_count: 1
  });
  assert.doesNotMatch(sanitized.content, /cGdw|Version: synthetic/);
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: complete }).map((finding) => finding.pointer), ["/notes"]);

  const truncated = "-----BEGIN PGP PRIVATE KEY BLOCK-----\ncGdwLXRydW5jYXRlZC1zZWNyZXQ=\n";
  assert.throws(() => sanitizeCompositeCampaignRequest(truncated), (error) => {
    assert.match(error.message, /private.key|secret|credential/i);
    assert.doesNotMatch(error.message, /cGdwLXRydW5j/);
    return true;
  });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ notes: truncated }).map((finding) => finding.pointer), ["/notes"]);
});

test("unmatched private-key headers are rejected rather than persisted", () => {
  const truncated = "-----BEGIN PRIVATE KEY-----\ndHJ1bmNhdGVkLWtleS1ib2R5\n";
  assert.throws(() => sanitizeCompositeCampaignRequest(truncated), (error) => {
    assert.match(error.message, /secret|credential|private.key/i);
    assert.doesNotMatch(error.message, /dHJ1bmNhdGVk/);
    return true;
  });
  assert.deepEqual(findCompositeCampaignPacketSecrets({ nested: truncated }).map((finding) => finding.pointer), ["/nested"]);
  assert.throws(() => assertCompositeCampaignPacketSafe({ nested: truncated }), (error) => {
    assert.doesNotMatch(error.message, /dHJ1bmNhdGVk/);
    return true;
  });
});

test("tracked file limit uses exact UTF-8 bytes at ASCII and multibyte boundaries", () => {
  assert.equal(COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES, 1024 * 1024);
  const asciiBoundary = `${"a".repeat(COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES - 1)}\n`;
  assert.equal(assertCompositeCampaignTrackedFileSize(asciiBoundary), COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES);
  assert.throws(() => assertCompositeCampaignTrackedFileSize(`${asciiBoundary}x`), /1 MiB|tracked file|byte/i);

  const multibyteBoundary = `${"界".repeat((COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES - 1) / 3)}\n`;
  assert.equal(utf8ByteLength(multibyteBoundary), COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES);
  assert.equal(assertCompositeCampaignTrackedFileSize(multibyteBoundary), COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES);
  assert.throws(() => assertCompositeCampaignTrackedFileSize(`${multibyteBoundary}界`), /1 MiB|tracked file|byte/i);
});

test("event line limit includes the canonical newline and uses exact UTF-8 bytes", () => {
  assert.equal(COMPOSITE_CAMPAIGN_EVENT_LINE_MAX_BYTES, 64 * 1024);
  const asciiBoundary = `${"e".repeat(COMPOSITE_CAMPAIGN_EVENT_LINE_MAX_BYTES - 1)}\n`;
  assert.equal(assertCompositeCampaignEventLineSize(asciiBoundary), COMPOSITE_CAMPAIGN_EVENT_LINE_MAX_BYTES);
  assert.throws(() => assertCompositeCampaignEventLineSize(`${asciiBoundary}x`), /64 KiB|event line|byte/i);

  const multibyteBoundary = `${"界".repeat((COMPOSITE_CAMPAIGN_EVENT_LINE_MAX_BYTES - 1) / 3)}\n`;
  assert.equal(utf8ByteLength(multibyteBoundary), COMPOSITE_CAMPAIGN_EVENT_LINE_MAX_BYTES);
  assert.equal(assertCompositeCampaignEventLineSize(multibyteBoundary), COMPOSITE_CAMPAIGN_EVENT_LINE_MAX_BYTES);
  assert.throws(() => assertCompositeCampaignEventLineSize(`${multibyteBoundary}界`), /64 KiB|event line|byte/i);
});
