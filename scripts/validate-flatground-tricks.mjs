import fs from "node:fs";
import vm from "node:vm";

const sourcePath = new URL("../notes/projects/flatground-tricks-source.json", import.meta.url);
const dataPath = new URL("../notes/projects/flatground-tricks-data.js", import.meta.url);
const csvPath = new URL("../notes/projects/flatground-tricks-data.csv", import.meta.url);
const htmlPath = new URL("../notes/projects/flatground-tricks.html", import.meta.url);

const sourceData = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const dataSource = fs.readFileSync(dataPath, "utf8");
const csvSource = fs.readFileSync(csvPath, "utf8");
const htmlSource = fs.readFileSync(htmlPath, "utf8");

const dataMatch = dataSource.match(/window\.FLATGROUND_TRICKS_DATA=(\[[\s\S]*\]);\s*$/);
if (!dataMatch) throw new Error("Could not parse flatground-tricks-data.js");
const data = JSON.parse(dataMatch[1]);

// Syntax-check both browser scripts without executing DOM-dependent code.
try { new vm.Script(dataSource, { filename: "flatground-tricks-data.js" }); }
catch (error) { throw new Error(`Data script syntax error: ${error.message}`); }
const inlineScripts = [...htmlSource.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).filter(Boolean);
if (!inlineScripts.length) throw new Error("No inline application script found");
for (const [index, source] of inlineScripts.entries()) {
  try { new vm.Script(source, { filename: `flatground-tricks-inline-${index + 1}.js` }); }
  catch (error) { throw new Error(`Inline script syntax error: ${error.message}`); }
}

const fail = message => { throw new Error(message); };
if (JSON.stringify(data) !== JSON.stringify(sourceData)) fail("Generated JS does not match canonical source JSON");
const allowedStances = new Set(["Regular","Switch","Nollie","Fakie"]);
const allowedFamilies = new Set(["Casper / Hospital","Feather","Forward / Dolphin","Heelflips","Impossible","Kickback","Kickflips","Ollie / Spins","Shuv-its"]);
const allowedSubfamilies = new Set(["360 Flip / Tre","Big Heel","Bigflip","Biggerspin","Bigspin","Casper","Forward","Gazelle","Hardflip","Heelflip","Hospital","Inward Heel","Kickflip","Lazer","Monster","None","Shuv-it","Varial Flip","Varial Heel"]);
const allowedModifiers = new Set(["180","360","540","720","Anti","Backfoot","Backside","Body Varial","Cancel","Crossfoot","Double","Front Foot","Frontside","Half","Late","Old School","Pressure","Quadruple","Rewind","Semi","Triple","Underflip"]);

if (data.length < 800 || data.length > 1000) fail(`Expected between 800 and 1000 tricks, found ${data.length}`);
if (data.length % 100 !== 0) fail(`Expected trick count in complete 100-trick installments, found ${data.length}`);
const expectedParts = data.length / 100;

