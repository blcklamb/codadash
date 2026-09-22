import { test, expect } from '@playwright/test';

test('brand, initial search HTML, navigation and locale metadata stay in sync', async ({
  page,
  request,
}) => {
  await page.addInitScript(() => localStorage.setItem('keybit.locale', '"ko"'));
  const response = await request.get('/daily');
  const html = await response.text();
  expect(html).toContain('codadash (코다대시) | 일일 타자 연습');
  expect(html).toContain('property="og:site_name" content="codadash"');
  expect(html).toContain('<a href="/battle">');
  expect(html).toContain('class="boot-screen"');
  expect(html).toContain('aria-busy="true"');
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'codadash (코다대시) 홈' })).toBeVisible();
  await expect(page.locator('.boot-screen')).toHaveCount(0);
  await expect(page).toHaveTitle(/codadash.*코드 타자 연습/);
  await page.getByRole('link', { name: '일일 연습', exact: true }).click();
  await expect(page).toHaveTitle(/일일 타자 연습/);
  await page.getByRole('button', { name: 'Change language' }).click();
  await expect(page).toHaveTitle(/Daily typing practice/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');
  await page.goto('/battle?code=ABC123');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://codadash.vercel.app/battle',
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'https://codadash.vercel.app/battle',
  );
  await page.goto('/records');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
});
