import { test, expect, type Page, type Locator } from '@playwright/test';
async function start(page: Page, mode = '/') {
  await page.addInitScript(() => localStorage.setItem('keybit.locale', '"ko"'));
  await page.goto(mode);
  if (mode === '/') await page.getByRole('button', { name: '120 초', exact: true }).click();
  await page.getByRole('button', { name: '연습 시작', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Code input' });
  await expect(input).toBeEnabled();
  await input.focus();
  return input;
}
async function compose(input: Locator, end: boolean) {
  await input.evaluate((node, finish) => {
    const el = node as HTMLTextAreaElement;
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    el.value = '한';
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '한',
        isComposing: true,
        inputType: 'insertCompositionText',
      }),
    );
    el.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Enter',
        isComposing: true,
        keyCode: 229,
      }),
    );
    if (finish) {
      el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '한' }));
      el.dispatchEvent(
        new InputEvent('input', { bubbles: true, data: '한', inputType: 'insertText' }),
      );
    }
  }, end);
}
async function verifyRecovery(input: Locator, typed: Locator, page: Page) {
  for (const finish of [true, false, true, false]) {
    await compose(input, finish);
    await expect(typed).toHaveCount(0);
    if (!finish) await expect(input).toHaveValue('한');
    await input.press('x');
    await expect(typed).toHaveCount(1);
    await expect(typed.first()).toHaveAttribute('data-actual', 'x');
    await expect(input).toHaveValue('');
    // A delayed commit cannot submit an extra character.
    await input.dispatchEvent('compositionend', { data: '한' });
    await input.dispatchEvent('input', { data: '한', inputType: 'insertText' });
    await expect(typed).toHaveCount(1);
    await input.press('Backspace');
  }
  await compose(input, false);
  await input.evaluate((el) => (el as HTMLTextAreaElement).blur());
  await input.focus();
  await input.press('z');
  await expect(typed).toHaveCount(1);
  await input.press('Backspace');
  await input.dispatchEvent('keydown', { key: 'Enter', keyCode: 229 });
  await expect(typed).toHaveCount(0);
  await page.waitForTimeout(250); // Cross a server snapshot / pending-action replay.
  await expect(typed).toHaveCount(0);
}
test('IME recovery, actual typo glyphs, newline alignment, overflow and cursor scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => localStorage.setItem('keybit.practiceDifficulty', '"advanced"'));
  const input = await start(page);
  const typed = page.locator('.typing-surface [data-actual]');
  await verifyRecovery(input, typed, page);
  for (const [key, glyph] of [
    ['!', '!'],
    ['Space', '·'],
    ['Enter', '↵'],
  ]) {
    await input.press(key);
    await expect(page.locator('.typed-error').first()).toHaveText(glyph);
    await page.waitForTimeout(250);
    await expect(typed).toHaveCount(1);
    await input.press('Backspace');
    await expect(typed).toHaveCount(0);
  }
  const target = await page
    .locator('.typing-surface [data-expected]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-expected')).join(''));
  const lines = await page.locator('.code-line').count();
  await input.pressSequentially('!'.repeat(target.length + 3), { delay: 10 });
  await expect(page.locator('.overflow-char')).toHaveCount(3);
  await expect(page.locator('.code-line')).toHaveCount(lines);
  expect(await page.locator('.typing-surface').evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await input.press('Backspace');
  await expect(page.locator('.overflow-char')).toHaveCount(2);
  // Reload obtains the authoritative buffer from the server.
  await page.reload();
  await expect(page.locator('.overflow-char')).toHaveCount(2);
});
test('daily uses the same IME recovery path and intermediate content', async ({ page }) => {
  const input = await start(page, '/daily');
  await expect(page.locator('.session-label')).toContainText('중급');
  await verifyRecovery(input, page.locator('.typing-surface [data-actual]'), page);
});
test('battle IME recovery, actual wrong character, clear and target selection', async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const pa = await a.newPage(),
    pb = await b.newPage();
  for (const page of [pa, pb])
    await page.addInitScript(() => localStorage.setItem('keybit.locale', '"ko"'));
  await pa.goto('/battle');
  await pa.getByRole('textbox', { name: '닉네임' }).fill('Ada');
  await pa.getByRole('button', { name: '방 만들기', exact: true }).click();
  const code = await pa.locator('.room-code strong').textContent();
  await pb.goto('/battle?code=' + code);
  await pb.getByRole('textbox', { name: '닉네임' }).fill('Lin');
  await pb.getByRole('button', { name: '참여하기', exact: true }).click();
  await pa.getByRole('button', { name: '준비 완료', exact: true }).click();
  await pb.getByRole('button', { name: '준비 완료', exact: true }).click();
  const input = pa.getByRole('textbox', { name: 'Battle input' });
  await expect(input).toBeEnabled();
  await input.focus();
  await verifyRecovery(input, pa.locator('.battle-input-wrap [data-actual]'), pa);
  await input.press('!');
  await expect(pa.locator('.own .target .typed-error')).toHaveText('!');
  await expect(pa.locator('.battle-input-wrap .typed-error')).toHaveText('!');
  await input.press('Escape');
  await expect(pa.locator('.own .typed-error')).toHaveCount(0);
  await input.press('Enter');
  await expect(pa.locator('.battle-input-wrap [data-actual]')).toHaveCount(0);
  await expect(pa.locator('.own .drop')).toHaveCount(2, { timeout: 6000 });
  const first = await pa.locator('.own .target').textContent();
  await input.press('ArrowDown');
  await expect(pa.locator('.own .target')).not.toHaveText(first!);
  await a.close();
  await b.close();
});
test('legacy settings migrate separately from battle preferences', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('keybit.locale')) {
      localStorage.setItem('keybit.locale', '"ko"');
      localStorage.setItem('keybit.difficulty', '"standard"');
    }
  });
  await page.goto('/');
  await expect(page.getByLabel('난이도')).toHaveValue('advanced');
  await page.getByLabel('난이도').selectOption('intermediate');
  await page.getByRole('link', { name: '1대1 대전', exact: true }).click();
  await expect(page.locator('.form-panel select')).toHaveValue('standard');
  await page.locator('.form-panel select').selectOption('beginner');
  await page.goto('/');
  await expect(page.getByLabel('난이도')).toHaveValue('intermediate');
  await page.goto('/battle');
  await expect(page.locator('.form-panel select')).toHaveValue('beginner');
});
