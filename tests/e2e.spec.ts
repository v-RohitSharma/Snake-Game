import { test, expect } from '@playwright/test';

test('snake game loads and snake moves', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.board')).toBeVisible();

  // initial snake count >= 3
  const count = await page.locator('.segment').count();
  expect(count).toBeGreaterThanOrEqual(3);

  // verify snake head exists
  const head = page.locator('.segment.head');
  await expect(head).toBeVisible();

  // get initial position
  const initial = await head.evaluate((el: HTMLElement) => ({ top: getComputedStyle(el).top, left: getComputedStyle(el).left }));
  expect(initial.top).not.toBeNull();
  expect(initial.left).not.toBeNull();

  // wait 400ms (more than 200ms tick) and check head moved
  await page.waitForTimeout(400);
  const after = await head.evaluate((el: HTMLElement) => ({ top: getComputedStyle(el).top, left: getComputedStyle(el).left }));
  
  // verify position changed (snake moved)
  const positionChanged = initial.top !== after.top || initial.left !== after.left;
  if (!positionChanged) {
    console.log('Position did not change. Initial:', initial, 'After:', after);
    throw new Error('Snake head did not move after 400ms');
  }
  expect(positionChanged).toBe(true);

  // verify controls exist and are interactable
  const pauseButton = page.locator('button', { hasText: /Pause|Resume/ });
  await expect(pauseButton).toBeVisible();
  const speedSelect = page.locator('select[aria-label="Speed"]');
  await expect(speedSelect).toBeVisible();

  // verify HUD shows status
  const hud = page.locator('.hud');
  await expect(hud).toBeVisible();
  const score = page.locator('.score');
  await expect(score).toContainText(/Score:/);
});
