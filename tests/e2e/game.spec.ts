import { test, expect, type Page } from '@playwright/test';
async function ko(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('keybit.locale'))
      localStorage.setItem('keybit.locale', JSON.stringify('ko'));
  });
}
test('languages, preferences, real timed practice, record persistence', async ({ page }) => {
  await ko(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '속도 측정', level: 1 })).toBeVisible();
  await page.screenshot({ path: 'output/playwright/home.png', fullPage: true });
  await page.getByRole('button', { name: 'Python', exact: true }).click();
  await expect(page.locator('.editor-toolbar')).toContainText('warmup.py');
  await page.getByRole('button', { name: '30 초', exact: true }).click();
  await page.getByRole('button', { name: '연습 시작', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Code input' });
  await expect(input).toBeEnabled();
  await input.focus();
  const code = await page
    .locator('.typing-surface [data-expected]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-expected')).join(''));
  await input.pressSequentially('!');
  await expect(page.locator('.typed-error').first()).toBeVisible();
  await input.press('Backspace');
  for (const ch of code) {
    await input.press(ch === '\n' ? 'Enter' : ch === ' ' ? 'Space' : ch);
  }
  await expect(page.locator('.stat').filter({ hasText: '완료 블록' })).toContainText('1');
  await expect(page.getByRole('heading', { name: '연습 완료', level: 1 })).toBeVisible({
    timeout: 40000,
  });
  await expect(page.getByText('기록 저장 완료')).toBeVisible();
  await page.getByRole('button', { name: '돌아가기', exact: true }).click();
  await page.getByRole('button', { name: '내 기록', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody tr')).toContainText('Python');
  await page.reload();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('real invite match, same state, reconnect and forfeit', async ({ browser }) => {
  const a = await browser.newContext({ locale: 'ko-KR' }),
    b = await browser.newContext({ locale: 'ko-KR' });
  const pa = await a.newPage(),
    pb = await b.newPage();
  await ko(pa);
  await ko(pb);
  await pa.goto('/battle');
  await pa.getByRole('textbox', { name: '닉네임' }).fill('Ada');
  await pa.getByRole('button', { name: '방 만들기', exact: true }).click();
  const code = await pa.locator('.room-code strong').textContent();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  await pb.goto('/battle?code=' + code);
  await pb.getByRole('textbox', { name: '닉네임' }).fill('Lin');
  await pb.getByRole('button', { name: '참여하기', exact: true }).click();
  await expect(pb.locator('.room-code strong')).toHaveText(code!);
  await pa.getByRole('button', { name: '준비 완료', exact: true }).click();
  await pb.getByRole('button', { name: '준비 완료', exact: true }).click();
  await expect(pa.getByRole('textbox', { name: 'Battle input' })).toBeEnabled();
  await expect(pb.getByRole('textbox', { name: 'Battle input' })).toBeEnabled();
  const text = await pa.locator('.own .drop.target').textContent();
  await expect(pb.locator('.own .drop.target')).toHaveText(text!);
  await pa.getByRole('textbox', { name: 'Battle input' }).pressSequentially(text!, { delay: 80 });
  await expect(pa.locator('.own .board-bottom')).not.toContainText('0 chars');
  await pa.reload();
  await expect(pa.getByRole('textbox', { name: 'Battle input' })).toBeEnabled();
  await pa.getByRole('button', { name: '나가기', exact: true }).click();
  await pa.locator('dialog').getByRole('button', { name: '나가기', exact: true }).click();
  await expect(pb.getByRole('heading', { name: '승리', exact: true })).toBeVisible();
  await a.close();
  await b.close();
});
test('daily calendar, bilingual UI, settings, mobile read-only surface', async ({ page }) => {
  await ko(page);
  await page.goto('/daily');
  await expect(page.locator('.calendar-cell')).toHaveCount(30);
  await expect(page.locator('.reset-clock')).toContainText(/\d\d:\d\d:\d\d/);
  await page.getByRole('button', { name: '설정', exact: true }).click();
  await page.getByRole('switch', { name: '효과음', exact: true }).click();
  await expect(page.getByRole('switch', { name: '효과음', exact: true })).toBeChecked();
  await page.getByLabel('UI language').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Sound effects', exact: true })).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.mobile-notice')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start typing', exact: true })).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
