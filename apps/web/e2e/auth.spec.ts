import { expect, test } from '@playwright/test';
import { installApiMocks } from './support/mock-api';

test.describe('Auth Flows', () => {
  test('login success routes to dashboard', async ({ page }) => {
    await installApiMocks(page);

    await page.goto('/login');
    await page.getByTestId('login-email-input').fill('playwright@flowforge.dev');
    await page.getByTestId('login-password-input').fill('Password123');
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('login failure stays on login and shows error', async ({ page }) => {
    await installApiMocks(page, {
      auth: {
        loginSuccess: false,
        errorMessage: 'Invalid credentials',
      },
    });

    await page.goto('/login');
    await page.getByTestId('login-email-input').fill('playwright@flowforge.dev');
    await page.getByTestId('login-password-input').fill('wrong-password');
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('register success routes to dashboard', async ({ page }) => {
    await installApiMocks(page);

    await page.goto('/register');
    await page.getByTestId('register-name-input').fill('Playwright User');
    await page.getByTestId('register-email-input').fill('new-user@flowforge.dev');
    await page.getByTestId('register-password-input').fill('Password123');
    await page.getByTestId('register-submit').click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
