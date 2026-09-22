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

test('theme selection applies immediately and persists after reload', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('keybit.locale', '"en"');
    localStorage.removeItem('keybit.settings');
  });
  await page.goto('/settings');
  const theme = page.getByLabel('Theme');
  await theme.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.getByLabel('Theme')).toHaveValue('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('light mode uses light surfaces across the app', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('keybit.locale', '"en"');
    localStorage.setItem('keybit.settings', JSON.stringify({ theme: 'light' }));
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f4f7ef');

  const surfaces = await page.evaluate(() => {
    const read = (selector: string) => getComputedStyle(document.querySelector(selector)!).backgroundColor;
    return {
      body: read('body'),
      sidebar: read('.sidebar'),
      editor: read('.editor'),
    };
  });
  expect(surfaces).toEqual({
    body: 'rgb(244, 247, 239)',
    sidebar: 'rgb(255, 255, 255)',
    editor: 'rgb(255, 255, 255)',
  });

  await page.goto('/settings');
  await page.getByLabel('Theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#101310');
});
