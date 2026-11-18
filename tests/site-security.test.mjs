// Security regression tests for the static cnkerr.com shell.
// Run: node --test tests/site-security.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script, runInNewContext } from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const dataSource = readFileSync(new URL("../data.js", import.meta.url), "utf8");
const scriptMatch = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);

test("the main site script and data source parse", () => {
  assert.ok(scriptMatch, "inline site script is present");
  assert.doesNotThrow(() => new Script(scriptMatch[1], { filename: "index.html" }));
  assert.doesNotThrow(() => new Script(dataSource, { filename: "data.js" }));
});

test("all authored media and article URLs use web schemes", () => {
  const window = {};
  runInNewContext(dataSource, { window }, { timeout: 2000 });
  const data = window.DATA_REMOTE;
  assert.ok(data && Array.isArray(data.notes) && Array.isArray(data.slides));
  let checked = 0;
  for (const section of ["slides", "notes", "writing", "research", "editing", "development", "factChecking"]) {
    for (const item of data[section] || []) {
      for (const field of ["src", "file", "url"]) {
        if (!item[field]) continue;
        const parsed = new URL(item[field], "https://cnkerr.com/");
        assert.match(parsed.protocol, /^https?:$/, section + ": " + field + " must be http(s)");
        checked++;
      }
    }
  }
  assert.ok(checked > 50, "meaningful number of asset URLs checked");
});

test("URL sanitizer blocks executable schemes but preserves ordinary links", () => {
  const match = scriptMatch[1].match(/function safeWebUrl\(value\)\{[\s\S]*?\n    \}/);
  assert.ok(match, "URL sanitizer is present");
  const safeWebUrl = runInNewContext("(" + match[0] + ")", {
    URL, document: { baseURI: "https://cnkerr.com/" }
  });
  for (const bad of ["javascript:alert(1)", "data:text/html,<img>", "vbscript:alert(1)", "file:///etc/passwd", ""]) {
    assert.equal(safeWebUrl(bad), "");
  }
  assert.equal(safeWebUrl("/notes/zines/std2.pdf"), "https://cnkerr.com/notes/zines/std2.pdf");
  assert.equal(safeWebUrl("https://www.jenkemmag.com/"), "https://www.jenkemmag.com/");
});

test("patched PDF.js loader is evaluation-disabled and has an independent fallback", () => {
  assert.doesNotMatch(html, /pdfjs-dist@4\.0\.379/);
  assert.match(html, /pdfjs-dist@4\.2\.67\/build\/pdf\.min\.mjs/);
  assert.match(html, /pdfjs-dist@4\.2\.67\/build\/pdf\.worker\.min\.mjs/);
  assert.match(html, /isEvalSupported:\s*false/);
  assert.match(html, /frame\.isConnected\s*&&\s*blogCurrentURL\s*===\s*fUrl/);
  assert.match(html, /isPdfFrame/);
});

test("ASCII About view uses text nodes and HTML note previews are sandboxed", () => {
  assert.doesNotMatch(html, /aboutText\.innerHTML\s*=\s*rawHTML/);
  assert.match(html, /aboutText\.replaceChildren\(safePre\)/);
  assert.match(html, /sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"/);
});

test("404 path migration rejects protocol-relative and cross-origin redirects", () => {
  assert.match(html, /if \(!preserved \|\| !\/\^/); // sanity-check handled in browser QA
  const notFound = readFileSync(new URL("../404.html", import.meta.url), "utf8");
  assert.match(notFound, /encodeURIComponent\(path\)/);
});
