import { test, expect } from '@playwright/test';
test('pixel screens remain usable at desktop and mobile widths', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('keybit.locale', '"ko"'));
  for (const width of [1440, 1280, 390]) {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 1000 });
    for (const route of ['/', '/daily', '/battle', '/records', '/settings']) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${width} ${route}`,
      ).toBe(true);
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: `output/playwright/pixel-${route.slice(1) || 'home'}-${width}-${info.project.name}.png`,
          fullPage: true,
        });
    }
  }
});
