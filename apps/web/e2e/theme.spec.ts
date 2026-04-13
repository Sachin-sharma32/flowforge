import { expect, test } from '@playwright/test';
import { installApiMocks } from './support/mock-api';

const THEME_STORAGE_KEY = 'flowforge-theme';

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, 'light');
    }, THEME_STORAGE_KEY);
  });

  test('keeps dark theme when toggled on home and navigating to login/dashboard', async ({
    page,
  }) => {
    await installApiMocks(page);

    await page.goto('/');
    await page.getByTestId('theme-toggle').click();

    await expect(page.locator('html')).toHaveClass(/dark/);
    const storedTheme = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      THEME_STORAGE_KEY,
    );
    expect(storedTheme).toBe('dark');

    await page.goto('/login');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.goto('/dashboard');
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('keeps dark theme after dashboard toggle and logout to auth', async ({ page }) => {
    await installApiMocks(page);

    await page.goto('/dashboard');
    await page.getByTestId('theme-toggle').click();

    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('renders keyboard-accessible toggle in home, auth, and dashboard headers', async ({
    page,
  }) => {
    await installApiMocks(page);

    await page.goto('/');
    const homeToggle = page.getByTestId('theme-toggle');
    await expect(homeToggle).toBeVisible();
    await homeToggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.goto('/login');
    const authToggle = page.getByTestId('theme-toggle');
    await expect(authToggle).toBeVisible();

    await page.goto('/dashboard');
    const dashboardToggle = page.getByTestId('theme-toggle');
    await expect(dashboardToggle).toBeVisible();
    await dashboardToggle.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
