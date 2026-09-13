import { test, expect } from '@playwright/test';
// Unlike dispatchEvent fixtures, this drives Chromium's editing/IME pipeline.
// It still does not substitute for a physical macOS input-source switch.
test('Chromium IME engine keeps its draft and resumes English exactly once', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Chromium editing protocol');
  await page.addInitScript(() => localStorage.setItem('keybit.locale', '"ko"'));
  await page.goto('/');
  await page.getByRole('button', { name: '연습 시작', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Code input' });
  await expect(input).toBeEnabled();
  await input.focus();
  const cdp = await context.newCDPSession(page);
  const typed = page.locator('.typing-surface [data-actual]');
  for (const text of ['ㄱ', '가', '한']) {
    await cdp.send('Input.imeSetComposition', {
      text,
      selectionStart: text.length,
      selectionEnd: text.length,
    });
    await expect(input).toHaveValue(text);
    await expect(page.getByText('영문 입력으로 전환해 주세요.', { exact: true })).toBeVisible();
    await expect(typed).toHaveCount(0);
  }
  await cdp.send('Input.insertText', { text: '한' });
  await expect(input).toHaveValue('');
  await input.press('f');
  await expect(typed).toHaveCount(1);
  await expect(typed).toHaveAttribute('data-actual', 'f');
  await input.press('Backspace');
  await expect(typed).toHaveCount(0);
  await cdp.detach();
});
