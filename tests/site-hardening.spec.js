const { test, expect } = require("@playwright/test");

test("homepage and primary sections retain their navigation", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("#linkHomeTop")).toBeVisible();
  await expect(page.locator("#hero")).toHaveAttribute("src", /\/assets\/slides\//);

  await page.locator("#linkWriting").click();
  await expect(page).toHaveURL(/\/clips$/);
  await expect(page.locator("#items-writing a").first()).toBeVisible();

  await page.locator("#linkResearch").click();
  await expect(page).toHaveURL(/\/bts$/);
  await expect(page.locator("#items-research a").first()).toBeVisible();

  await page.locator("#linkContact").click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.locator("#p-contact")).toBeVisible();
  expect(errors).toEqual([]);
});

test("About dialog retains the ASCII portrait with no raw element injection", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await page.locator("#linkHomeTop").dblclick();
  await expect(page.locator("#aboutDialog")).toBeVisible();
  await page.locator("#aboutNext").click();
  const portrait = page.locator("#aboutText pre.ascii");
  await expect(portrait).toBeVisible();
  expect((await portrait.textContent()).length).toBeGreaterThan(1000);
  await expect(page.locator("#aboutText img, #aboutText script")).toHaveCount(0);
  await page.locator("#aboutClose").click();
  await expect(page.locator("#aboutDialog")).toBeHidden();
});

test("Blog PDFs display in-window with PDF.js or the native fallback", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await page.locator("#linkNotes").click();
  await expect(page).toHaveURL(/\/blog$/);
  await page.locator('a[data-blog-key="tarzan-two-set"]').click();
  await expect(page).toHaveURL(/\/blog\/tarzan-two-set$/);
  await expect(page.locator("#blogTitle")).toContainText("Tarzan");

  const preview = page.locator(".blogMediaFrame.isPdfFrame iframe, .blogMediaFrame.isPdfJsFrame canvas");
  await expect(preview.first()).toBeVisible({ timeout: 20000 });
  const fallback = page.locator(".blogMediaFrame.isPdfFrame iframe");
  if (await fallback.count()) await expect(fallback).toHaveAttribute("src", /tarzan\.pdf/);

  await page.locator("#blogList").click();
  await expect(page).toHaveURL(/\/blog$/);
  await expect(page.locator("#blogListWrap")).toBeVisible();
});

test("Blog HTML preview is sandboxed while its links can still open", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await page.locator("#linkNotes").click();
  await page.locator('a[data-blog-key="flatground-tricks"]').click();
  const frame = page.locator(".blogMediaFrame.isHtmlFrame iframe");
  await expect(frame).toHaveAttribute("sandbox", "allow-scripts allow-popups allow-popups-to-escape-sandbox");
  await expect(frame).toBeVisible();
});

test("About content and article links cannot inject executable markup or URLs", async ({ page }) => {
  await page.route("**/data.js", async route => {
    const response = await route.fetch();
    const source = await response.text();
    const malicious = [
      'window.DATA_REMOTE.aboutSlides[1].html = \'<pre class="ascii ascii-mono">Hello<img src="x" onerror="window.__injected = true"></pre>\';',
      'window.DATA_REMOTE.writing.push({ title: "Unsafe link test", year: 9999, url: "javascript:alert(1)" });'
    ].join("\n");
    await route.fulfill({ response, body: source + "\n" + malicious });
  });
  await page.goto("http://127.0.0.1:4173/");
  await page.locator("#linkHomeTop").dblclick();
  await page.locator("#aboutNext").click();
  await expect(page.locator("#aboutText img")).toHaveCount(0);
  expect(await page.evaluate(() => window.__injected)).toBeUndefined();
  await page.locator("#aboutClose").click();
  await page.locator("#linkWriting").click();
  const row = page.locator("#items-writing .item").filter({ hasText: "Unsafe link test" });
  await expect(row).toBeVisible();
  await expect(row.locator("a")).toHaveCount(0);
});

test("narrow-screen navigation and photo preview remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("#linkNotes")).toBeVisible();
  await page.locator("#linkNotes").click();
  await page.locator('a[data-blog-key="ck-peels"]').click();
  await expect(page.locator(".blogMediaFrame.isImgFrame img")).toBeVisible();
  await expect(page.locator("#blogTitle")).toContainText("Claes");
  await page.locator("#blogList").click();
  await expect(page.locator("#blogListWrap")).toBeVisible();
});
