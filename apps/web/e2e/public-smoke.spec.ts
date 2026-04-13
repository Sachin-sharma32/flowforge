import { expect, test } from '@playwright/test';

test.describe('Public Smoke', () => {
  test('renders the landing page hero and primary CTAs', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(/build reliable workflows with/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Privacy & Cookies' }).first()).toBeVisible();
  });

  test('renders privacy inventory and essential-only messaging', async ({ page }) => {
    await page.goto('/privacy');

    await expect(
      page.getByRole('heading', { name: 'Essential-only cookie baseline' }),
    ).toBeVisible();
    await expect(page.getByRole('cell', { name: 'ff_refresh' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'ff_csrf' })).toBeVisible();
    await expect(page.getByText('No analytics SDK cookies are currently used.')).toBeVisible();
  });

  test('renders login and register forms', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page.getByTestId('login-email-input')).toBeVisible();
    await expect(page.getByTestId('login-password-input')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();

    await page.goto('/register');

    await expect(page.getByTestId('register-form')).toBeVisible();
    await expect(page.getByTestId('register-name-input')).toBeVisible();
    await expect(page.getByTestId('register-email-input')).toBeVisible();
    await expect(page.getByTestId('register-password-input')).toBeVisible();
    await expect(page.getByTestId('register-submit')).toBeVisible();
  });
});
