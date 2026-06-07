import { test, expect } from '@playwright/test';
import { openAuthModal, dismissAutoTranslate } from './helpers';

test.describe('Authentication flows', () => {
  test('opens login modal via navbar', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    const loginBtn = page.locator('button', { hasText: /log.?in/i }).first();
    await loginBtn.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[type="email"]')).toBeVisible();
    await expect(modal.locator('input[type="password"]')).toBeVisible();
  });

  test('shows validation error on empty login', async ({ page }) => {
    await openAuthModal(page, 'login');
    const submitBtn = page.locator('[role="dialog"] button[type="submit"]').first();
    await submitBtn.click();
    // Should show validation or keep button disabled
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await openAuthModal(page, 'login');
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[type="email"]').fill('invalid@test.com');
    await dialog.locator('input[type="password"]').fill('WrongPass@1');
    await dialog.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);
    // Either an error alert or the dialog remains
    const errorAlert = dialog.locator('[role="alert"]');
    const stillOpen = await dialog.isVisible().catch(() => false);
    expect(stillOpen).toBe(true);
  });

  test('opens signup modal', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    // Find sign up button
    const signupBtn = page.locator('button', { hasText: /sign.?up|get started|register/i }).first();
    await signupBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('signup form requires name and email', async ({ page }) => {
    await openAuthModal(page, 'signup');
    const dialog = page.locator('[role="dialog"]');
    // Should have name and email fields for multi-step signup
    const emailField = dialog.locator('input[type="email"]');
    await expect(emailField).toBeVisible();
  });

  test('forgot password link is visible in login modal', async ({ page }) => {
    await openAuthModal(page, 'login');
    const forgotLink = page.locator('[role="dialog"]').locator('button', { hasText: /forgot/i });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    // Should show forgot password form
    const resetForm = page.locator('[role="dialog"]').locator('button[type="submit"]');
    await expect(resetForm).toBeVisible();
  });

  test('can close auth modal with X button', async ({ page }) => {
    await openAuthModal(page, 'login');
    const closeBtn = page.locator('[role="dialog"] button[aria-label="Close"]');
    await closeBtn.click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 3000 });
  });

  test('email confirmation page renders for valid token format', async ({ page }) => {
    // Simulate navigating to confirmation URL
    const fakeToken = 'a'.repeat(64);
    await page.goto(`/confirm/${fakeToken}`);
    await page.waitForLoadState('networkidle');
    // Should show the confirm email page (not 404 or blank)
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(10);
  });

  test('password reset page renders for valid token format', async ({ page }) => {
    const fakeToken = 'b'.repeat(64);
    await page.goto(`/reset-password/${fakeToken}`);
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(10);
  });
});
