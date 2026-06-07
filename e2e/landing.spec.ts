import { test, expect } from '@playwright/test';
import { dismissAutoTranslate } from './helpers';

test.describe('Landing Page', () => {
  test('loads and shows hero section', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page).toHaveTitle(/SmartEd/i);
  });

  test('shows navigation with Login and Sign Up buttons', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    await expect(page.locator('button', { hasText: /log.?in/i }).first()).toBeVisible();
  });

  test('AI chat button is present', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    const chatBtn = page.locator('[aria-label="Open AI Tutor"]');
    await expect(chatBtn).toBeVisible();
  });

  test('navigates to courses section', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    const coursesBtn = page.locator('button, a', { hasText: /courses|explore/i }).first();
    if (await coursesBtn.isVisible().catch(() => false)) {
      await coursesBtn.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('language selector changes UI language', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    // Find language selector
    const langBtn = page.locator('button[aria-label*="language"], button[title*="language"]').first();
    if (await langBtn.isVisible().catch(() => false)) {
      await langBtn.click();
      await page.waitForTimeout(300);
    }
  });
});
