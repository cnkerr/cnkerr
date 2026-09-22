const { test, expect } = require("@playwright/test");
const fs = require("fs");

const BASE_ROOT = process.env.FLATGROUND_BASE_ROOT || "http://127.0.0.1:4173";
const BASE = `${BASE_ROOT}/notes/projects/flatground-tricks.html?intro=0`;
const ALLOWED_HOST = new URL(BASE_ROOT).hostname;
fs.mkdirSync("qa-artifacts", { recursive: true });

async function quietExternalTraffic(page) {
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.hostname === ALLOWED_HOST || url.hostname === "127.0.0.1" || url.hostname === "localhost") return route.continue();
    return route.abort();
  });
}

async function load(page, viewport) {
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await quietExternalTraffic(page);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#list .trickrow")).toHaveCount(800);
}

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  expect(metrics.document, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.body, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 1);
}

test("desktop baseline, controls, search aliases, filters and URLs", async ({ page }) => {
  await load(page, { width: 1440, height: 1000 });
  await expectNoHorizontalOverflow(page);
  await expect(page.locator("#matchCount")).toHaveText("800 / 800");
  await expect(page.locator("#overview .cell")).toHaveCount(800);
  await expect(page.locator("#overview .cell[tabindex='0']")).toHaveCount(1);

  await page.locator(".stanceBtn[data-stance='Regular']").click();
  await expect(page.locator("#matchCount")).toHaveText("320 / 800");
  await page.locator(".stanceBtn[data-stance='Switch']").click();
  await expect(page.locator("#matchCount")).toHaveText("460 / 800");
  await page.locator("#clear").click();
  await expect(page.locator("#matchCount")).toHaveText("800 / 800");

  await page.locator("#search").fill("tre");
  await expect(page.locator("#matchCount")).not.toHaveText("0 / 800");
  await expect(page.locator("#list .trickname").first()).toContainText(/360 flip/i);
  await expect(page).toHaveURL(/q=tre/);

  await page.locator("#search").fill("laser");
  await expect(page.locator("#list .trickname").first()).toContainText(/lazer/i);
  await page.locator("#clear").click();

  await page.locator("#filterSummary").click();
  const pressure = page.locator('input[data-filter-type="modifier"][value="Pressure"]');
  await pressure.check();
  await expect(page.locator("#activeReadout")).toBeVisible();
  await expect(page.locator("#activeReadout")).toContainText("PRESSURE");
  const filtered = parseInt((await page.locator("#matchCount").innerText()).split("/")[0], 10);
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(800);

  await page.screenshot({ path: "qa-artifacts/desktop-controls.png" });
});

