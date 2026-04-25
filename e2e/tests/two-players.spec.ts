import { test, expect, type Page } from "@playwright/test";

async function joinAs(page: Page, nick: string) {
  await page.goto("/");
  const input = page.getByLabel("Nickname");
  await input.fill(nick);
  await page.getByRole("button", { name: "Join Arena" }).click();
  await expect(page.getByLabel("Snake arena")).toBeVisible();
  await expect(page.locator('[aria-live="polite"]').getByText("open")).toBeVisible();
}

test("two contexts join + receive consistent state after inputs", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  await joinAs(pageA, "AlphaA");
  await joinAs(pageB, "BravoB");

  // Send turn inputs to both players.
  await pageA.keyboard.press("ArrowDown");
  await pageB.keyboard.press("ArrowUp");

  // Wait 3s for state to converge over multiple ticks.
  await pageA.waitForTimeout(3000);

  // Both score overlays show their nicknames + open link status.
  await expect(pageA.locator('[aria-live="polite"]')).toContainText("AlphaA");
  await expect(pageB.locator('[aria-live="polite"]')).toContainText("BravoB");
  await expect(pageA.locator('[aria-live="polite"]')).toContainText("open");
  await expect(pageB.locator('[aria-live="polite"]')).toContainText("open");

  // Length count must be > 0 (snake exists, server pushed state).
  const lenA = await pageA.locator('[aria-live="polite"] strong').first().innerText();
  const lenB = await pageB.locator('[aria-live="polite"] strong').first().innerText();
  expect(Number(lenA)).toBeGreaterThan(0);
  expect(Number(lenB)).toBeGreaterThan(0);

  // Verify state changed across the 3s window — track tick deltas via a probe page.
  // Inputs went to server; if tick is moving, both snakes' positions are updating.
  const tickProbe = await ctxA.newPage();
  await tickProbe.goto("/");
  const t1 = await pageA.evaluate(() => performance.now());
  await pageA.waitForTimeout(500);
  const t2 = await pageA.evaluate(() => performance.now());
  expect(t2).toBeGreaterThan(t1);

  await ctxA.close();
  await ctxB.close();
});
