#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import process from "node:process";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const DATA_PATH = path.join(ROOT, "notes/projects/flatground-tricks-data.js");
const CSV_PATH = path.join(ROOT, "notes/projects/flatground-tricks-data.csv");
const HTML_PATH = path.join(ROOT, "notes/projects/flatground-tricks.html");

function fail(message) {
  console.error("ERROR:", message);
  process.exitCode = 1;
}
function assert(condition, message) {
  if (!condition) fail(message);
}
function formatTimestamp(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds - minutes * 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${remainder}`;
}
function csvEscape(value) {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function resolveAlias(key, aliases) {
  const seen = new Set();
  while (aliases[key]) {
    if (seen.has(key)) throw new Error(`Sibling alias cycle at "${key}"`);
    seen.add(key);
    key = aliases[key];
  }
  return key;
}

const source = fs.readFileSync(DATA_PATH, "utf8");
const sandbox = { globalThis: {} };
vm.runInNewContext(source, sandbox, { filename: DATA_PATH });
const db = sandbox.globalThis.FLATGROUND_TRICKS_DATA;

assert(db && typeof db === "object", "Canonical data object did not load.");
if (!db) process.exit(1);

const tricks = db.tricks || [];
const aliases = db.siblingAliases || {};
const familyOverrides = db.relatedFamilyOverrides || {};
const typeOverrides = db.relatedTypeOverrides || {};
const validStances = new Set(["Regular", "Switch", "Nollie", "Fakie"]);

assert(db.version === 1, "Unexpected canonical data version.");
assert(tricks.length === 800, `Expected 800 tricks; found ${tricks.length}.`);

const numbers = new Set();
const partCounts = new Map();
let previousPart = null;
let previousTime = -Infinity;

for (let i = 0; i < tricks.length; i++) {
  const d = tricks[i];
  const expected = i + 1;

  assert(d.num === expected, `Trick index ${i} should be #${expected}; found #${d.num}.`);
  assert(!numbers.has(d.num), `Duplicate trick number #${d.num}.`);
  numbers.add(d.num);

  assert(typeof d.name === "string" && d.name.trim(), `#${d.num}: missing trick name.`);
  assert(validStances.has(d.stance), `#${d.num}: invalid stance "${d.stance}".`);
  assert(Number.isInteger(d.part) && d.part >= 1 && d.part <= 8, `#${d.num}: invalid part ${d.part}.`);
  assert(Number.isFinite(d.captionSeconds) && d.captionSeconds >= 0, `#${d.num}: invalid captionSeconds.`);
  assert(Array.isArray(d.modifiers), `#${d.num}: modifiers must be an array.`);
  assert(typeof d.siblingKey === "string" && d.siblingKey.trim(), `#${d.num}: missing siblingKey.`);

  try {
    const u = new URL(d.url);
    assert(u.hostname === "www.youtube.com" || u.hostname === "youtube.com" || u.hostname === "youtu.be",
      `#${d.num}: URL is not a YouTube URL.`);
  } catch {
    fail(`#${d.num}: invalid URL "${d.url}".`);
  }

  partCounts.set(d.part, (partCounts.get(d.part) || 0) + 1);
  if (d.part !== previousPart) {
    previousPart = d.part;
    previousTime = -Infinity;
  }
  assert(d.captionSeconds > previousTime,
    `#${d.num}: caption time ${d.captionSeconds} is not strictly increasing within Part ${d.part}.`);
  previousTime = d.captionSeconds;

  const expectedPart = Math.floor((d.num - 1) / 100) + 1;
  assert(d.part === expectedPart, `#${d.num}: expected Part ${expectedPart}, found Part ${d.part}.`);
}

for (let part = 1; part <= 8; part++) {
  assert(partCounts.get(part) === 100, `Part ${part}: expected 100 tricks; found ${partCounts.get(part) || 0}.`);
}

for (const key of Object.keys(aliases)) {
  try { resolveAlias(key, aliases); }
  catch (error) { fail(error.message); }
}

const siblingGroups = new Map();
for (const d of tricks) {
  let group;
  try { group = resolveAlias(d.siblingKey, aliases); }
  catch (error) { fail(error.message); continue; }

  if (!siblingGroups.has(group)) siblingGroups.set(group, new Map());
  const byStance = siblingGroups.get(group);
  if (byStance.has(d.stance)) {
    fail(`Sibling group "${group}" contains two ${d.stance} tricks: #${byStance.get(d.stance)} and #${d.num}.`);
  } else {
    byStance.set(d.stance, d.num);
  }
}

for (const [label, overrides] of [["family", familyOverrides], ["type", typeOverrides]]) {
  for (const key of Object.keys(overrides)) {
    const n = Number(key);
    assert(Number.isInteger(n) && numbers.has(n), `Unknown trick #${key} in related ${label} overrides.`);
    assert(Array.isArray(overrides[key]), `Related ${label} override #${key} must be an array.`);
  }
}

const expectedCsvRows = [
  ["trick_number", "trick_name", "stance", "part", "caption_timestamp"],
  ...tricks.map(d => [d.num, d.name, d.stance, d.part, formatTimestamp(d.captionSeconds)])
];
const expectedCsv = expectedCsvRows.map(row => row.map(csvEscape).join(",")).join("\n") + "\n";

if (process.argv.includes("--write")) {
  fs.writeFileSync(CSV_PATH, expectedCsv);
  console.log(`Wrote ${CSV_PATH}`);
} else {
  const actualCsv = fs.readFileSync(CSV_PATH, "utf8");
  assert(actualCsv === expectedCsv, "Raw CSV is out of sync. Run: node scripts/validate-flatground-tricks.mjs --write");
}

const html = fs.readFileSync(HTML_PATH, "utf8");
assert(html.includes('src="./flatground-tricks-data.js"'), "App HTML does not load canonical data source.");
assert(!html.includes("const AUDITED_ONSETS="), "Legacy AUDITED_ONSETS is still embedded in app HTML.");
assert(!html.includes("const DATA=["), "Legacy embedded DATA array is still present in app HTML.");

if (!process.exitCode) {
  console.log(`OK: ${tricks.length} tricks, ${siblingGroups.size} sibling groups, CSV synchronized.`);
}
