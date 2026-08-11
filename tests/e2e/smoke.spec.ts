import { expect, test } from '@playwright/test';

/**
 * Level 1 — smoke.
 *
 * Three questions, nothing more: does it load, does it error, is the important
 * thing on the screen? If this fails, nothing else is worth running.
 */
test.describe('smoke', () => {
  test('the dashboard loads with no errors and the hero number visible', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
    });

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    await expect(page.getByTestId('safe-to-spend-amount')).toBeVisible();
    await expect(page.getByTestId('money-runway-card')).toBeVisible();
    await expect(page.getByTestId('next-best-action')).toBeVisible();
    await expect(page.getByTestId('upcoming-money')).toBeVisible();
    await expect(page.getByTestId('envelopes-card')).toBeVisible();

    expect(errors, `JavaScript errors on load:\n${errors.join('\n')}`).toEqual([]);
  });

  test('the hero number is a real dollar amount', async ({ page }) => {
    await page.goto('/');
    const text = await page.getByTestId('safe-to-spend-amount').innerText();
    expect(text).toMatch(/^−?\$[\d,]+$/);
  });

  test('the page never scrolls sideways on a small phone', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/');

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });

  test('the disclaimer is present', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByText('not financial, investment, tax, legal, or credit advice', { exact: false }),
    ).toBeVisible();
  });
});