const numbers = new Set();
const partLast = new Map();
for (let i = 0; i < data.length; i++) {
  const d = data[i];
  const expected = i + 1;
  if (d.num !== expected) fail(`Expected trick #${expected}, found #${d.num}`);
  if (numbers.has(d.num)) fail(`Duplicate trick number #${d.num}`);
  numbers.add(d.num);
  if (!d.name || typeof d.name !== "string") fail(`Missing name at #${d.num}`);
  if (!allowedStances.has(d.stance)) fail(`Invalid stance at #${d.num}: ${d.stance}`);
  if (!Number.isInteger(d.part) || d.part < 1 || d.part > expectedParts) fail(`Invalid part at #${d.num}: ${d.part}`);
  const expectedPart = Math.floor(i / 100) + 1;
  if (d.part !== expectedPart) fail(`Expected trick #${d.num} in Part ${expectedPart}, found Part ${d.part}`);
  if (!Number.isFinite(d.seconds) || d.seconds < 0) fail(`Invalid caption onset at #${d.num}`);
  const previous = partLast.get(d.part);
  if (previous != null && d.seconds <= previous) fail(`Non-increasing timestamp in Part ${d.part} at #${d.num}`);
  partLast.set(d.part, d.seconds);
  if (!/^https:\/\/(www\.)?youtube\.com\/watch\?/.test(d.url)) fail(`Invalid YouTube URL at #${d.num}`);
  if (!allowedFamilies.has(d.family)) fail(`Unknown family at #${d.num}: ${d.family}`);
  if (!allowedSubfamilies.has(d.subfamily)) fail(`Unknown subfamily at #${d.num}: ${d.subfamily}`);
  if (!Array.isArray(d.modifiers)) fail(`Modifiers must be an array at #${d.num}`);
  for (const modifier of d.modifiers) if (!allowedModifiers.has(modifier)) fail(`Unknown modifier at #${d.num}: ${modifier}`);
  if (!d.siblingKey || typeof d.siblingKey !== "string") fail(`Missing sibling key at #${d.num}`);
}

const aliasMatch = htmlSource.match(/const SIBLING_KEY_ALIASES=(\{[\s\S]*?\});\nconst SEARCH_TERM_ALIASES=/);
if (!aliasMatch) fail("Could not parse SIBLING_KEY_ALIASES from HTML");
const aliases = JSON.parse(aliasMatch[1]);
const siblingKeys = new Set(data.map(d => d.siblingKey));
for (const [source, target] of Object.entries(aliases)) {
  if (!siblingKeys.has(source)) fail(`Orphaned sibling alias source: ${source}`);
  if (!siblingKeys.has(target) && !Object.prototype.hasOwnProperty.call(aliases, target)) fail(`Orphaned sibling alias target: ${target}`);
}
for (const start of Object.keys(aliases)) {
  const seen = new Set();
  let key = start;
  while (aliases[key]) {
    if (seen.has(key)) fail(`Sibling alias cycle starting at: ${start}`);
    seen.add(key);
    key = aliases[key];
  }
}
const canonicalSiblingKey = key => {
  const seen = new Set();
  while (aliases[key] && !seen.has(key)) {
    seen.add(key);
    key = aliases[key];
  }
  return key;
};
const siblingStances = new Map();
for (const d of data) {
  const key = canonicalSiblingKey(d.siblingKey);
  if (!siblingStances.has(key)) siblingStances.set(key, new Set());
  const stances = siblingStances.get(key);
  if (stances.has(d.stance)) fail(`Sibling collision: ${key} contains more than one ${d.stance} trick`);
  stances.add(d.stance);
}

const formatTimestamp = seconds => {
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds - minutes * 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${remainder}`;
};
const csvEscape = value => {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const expectedCsv = [
  ["trick_number","trick_name","stance","part","caption_timestamp"],
  ...data.map(d => [d.num,d.name,d.stance,d.part,formatTimestamp(d.seconds)])
].map(row => row.map(csvEscape).join(",")).join("\n") + "\n";
if (csvSource !== expectedCsv) fail("CSV does not match canonical data source");

const externalDataTag = '<script src="./flatground-tricks-data.js"></script>';
const externalIndex = htmlSource.indexOf(externalDataTag);
const inlineIndex = htmlSource.indexOf("<script>", externalIndex + externalDataTag.length);
if (externalIndex < 0 || inlineIndex < 0 || externalIndex > inlineIndex) fail("Canonical data script must load before application script");
if (/const AUDITED_ONSETS=/.test(htmlSource)) fail("Legacy AUDITED_ONSETS is still embedded");
if (/const DATA=\[\{/.test(htmlSource)) fail("Legacy embedded DATA array is still present");

console.log(`Flatground Tricks validation passed: ${data.length} tricks across ${expectedParts} parts, ${siblingStances.size} sibling groups.`);
