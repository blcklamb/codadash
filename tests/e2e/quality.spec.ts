import { test, expect } from '@playwright/test';
test('desktop controls fit, preview lines do not overlap, code input is immediate', async ({
  page,
}, info) => {
  await page.addInitScript(() => localStorage.setItem('keybit.locale', '"ko"'));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const start = page.getByRole('button', { name: '연습 시작', exact: true });
  const rect = await start.boundingBox();
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(720);
  const lines = await page.locator('.code-line').evaluateAll((nodes) =>
    nodes.map((node) => {
      const r = node.getBoundingClientRect();
      return { y: r.y, height: r.height };
    }),
  );
  for (let i = 1; i < lines.length; i++)
    expect(lines[i].y).toBeGreaterThanOrEqual(lines[i - 1].y + lines[i - 1].height - 1);
  await page.screenshot({
    path: `output/playwright/home-1280-${info.project.name}.png`,
    fullPage: true,
  });
  await start.click();
  const input = page.getByRole('textbox', { name: 'Code input' });
  await expect(input).toBeEnabled();
  const char = (await page.locator('.code-line code').first().textContent())![0];
  await input.focus();
  await page.evaluate(() => {
    (window as any).keybitMeasure = [];
    document.addEventListener('keydown', () => {
      const begin = performance.now();
      requestAnimationFrame(() => {
        (window as any).keybitMeasure.push(performance.now() - begin);
      });
    });
  });
  for (let i = 0; i < 10; i++) {
    await input.press(char);
    await input.press('Backspace');
  }
  const values = await page.evaluate(() => (window as any).keybitMeasure as number[]);
  values.sort((a, b) => a - b);
  expect(values[Math.floor(values.length * 0.95)]).toBeLessThan(50);
  await page.getByRole('button', { name: '나가기', exact: true }).click();
  await page.locator('dialog').getByRole('button', { name: '나가기', exact: true }).click();
});
test('device storage failure allows guest play and never reports a saved record', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('keybit.locale', '"ko"');
    Storage.prototype.setItem = function () {
      throw new Error('storage blocked');
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: '30 초', exact: true }).click();
  await page.getByRole('button', { name: '연습 시작', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Code input' })).toBeEnabled();
  await expect(page.getByRole('heading', { name: '연습 완료', level: 1 })).toBeVisible({
    timeout: 40000,
  });
  await expect(page.locator('.save-status')).toContainText(
    '이 브라우저에 기록을 저장하지 못했습니다.',
  );
  await expect(page.locator('.save-status')).not.toContainText('기록 저장 완료');
});
