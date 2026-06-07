import { test, expect } from '@playwright/test';
import { dismissAutoTranslate } from './helpers';

test.describe('AI Chat', () => {
  test('opens chat when clicking AI tutor button', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    const chatBtn = page.locator('[aria-label="Open AI Tutor"]');
    await chatBtn.click();
    const dialog = page.locator('[aria-label="AI Tutor Chat"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });
  });

  test('shows welcome message on open', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    await page.locator('[aria-label="Open AI Tutor"]').click();
    const chat = page.locator('[role="log"]');
    await expect(chat).toBeVisible();
    const firstMessage = chat.locator('div').first();
    await expect(firstMessage).toBeVisible();
  });

  test('input field accepts text', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    await page.locator('[aria-label="Open AI Tutor"]').click();
    const input = page.locator('[aria-label="Message input"]');
    await input.fill('What is photosynthesis?');
    await expect(input).toHaveValue('What is photosynthesis?');
  });

  test('closes chat with X button', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    await page.locator('[aria-label="Open AI Tutor"]').click();
    await page.locator('[aria-label="Close chat"]').click();
    const dialog = page.locator('[aria-label="AI Tutor Chat"]');
    await expect(dialog).toBeHidden({ timeout: 2000 });
  });

  test('send button is disabled with empty input', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    await page.locator('[aria-label="Open AI Tutor"]').click();
    const sendBtn = page.locator('[aria-label="Send message"]');
    await expect(sendBtn).toBeDisabled();
  });

  test('send button enables with non-empty input', async ({ page }) => {
    await page.goto('/');
    await dismissAutoTranslate(page);
    await page.locator('[aria-label="Open AI Tutor"]').click();
    await page.locator('[aria-label="Message input"]').fill('Hello');
    const sendBtn = page.locator('[aria-label="Send message"]');
    await expect(sendBtn).not.toBeDisabled();
  });
});
