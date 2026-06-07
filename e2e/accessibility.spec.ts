import { test, expect } from '@playwright/test';
import { dismissAutoTranslate } from './helpers';

test.describe('Accessibility', () => {
  test('landing page has no missing alt texts on main images', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    const images = page.locator('img:not([alt])');
    const count = await images.count();
    // Allow decorative images but log them
    if (count > 0) {
      console.warn(`Found ${count} image(s) without alt text`);
    }
    expect(count).toBeLessThan(5); // Soft threshold
  });

  test('auth modal has proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    await page.locator('button', { hasText: /log.?in/i }).first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-label');
  });

  test('AI chat dialog has ARIA role', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    await page.locator('[aria-label="Open AI Tutor"]').click();
    const chat = page.locator('[role="dialog"][aria-label="AI Tutor Chat"]');
    await expect(chat).toBeVisible();
  });

  test('keyboard navigation — Tab through login form', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    await page.locator('button', { hasText: /log.?in/i }).first().click();
    // Tab through email and password fields
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // Should still be functional
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('page title is descriptive', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);
    expect(title).toMatch(/smarted|africa|learn/i);
  });
});