test("trick modal navigation integrates with browser history", async ({ page }) => {
  await load(page, { width: 1280, height: 900 });

  await page.locator(".trickname[data-num='13']").click();
  await expect(page.locator("#dialog")).toHaveJSProperty("open", true);
  await expect(page.locator("#trickLabel")).toHaveText("kickflip");
  await expect(page).toHaveURL(/#trick-13$/);

  await page.locator("#nextTrick").click();
  await expect(page.locator("#trickLabel")).toHaveText("fakie kickflip");
  await expect(page).toHaveURL(/#trick-14$/);

  await page.goBack();
  await expect(page.locator("#trickLabel")).toHaveText("kickflip");
  await expect(page).toHaveURL(/#trick-13$/);

  await page.goBack();
  await expect(page.locator("#dialog")).toHaveJSProperty("open", false);
  await expect(page).not.toHaveURL(/#trick-/);

  await page.locator(".trickname[data-num='100']").click();
  await expect(page.locator("#sourceLine")).toContainText("PART I");
  await expect(page.locator("#sourceLine")).toContainText("5:27.0");
  await page.screenshot({ path: "qa-artifacts/desktop-trick-modal.png" });
});

test("overview is one tab stop and supports arrow-key navigation", async ({ page }) => {
  await load(page, { width: 1280, height: 900 });
  const current = page.locator("#overview .cell[tabindex='0']");
  await expect(current).toHaveCount(1);
  await current.focus();
  await expect(current).toHaveAttribute("data-num", "1");

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#overview .cell:focus")).toHaveAttribute("data-num", "2");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#overview .cell:focus")).toHaveAttribute("data-num", "102");
  await page.keyboard.press("Enter");
  await expect(page.locator("#dialog")).toHaveJSProperty("open", true);
  await expect(page).toHaveURL(/#trick-102$/);
});

test("info links and raw-data endpoint are valid", async ({ page, request }) => {
  await load(page, { width: 1280, height: 900 });
  await page.locator("#infoBtn").click();
  await expect(page.locator("#infoDialog")).toHaveJSProperty("open", true);

  const creator = page.locator(".creatorLink");
  await expect(creator).toHaveAttribute("href", "https://www.youtube.com/@_jamiegriffin");
  const raw = page.locator(".dataDownload");
  await expect(raw).toHaveAttribute("href", "/notes/projects/flatground-tricks-data.csv");
  await expect(raw).toHaveAttribute("download", "flatground-tricks-data.csv");
  await expect(page.locator(".projectFooter a")).toHaveAttribute("href", "https://www.youtube.com/@_jamiegriffin");

  const response = await request.get(`${BASE_ROOT}/notes/projects/flatground-tricks-data.csv`);
  expect(response.ok()).toBeTruthy();
  const text = await response.text();
  expect(text.trim().split("\n")).toHaveLength(801);

  await page.screenshot({ path: "qa-artifacts/desktop-info.png" });
});

for (const vp of [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "narrow-320", width: 320, height: 568 },
  { name: "iphone-14", width: 390, height: 844 }
]) {
  test(`mobile layout stays usable at ${vp.name}`, async ({ page }) => {
    await load(page, { width: vp.width, height: vp.height });
    await expectNoHorizontalOverflow(page);

    const stanceRow = page.locator(".controls .row").first();
    const rowBox = await stanceRow.boundingBox();
    const buttons = page.locator(".controls .stanceBtn");
    await expect(buttons).toHaveCount(5);
    const boxes = await buttons.evaluateAll(nodes => nodes.map(n => {
      const r = n.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    }));
    const tops = boxes.map(b => Math.round(b.top));
    expect(new Set(tops).size).toBe(1);
    for (const b of boxes) {
      expect(b.left).toBeGreaterThanOrEqual(rowBox.x - 1);
      expect(b.right).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
    }

    await page.screenshot({ path: `qa-artifacts/${vp.name}-top.png` });

    await page.evaluate(() => window.scrollTo(0, 1800));
    await expect(page.locator("#mobileTools")).toBeVisible();
    await expect(page.locator("#mobileMatchCount")).toHaveText("800 / 800");
    await page.screenshot({ path: `qa-artifacts/${vp.name}-quick-tools.png` });

    await page.locator("#mobileSearchJump").click();
    await expect(page.locator("#search")).toBeFocused();
    await page.locator("#search").fill("kickflip");
    await expect(page.locator("#mobileMatchCount")).not.toHaveText("800 / 800");

    await page.locator("#infoBtn").click();
    await expect(page.locator("#infoDialog")).toHaveJSProperty("open", true);
    await expectNoHorizontalOverflow(page);
    const rawData = page.locator(".dataDownload");
    await rawData.scrollIntoViewIfNeeded();
    await expect(rawData).toBeVisible();
    const rawBox = await rawData.boundingBox();
    expect(rawBox.y).toBeGreaterThanOrEqual(0);
    expect(rawBox.y + rawBox.height).toBeLessThanOrEqual(vp.height + 1);
    await page.screenshot({ path: `qa-artifacts/${vp.name}-info.png` });

    await page.locator("#infoClose").click();
    await page.locator("#clear").click();
    await page.locator("#list .trickname").first().click();
    await expect(page.locator("#dialog")).toHaveJSProperty("open", true);
    await expectNoHorizontalOverflow(page);
    await page.locator("#related").scrollIntoViewIfNeeded();
    await expect(page.locator("#related")).toBeVisible();
    await expect(page.locator("#close")).toBeVisible();
  });
}


test("live YouTube players initialize for representative parts", async ({ page }) => {
  test.skip(BASE_ROOT !== "https://cnkerr.com", "Live YouTube diagnostic");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const num of [1, 101, 201]) {
    await page.goto(`${BASE_ROOT}/notes/projects/flatground-tricks.html?intro=0#trick-${num}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#dialog")).toHaveJSProperty("open", true);
    const iframe = page.locator("#clipPlayer");
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute("src", /youtube\.com\/embed\//);

    const frame = page.frameLocator("#clipPlayer");
    await expect(frame.locator("body")).toBeVisible({ timeout: 15000 });
    const error = frame.locator(".ytp-error-content-wrap");
    const player = frame.locator(".html5-video-player");
    await expect(player).toHaveCount(1, { timeout: 15000 });
    if (await error.count()) await expect(error).not.toBeVisible();

    const text = (await frame.locator("body").innerText()).slice(0, 500);
    expect(text).not.toMatch(/video unavailable|an error occurred|playback on other websites has been disabled/i);
    console.log(JSON.stringify({ num, iframeSrc: await iframe.getAttribute("src"), frameText: text }));
  }
});


test("live player survives installment boundary navigation", async ({ page }) => {
  test.skip(BASE_ROOT !== "https://cnkerr.com", "Live YouTube diagnostic");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${BASE_ROOT}/notes/projects/flatground-tricks.html?intro=0#trick-100`, { waitUntil: "domcontentloaded" });

  const assertPlayer = async (partText, id) => {
    await expect(page.locator("#sourceLine")).toContainText(partText);
    const iframe = page.locator("#clipPlayer");
    await expect(iframe).toHaveAttribute("src", new RegExp(id));
    const frame = page.frameLocator("#clipPlayer");
    await expect(frame.locator(".html5-video-player")).toHaveCount(1, { timeout: 15000 });
    const text = (await frame.locator("body").innerText()).slice(0,500);
    expect(text).not.toMatch(/video unavailable|an error occurred|playback on other websites has been disabled/i);
    console.log(JSON.stringify({partText,id,text}));
  };

  await assertPlayer("PART I", "8bxg4YCo2RE");
  await page.locator("#nextTrick").click();
  await assertPlayer("PART II", "mN6_vgbRD7Y");
  await page.locator("#prevTrick").click();
  await assertPlayer("PART I", "8bxg4YCo2RE");

  await page.goto(`${BASE_ROOT}/notes/projects/flatground-tricks.html?intro=0#trick-200`, { waitUntil: "domcontentloaded" });
  await assertPlayer("PART II", "mN6_vgbRD7Y");
  await page.locator("#nextTrick").click();
  await assertPlayer("PART III", "N4sgk0PLhQ0");
});


test("live representative YouTube clips actually begin playback", async ({ page, browserName }) => {
  test.skip(BASE_ROOT !== "https://cnkerr.com", "Live YouTube playback diagnostic");
  test.skip(browserName === "firefox", "Live matrix does not run Firefox");
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const num of [1, 101, 201]) {
    await page.goto(`${BASE_ROOT}/notes/projects/flatground-tricks.html?intro=0#trick-${num}`, { waitUntil: "domcontentloaded" });
    const frame = page.frameLocator("#clipPlayer");
    const player = frame.locator(".html5-video-player");
    await expect(player).toHaveCount(1, { timeout: 15000 });

    const play = frame.locator(".ytp-large-play-button");
    if (await play.count()) await play.click({ force:true });
    else await frame.locator("video").click({ force:true });

    await page.waitForTimeout(2500);
    const error = frame.locator(".ytp-error-content-wrap");
    if (await error.count()) await expect(error).not.toBeVisible();

    const media = frame.locator("video");
    await expect(media).toHaveCount(1, { timeout: 15000 });
    const state = await media.evaluate(v => ({ currentTime:v.currentTime, paused:v.paused, readyState:v.readyState, error:v.error && {code:v.error.code,message:v.error.message} }));
    const text = (await frame.locator("body").innerText()).slice(0,500);
    console.log(JSON.stringify({num,browserName,state,text}));
    expect(text).not.toMatch(/video unavailable|an error occurred|playback on other websites has been disabled/i);
    expect(state.error).toBeFalsy();
    expect(state.readyState).toBeGreaterThan(0);
  }
});
