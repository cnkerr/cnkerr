const { test, expect } = require("@playwright/test");

const ROOT = "http://127.0.0.1:4173";

// The largest PDF in the repository is a 22 MB zine. This exercises PDF.js
// with a narrow viewport and high device-pixel ratio, where memory use matters.
test("largest zine PDF renders and can be exited on a mobile viewport", async ({ browser }) => {
  test.setTimeout(140000);
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  try {
    await page.goto(ROOT + "/");
    await page.locator("#linkNotes").click();
    await page.locator('a[data-blog-key="suli-skatepark-build-zine"]').click();
    await expect(page).toHaveURL(/\/blog\/suli-skatepark-build-zine$/);
    await expect(page.locator("#blogTitle")).toContainText("Tigers Gotta Eat");

    const canvas = page.locator(".blogMediaFrame.isPdfJsFrame canvas");
    const native = page.locator(".blogMediaFrame.isPdfFrame iframe");

    await expect.poll(async () => (await canvas.count()) + (await native.count()), {
      timeout: 85000,
      intervals: [200, 500, 1000, 2000]
    }).toBeGreaterThan(0);

    if (await canvas.count()) {
      await expect(canvas.first()).toBeVisible();
      const firstPage = await canvas.first().evaluate(node => ({
        width: node.width, height: node.height,
        computedWidth: Math.round(node.getBoundingClientRect().width),
        viewportWidth: window.innerWidth
      }));
      expect(firstPage.width).toBeGreaterThan(100);
      expect(firstPage.height).toBeGreaterThan(100);
      expect(firstPage.computedWidth).toBeLessThanOrEqual(firstPage.viewportWidth + 2);
    } else {
      await expect(native).toBeVisible();
      await expect(native).toHaveAttribute("src", /tigersgottaeat\.pdf/);
    }

    // Navigating away must remain responsive while more pages may be rendering.
    await page.locator("#blogList").click({ timeout: 12000 });
    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.locator("#blogListWrap")).toBeVisible();

    // The prior PDF renderer must never overwrite the next entry.
    await page.locator('a[data-blog-key="ck-peels"]').click({ timeout: 15000 });
    await expect(page.locator(".blogMediaFrame.isImgFrame img")).toBeVisible();
    await page.waitForTimeout(800);
    await expect(page.locator(".blogMediaFrame.isImgFrame img")).toHaveCount(1);
    await expect(page.locator(".blogMediaFrame.isPdfJsFrame canvas")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("sandboxed blog introduction opens the working interactive Compendium", async ({ page }) => {
  test.setTimeout(60000);
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(ROOT + "/");
  await page.locator("#linkNotes").click();
  await page.locator('a[data-blog-key="flatground-tricks"]').click();
  const embed = page.frameLocator(".blogMediaFrame.isHtmlFrame iframe");
  const explore = embed.locator("a.explore");
  await expect(explore).toBeVisible();
  await expect(explore).toHaveAttribute("href", "/notes/projects/flatground-tricks.html?intro=0");

  const popupPromise = page.waitForEvent("popup", { timeout: 15000 });
  await explore.click();
  const popup = await popupPromise;
  try {
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup).toHaveURL(/\/notes\/projects\/flatground-tricks\.html\?intro=0/);
    await expect(popup.locator("#matchCount")).toHaveText("800 / 800");
    await popup.locator("#search").fill("kickflip");
    // Search rerenders in requestAnimationFrame, not synchronously with input.
    await expect(popup.locator("#matchCount")).not.toHaveText("800 / 800");
    await expect(popup.locator("#list .trickrow").first()).toBeVisible();
    const count = await popup.locator("#list .trickrow").count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(800);
    await popup.locator("#search").fill("");
    await expect(popup.locator("#matchCount")).toHaveText("800 / 800");
    await popup.locator("#list .trickrow .trickname").first().click();
    await expect(popup.locator("#dialog")).toBeVisible();
    await popup.locator("#close").click();
    await expect(popup.locator("#dialog")).not.toBeVisible();
  } finally {
    await popup.close();
  }
  expect(pageErrors).toEqual([]);
});

test("mobile embedded introduction remains readable and its link is usable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(ROOT + "/");
  await page.locator("#linkNotes").click();
  await page.locator('a[data-blog-key="flatground-tricks"]').click();
  const frame = page.locator(".blogMediaFrame.isHtmlFrame iframe");
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute("sandbox", "allow-scripts allow-popups allow-popups-to-escape-sandbox");
  const explore = page.frameLocator(".blogMediaFrame.isHtmlFrame iframe").locator("a.explore");
  await expect(explore).toBeVisible();
  const popPromise = page.waitForEvent("popup", { timeout: 15000 });
  await explore.click();
  const pop = await popPromise;
  try {
    await expect(pop).toHaveURL(/flatground-tricks\.html/);
    await expect(pop.locator("#matchCount")).toContainText("800");
  } finally {
    await pop.close();
  }
});
