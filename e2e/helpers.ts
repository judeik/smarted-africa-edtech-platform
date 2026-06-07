import { Page } from '@playwright/test';

export const DEMO_STUDENT = {
  name: 'E2E Test Student',
  email: `e2e-${Date.now()}@test.smarted.africa`,
  password: 'Test@E2E2025!',
};

export async function openAuthModal(page: Page, type: 'login' | 'signup') {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const btn = page.locator(`button`, { hasText: type === 'login' ? /log.?in/i : /sign.?up|get started/i }).first();
  await btn.click();
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
}

export async function dismissAutoTranslate(page: Page) {
  const popup = page.locator('[role="dialog"]', { hasText: /language detected/i });
  if (await popup.isVisible().catch(() => false)) {
    await popup.locator('button', { hasText: /keep english/i }).click();
  }
}
