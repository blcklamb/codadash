import { test, expect, type Page } from '@playwright/test';

async function targetText(page: Page) {
  return page
    .locator('.battle-input-wrap [data-expected]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-expected')).join(''));
}
async function type(page: Page, text: string) {
  const input = page.getByRole('textbox', { name: 'Battle input' });
  for (const ch of text) await input.press(ch === '\n' ? 'Enter' : ch === ' ' ? 'Space' : ch);
}

test('battle Enter auto-indents, dedents, reconnects, and clears the same multiline target', async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  try {
    const pa = await a.newPage(),
      pb = await b.newPage();
    for (const p of [pa, pb])
      await p.addInitScript(() => localStorage.setItem('keybit.locale', '"ko"'));
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
    const target = await targetText(pa),
      lines = target.split('\n');
    expect(lines).toHaveLength(3);
    expect(await targetText(pb)).toBe(target);
    await type(pa, lines[0]);
    await input.press('Enter');
    const editor = pa.locator('.battle-input-wrap');
    const secondLine = editor.locator('.code-line').nth(1);
    await expect(secondLine.locator('.indent')).toHaveCount(4);
    await expect(secondLine.locator('.caret-char')).toHaveAttribute('data-expected', lines[1][0]);
    await expect(editor.locator('[data-actual]')).toHaveCount(lines[0].length + 1);
    await input.press('Backspace');
    await expect(editor.locator('.code-line').first().locator('.caret-char')).toHaveAttribute(
      'data-expected',
      '\n',
    );
    await input.press('Enter');
    await type(pa, lines[1].slice(0, 2));
    await pa.reload();
    await expect(input).toBeEnabled();
    await expect(editor.locator('[data-actual]')).toHaveCount(lines[0].length + 3);
    await expect(editor.locator('.typed-error')).toHaveCount(0);
    await type(pa, lines[1].slice(2));
    await input.press('Enter');
    await expect(editor.locator('.code-line').nth(2).locator('.indent')).toHaveCount(0);
    await expect(editor.locator('.code-line').nth(2).locator('.caret-char')).toHaveAttribute(
      'data-expected',
      lines[2][0],
    );
    await pa.screenshot({ path: 'output/playwright/battle-multiline-desktop.png', fullPage: true });
    await type(pa, lines[2]);
    await expect(pa.locator('.own .board-bottom')).toContainText(`${target.length} chars`);
    await expect(pa.locator('.own .combo-bits .lit')).toHaveCount(1);
    await expect(pa.locator('.battle-input-wrap [data-actual]')).toHaveCount(0);

    // Observe accumulated cards without clearing them, then resize the live match.
    await expect(pb.locator('.own .drop')).toHaveCount(3, { timeout: 16000 });
    for (const width of [1280, 390]) {
      await pb.setViewportSize({ width, height: 844 });
      await expect
        .poll(async () =>
          pb.locator('.own .drop').evaluateAll((nodes) => {
            const cards = nodes.map((n) => n.getBoundingClientRect());
            return cards.every((rect, i) =>
              cards.every(
                (other, j) =>
                  i === j ||
                  rect.right <= other.left ||
                  other.right <= rect.left ||
                  rect.bottom <= other.top ||
                  other.bottom <= rect.top,
              ),
            );
          }),
        )
        .toBe(true);
      expect(
        await pb
          .locator('.own .drop')
          .evaluateAll((nodes) =>
            nodes.every(
              (node) =>
                node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight,
            ),
          ),
      ).toBe(true);
      expect(await pb.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await pb.screenshot({
        path: `output/playwright/battle-multiline-${width}.png`,
        fullPage: true,
      });
    }
  } finally {
    await a.close();
    await b.close();
  }
});
