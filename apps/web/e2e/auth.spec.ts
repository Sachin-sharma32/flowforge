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

  test('login for unverified accounts does not offer resend from the sign-in page', async ({
    page,
  }) => {
    await installApiMocks(page, {
      auth: {
        loginSuccess: false,
        errorMessage: 'Please verify your email before signing in.',
      },
    });

    await page.goto('/login');
    await page.getByTestId('login-email-input').fill('playwright@flowforge.dev');
    await page.getByTestId('login-password-input').fill('Password123');
    await page.getByTestId('login-submit').click();

    await expect(page.getByText('Please verify your email before signing in.')).toBeVisible();
    await expect(page.getByText('Resend verification email')).toHaveCount(0);
  });

  test('register success shows the verification pending state instead of routing to dashboard', async ({
    page,
  }) => {
    await installApiMocks(page);

    await page.goto('/register');
    await page.getByTestId('register-name-input').fill('Playwright User');
    await page.getByTestId('register-email-input').fill('new-user@flowforge.dev');
    await page.getByTestId('register-password-input').fill('Password123');
    await page.getByTestId('register-submit').click();

    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByText('We sent a verification email to new-user@flowforge.dev.'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'I already verified, continue to sign in' }),
    ).toBeVisible();
  });

  test('social auth buttons stay within the form on narrow screens', async ({ page }) => {
    await installApiMocks(page);
    await page.setViewportSize({ width: 320, height: 800 });

    await page.goto('/login');

    const form = page.getByTestId('login-form');
    const googleButton = page.getByRole('button', { name: 'Continue with Google' });
    const githubButton = page.getByRole('button', { name: 'Continue with GitHub' });

    const [formBox, googleBox, githubBox] = await Promise.all([
      form.boundingBox(),
      googleButton.boundingBox(),
      githubButton.boundingBox(),
    ]);

    expect(formBox).not.toBeNull();
    expect(googleBox).not.toBeNull();
    expect(githubBox).not.toBeNull();

    expect(googleBox!.x + googleBox!.width).toBeLessThanOrEqual(formBox!.x + formBox!.width + 1);
    expect(githubBox!.x + githubBox!.width).toBeLessThanOrEqual(formBox!.x + formBox!.width + 1);
  });
});
