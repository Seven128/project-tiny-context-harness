#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function resolveContext(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  const manifestPath = path.join(root, "project_context", "context.toml");
  const manifest = parseManifest(await readFile(manifestPath, "utf8"));
  const files = await listContextFiles(path.join(root, "project_context"));
  const selected = new Map();
  const add = (file, reason, required = false) => {
    const normalized = normalize(file);
    const row = selected.get(normalized) ?? { path: normalized, required: false, reasons: [] };
    row.required ||= required;
    if (!row.reasons.includes(reason)) row.reasons.push(reason);
    selected.set(normalized, row);
  };
  for (const core of ["project_context/global.md", "project_context/architecture.md", "project_context/context.toml"]) add(core, "core", true);
  for (const area of manifest.areas.filter((item) => item.default)) add(area.context, `default area ${area.id}`, true);
  for (const node of manifest.contexts.filter((item) => item.read_policy === "default")) add(node.path, "read_policy default", true);
  for (const ref of options.refs ?? []) add(ref, "explicit ref", true);

  const terms = unique(options.terms ?? []);
  const pathTextSignals = (options.paths ?? []).map((value) => normalize(value).toLowerCase());
  const pathTriggerSignals = pathTerms(options.paths ?? []);
  const facets = unique(options.facets ?? []);
  const triggerSignals = unique([...terms, ...pathTriggerSignals, ...facets]);
  const lowerTerms = terms.map((term) => term.toLowerCase());
  const content = new Map();
  for (const file of files.filter((item) => item.endsWith(".md"))) content.set(file, (await readFile(path.join(root, ...file.split("/")), "utf8")).toLowerCase());
  for (const node of manifest.contexts) {
    const triggerHits = node.triggers.filter((trigger) => triggerSignals.some((signal) => trigger.toLowerCase().includes(signal.toLowerCase()) || signal.toLowerCase().includes(trigger.toLowerCase())));
    if (triggerHits.length) add(node.path, `trigger: ${triggerHits.join(", ")}`);
    if (node.read_when && triggerSignals.some((signal) => node.read_when.toLowerCase().includes(signal.toLowerCase()))) add(node.path, `read_when: ${node.read_when}`);
  }
  for (const [file, text] of content) {
    const termHits = lowerTerms.filter((term) => term.length >= 3 && text.includes(term));
    const pathHits = pathTextSignals.filter((signal) => signal.length >= 4 && text.includes(signal));
    if (termHits.length >= 2 || pathHits.length) add(file, `bounded text: ${[...termHits, ...pathHits].slice(0, 6).join(", ")}`);
  }
  const children = new Map(manifest.contexts.map((node) => [normalize(node.path), node.default_children.map(normalize)]));
  const queue = [...selected.keys()];
  while (queue.length) {
    const parent = queue.shift();
    for (const child of children.get(parent) ?? []) if (!selected.has(child)) { add(child, `dependency of ${parent}`, true); queue.push(child); }
  }
  const rows = [...selected.values()].sort((a, b) => a.path.localeCompare(b.path));
  const matchedTerms = new Set();
  for (const row of rows) for (const term of lowerTerms) if (row.reasons.some((reason) => reason.toLowerCase().includes(term))) matchedTerms.add(term);
  return {
    schema_version: "context-resolve-r0-v1",
    required: rows.filter((row) => row.required).map((row) => row.path),
    candidates: rows.filter((row) => !row.required).map((row) => row.path),
    reasons: Object.fromEntries(rows.map((row) => [row.path, row.reasons])),
    unmatched_terms: terms.filter((term) => !matchedTerms.has(term.toLowerCase())),
    state_created: false
  };
}

function parseManifest(text) {
  const areas = [];
  const contexts = [];
  let current = null;
  for (const raw of text.split(/\r?\n/u)) {
    const line = raw.replace(/\s+#.*$/u, "").trim();
    if (!line) continue;
    if (line === "[[areas]]") { current = {}; areas.push(current); continue; }
    if (line === "[[context]]") { current = {}; contexts.push(current); continue; }
    if (!current) continue;
    const match = /^([a-z_]+)\s*=\s*(.+)$/u.exec(line);
    if (!match) continue;
    current[match[1]] = parseTomlValue(match[2]);
  }
  return { areas: areas.map(normalizeArea), contexts: contexts.map(normalizeNode) };
}
function parseTomlValue(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith("[")) return [...raw.matchAll(/"([^"]*)"/gu)].map((match) => match[1]);
  const quoted = /^"([^"]*)"$/u.exec(raw); return quoted ? quoted[1] : raw;
}
function normalizeArea(row) { return { id: row.id ?? "", context: normalize(row.context ?? ""), default: row.default === true }; }
function normalizeNode(row) { return { path: normalize(row.path ?? ""), role: row.role ?? "", read_policy: row.read_policy ?? "on-demand", read_when: row.read_when ?? "", triggers: row.triggers ?? [], default_children: row.default_children ?? [] }; }
async function listContextFiles(contextRoot) {
  const result = [];
  async function visit(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const absolute=path.join(dir, entry.name); if (entry.isDirectory()) await visit(absolute); else if (entry.isFile()) result.push(normalize(path.relative(path.dirname(contextRoot), absolute))); } }
  await visit(contextRoot); return result.sort();
}
function pathTerms(paths) {
  return unique(paths.flatMap((value) => {
    const normalized = normalize(value).toLowerCase();
    const base = path.basename(normalized);
    const stem = base.replace(/\.[^.]+$/u, "");
    return [base, stem].filter((item) => item.length >= 4);
  }));
}
function unique(values) { return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))]; }
function normalize(value) { return String(value).replace(/\\/gu, "/").replace(/^\.\//u, ""); }
function parseArgs(argv) { const options={ terms:[], paths:[], facets:[], refs:[] }; for (let i=0;i<argv.length;i+=1) { const arg=argv[i]; if (arg==="--root") options.root=argv[++i]; else if (arg==="--term") options.terms.push(argv[++i]); else if (arg==="--path") options.paths.push(argv[++i]); else if (arg==="--facet") options.facets.push(argv[++i]); else if (arg==="--ref") options.refs.push(argv[++i]); else if (arg!=="--json" && arg!=="--explain") throw new Error(`unknown argument: ${arg}`); } return options; }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options=parseArgs(process.argv.slice(2)); const result=await resolveContext(options.root ?? process.cwd(), options); process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
