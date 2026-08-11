import { expect, test } from '@playwright/test';

/**
 * Level 2 — functional. Real browser, demo data, no network.
 *
 * These are the tests that describe what the product actually promises: change
 * a number, watch Safe to Spend respond, and be able to see why.
 */

function parseDollars(text: string): number {
  const negative = text.trim().startsWith('−');
  const n = Number(text.replace(/[^0-9.]/g, ''));
  return negative ? -n : n;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('safe-to-spend-amount')).toBeVisible();
});

test('raising the balance raises Safe to Spend', async ({ page }) => {
  const hero = page.getByTestId('safe-to-spend-amount');
  const before = parseDollars(await hero.innerText());

  await page.getByTestId('balance-strip').click();
  await page.getByLabel('Balance right now').fill('2000');
  await page.getByTestId('edit-save').click();

  await expect
    .poll(async () => parseDollars(await hero.innerText()))
    .toBeGreaterThan(before);
});

test('a balance that cannot cover the bills turns the card red and names the shortfall', async ({
  page,
}) => {
  await page.getByTestId('balance-strip').click();
  await page.getByLabel('Balance right now').fill('40');
  await page.getByTestId('edit-save').click();

  await expect(page.getByTestId('safe-to-spend-status')).toContainText('Short before payday');
  await expect(page.getByTestId('runway-shortfall')).toContainText('You may be short');
});

test('a healthy balance shows the on-track state', async ({ page }) => {
  await page.getByTestId('balance-strip').click();
  await page.getByLabel('Balance right now').fill('4000');
  await page.getByTestId('edit-save').click();

  await expect(page.getByTestId('safe-to-spend-status')).toContainText('On track');
  await expect(page.getByTestId('runway-ok')).toBeVisible();
});

test('reducing a bill raises Safe to Spend by the money it frees up', async ({ page }) => {
  const period = page.getByTestId('safe-to-spend-period');
  const before = parseDollars(await period.innerText());

  // The car payment is $415 and due before the next payday.
  await page.getByTestId('bill-row-car').click();
  await page.getByLabel('Amount').fill('215');
  await page.getByTestId('edit-save').click();

  await expect
    .poll(async () => parseDollars(await period.innerText()))
    .toBeCloseTo(before + 200, 2);
});

test('the breakdown explains the number and its lines add up to the total', async ({ page }) => {
  const periodText = await page.getByTestId('safe-to-spend-period').innerText();

  await page.getByTestId('explain-button').click();

  const dialog = page.getByRole('dialog', { name: 'How is this calculated?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('In checking');
  await expect(dialog).toContainText('Car payment');
  await expect(dialog).toContainText('Groceries');

  const total = await page.getByTestId('breakdown-total').innerText();
  expect(parseDollars(total)).toBeCloseTo(parseDollars(periodText), 2);
});

test('a breakdown line opens the thing it refers to', async ({ page }) => {
  await page.getByTestId('explain-button').click();

  // Scope to the open sheet: the dashboard underneath has its own "Car payment" row.
  const breakdown = page.getByRole('dialog', { name: 'How is this calculated?' });
  await breakdown.getByRole('button', { name: /Car payment/ }).first().click();

  await expect(page.getByRole('dialog', { name: 'Car payment' })).toBeVisible();
});

test('Escape closes a sheet without saving', async ({ page }) => {
  const hero = page.getByTestId('safe-to-spend-amount');
  const before = await hero.innerText();

  await page.getByTestId('balance-strip').click();
  await page.getByLabel('Balance right now').fill('9999');
  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(hero).toHaveText(before);
});

test('the next best action button opens something useful', async ({ page }) => {
  await expect(page.getByTestId('next-best-action')).toBeVisible();
  await page.getByTestId('next-action-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('spending more than an envelope allows shows an over-budget state', async ({ page }) => {
  await page.getByTestId('envelope-row-groceries').click();
  await page.getByLabel('Spent so far this week').fill('300');
  await page.getByTestId('edit-save').click();

  await expect(page.getByTestId('envelope-row-groceries')).toContainText('over');
});

test('every tappable control is at least 44 pixels tall', async ({ page }) => {
  const buttons = page.locator('main button, header button');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox();
    if (!box) continue;
    expect(box.height, `button ${i} is only ${box.height}px tall`).toBeGreaterThanOrEqual(44);
  }
});

test('the whole flow works with a keyboard alone', async ({ page }) => {
  await page.getByTestId('balance-strip').focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
